/**
 * Main application controller
 */

import { apiService } from './api.js';
import { authManager } from './auth.js';
import ElementEditor from './editor.js';
import { ImportExportManager } from './import-export.js';
import { responsesUI } from './llm/responses-ui.js';
import { RouteChangeEvent, router } from './router.js';
import { themeManager } from './theme.js';
import ElementViewer from './viewer.js';
import { modeRouter } from './modes/mode-router.js';
import { ImportDialog } from './ui/import-dialog.js';
import { ExportModal } from './ui/export-modal.js';

class OnlyWorldsApp {
    private elementViewer!: ElementViewer;
    private elementEditor!: ElementEditor;
    private importExportManager: ImportExportManager | null = null;
    private importDialog!: ImportDialog;
    private exportModal!: ExportModal;

    // Core state getters - single source of truth
    private hasWorldData(): boolean {
        return modeRouter.getCurrentWorld() !== null;
    }

    private getCurrentMode(): 'online' | 'local' | null {
        return modeRouter.getCurrentMode();
    }

    private canAuthenticate(): boolean {
        const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
        const apiPinInput = document.getElementById('api-pin') as HTMLInputElement;
        const apiKey = apiKeyInput?.value?.trim() || '';
        const apiPin = apiPinInput?.value?.trim() || '';
        return apiKey.length === 10 && apiPin.length === 4;
    }

    // Single UI update method - handles all state changes
    private updateUI(): void {
        const hasData = this.hasWorldData();
        const mode = this.getCurrentMode();

        // Update body classes for CSS-driven visibility
        const bodyClasses = [
            hasData ? 'has-data' : 'no-data',
            mode ? `mode-${mode}` : 'no-mode'
        ].join(' ');

        document.body.className = bodyClasses;

        // Update controls
        this.updateControls(mode, hasData);

        // Update world info if we have data
        if (hasData) {
            this.updateWorldInfo();
        }
    }

    private updateControls(mode: 'online' | 'local' | null, hasData: boolean): void {
        const validateBtn = document.getElementById('validate-btn') as HTMLButtonElement;
        const modeSwitchBtn = document.getElementById('mode-switch-btn') as HTMLButtonElement;

        if (!validateBtn || !modeSwitchBtn) {
            console.error('❌ validateBtn or modeSwitchBtn not found');
            return;
        }

        // Always check canAuthenticate - needed for all modes now
        const canAuth = this.canAuthenticate();

        if (mode === 'online') {
            // In online mode, enable button if user has complete credentials to allow world switching
            if (canAuth) {
                validateBtn.textContent = 'load world';
                validateBtn.classList.remove('validated');
                validateBtn.disabled = false;
            } else {
                validateBtn.textContent = 'online';
                validateBtn.classList.add('validated');
                validateBtn.disabled = true;
            }
            modeSwitchBtn.textContent = 'switch to local';
            modeSwitchBtn.style.display = '';
        } else if (mode === 'local') {
            // In local mode, if user has complete credentials, allow switching to online
            if (canAuth) {
                validateBtn.textContent = 'load world';
                validateBtn.classList.remove('validated');
                validateBtn.disabled = false;
            } else {
                validateBtn.textContent = 'local';
                validateBtn.classList.add('validated');
                validateBtn.disabled = true;
            }
            modeSwitchBtn.textContent = 'import json';
            modeSwitchBtn.style.display = '';
        } else {
            // No mode selected - user can authenticate if credentials are complete
            validateBtn.textContent = 'load world';
            validateBtn.classList.remove('validated');
            validateBtn.disabled = !canAuth;
            modeSwitchBtn.textContent = 'switch to local';
            modeSwitchBtn.style.display = '';
        }
    }

    private updateWorldInfo(): void {
        const world = modeRouter.getCurrentWorld();
        if (!world) return;

        const worldNameElement = document.getElementById('world-name');
        const worldApiKeyElement = document.getElementById('world-api-key');

        if (worldNameElement) {
            const worldName = world.name || 'Unnamed World';
            worldNameElement.textContent = worldName;
            worldNameElement.classList.remove('hidden');
        }

        if (worldApiKeyElement) {
            // Always show API key, prefer stored credentials for online mode
            let apiKey = world.api_key || '';

            // For online mode, get API key from storage if not in world data
            if (this.getCurrentMode() === 'online' && !apiKey) {
                apiKey = localStorage.getItem('ow_api_key') || '';
            }

            // Fallback to world ID only if no API key available
            if (!apiKey) {
                apiKey = world.id || '';
            }

            worldApiKeyElement.textContent = apiKey;
            worldApiKeyElement.classList.remove('hidden');
        }
    }

    init(): void {
        themeManager.init();
        this.setupErrorHandling();

        // Initialize components
        this.importDialog = new ImportDialog();
        this.elementViewer = new ElementViewer(apiService);
        this.elementEditor = new ElementEditor(apiService);
        responsesUI.init();

        router.init();
        router.onRouteChange(this.handleRouteChange.bind(this));

        // Make globally accessible for debugging
        (window as any).elementViewer = this.elementViewer;
        (window as any).elementEditor = this.elementEditor;
        (window as any).router = router;
        (window as any).modeRouter = modeRouter;
        (window as any).apiService = apiService;

        this.attachEventListeners();

        // Initialize mode system and UI
        this.initializeModeSystem();
    }

    private async initializeModeSystem(): Promise<void> {
        // Try to restore previous mode first
        const restoredMode = await modeRouter.initializeMode();

        if (restoredMode === 'local') {
            // Successfully restored local mode (with or without world data)
            this.showMainApp();
            this.updateUI();

            // Refresh the viewer to show local data if available
            if (this.elementViewer) {
                this.elementViewer.updateCategoryCounts();
            }
        } else {
            // No previous mode or online mode preferred
            // Show welcome screen first, then try auto-authentication
            this.showWelcomeScreen();
            this.updateUI();

            // Try to auto-authenticate online (but don't force it)
            await this.tryAutoAuthenticate();
        }
    }

    private handleLocalWorldImported(): void {
        console.log('Local world imported, refreshing UI');

        // Clear UI and routes before showing new world data
        this.clearMainUI();
        this.clearDetailView();

        // Switch to local mode and show main app
        modeRouter.setMode('local');
        this.showMainApp();
        this.updateUI();

        // Refresh the viewer to show imported local data
        if (this.elementViewer) {
            this.elementViewer.updateCategoryCounts();

            // If there's a current category selected, reload its elements with local data
            const currentCategory = this.elementViewer.getCurrentCategory();
            if (currentCategory) {
                this.elementViewer.loadElements(currentCategory);
            }
        }

        // Clear detail view after data loads
        this.clearDetailView();
    }

    private handleModeChanged(): void {
        const currentMode = modeRouter.getCurrentMode();

        console.log('Mode changed to:', currentMode);

        // Clear UI when switching modes
        this.clearMainUI();
        this.clearDetailView();

        if (currentMode === 'local') {
            this.showMainApp();
            this.updateUI();

            // Refresh the viewer to show local data if available
            if (this.elementViewer) {
                this.elementViewer.updateCategoryCounts();

                // If there's a current category selected, reload its elements with local data
                const currentCategory = this.elementViewer.getCurrentCategory();
                if (currentCategory) {
                    this.elementViewer.loadElements(currentCategory);
                }
            }
        } else if (currentMode === 'online') {
            // Only try auto-auth if we're not already authenticated
            if (!authManager.checkAuth()) {
                this.tryAutoAuthenticate();
            } else {
                // Already authenticated online, just update UI
                this.showMainApp();
                this.updateUI();
            }
        } else {
            // No mode selected
            this.showWelcomeScreen();
            this.updateUI();
        }
    }

    private showWelcomeScreen(): void {
        const welcomeScreen = document.getElementById('welcome-screen');
        const mainContent = document.getElementById('main-content');

        if (welcomeScreen) welcomeScreen.classList.remove('hidden');
        if (mainContent) mainContent.classList.add('hidden');
    }

    private setupErrorHandling(): void {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showError('An unexpected error occurred. Please refresh the page.');
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showError('An error occurred while processing your request.');
        });
    }

    private attachEventListeners(): void {
        document.getElementById('validate-btn')?.addEventListener('click', () => {
            this.validateCredentials();
        });

        document.getElementById('help-btn')?.addEventListener('click', () => {
            this.showHelp();
        });

        // Add keyboard shortcut for logout (Ctrl+L or Cmd+L)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                this.logout();
            }
        });

        // Enter key on auth inputs
        ['api-key', 'api-pin'].forEach(id => {
            document.getElementById(id)?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.validateCredentials();
                }
            });
        });

        // Handle credential input changes
        this.setupCredentialInputs();

        this.attachImportExportListeners();
        this.attachModeListeners();
    }

    private attachModeListeners(): void {
        // Mode switch button
        document.getElementById('mode-switch-btn')?.addEventListener('click', () => {
            this.handleModeSwitchClick();
        });

        // Listen for local world imports
        window.addEventListener('localWorldImported', () => {
            this.handleLocalWorldImported();
        });

        // Listen for mode changes
        window.addEventListener('modeChanged', () => {
            this.handleModeChanged();
        });

        // Listen for world replacement events
        window.addEventListener('worldReplaced', () => {
            this.handleWorldReplaced();
        });
    }

    private handleModeSwitchClick(): void {
        const currentMode = modeRouter.getCurrentMode();
        const modeSwitchBtn = document.getElementById('mode-switch-btn') as HTMLButtonElement;

        if (!currentMode || currentMode === 'online') {
            // Switch to local mode - clear API credentials from UI
            this.clearApiCredentialsFromUI();

            // Always switch to local mode without forcing import dialog
            modeRouter.setMode('local');
        } else if (currentMode === 'local') {
            // In local mode, button says "import json" - show import dialog
            this.importDialog.show();
        }
    }

    private clearApiCredentialsFromUI(): void {
        const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
        const apiPinInput = document.getElementById('api-pin') as HTMLInputElement;

        if (apiKeyInput) {
            apiKeyInput.value = '';
        }
        if (apiPinInput) {
            apiPinInput.value = '';
        }
    }

    private async handleWorldReplaced(): Promise<void> {
        console.log('World replaced, refreshing application state');

        // Update UI for new online mode
        this.updateUI();

        // Refresh main app display
        this.showMainApp();

        // Refresh viewer data
        if (this.elementViewer) {
            this.elementViewer.updateCategoryCounts();
        }
    }

    private async tryAutoAuthenticate(): Promise<void> {
        try {
            const result = await authManager.tryAutoAuthenticate();
            if (result.success && result.credentials) {
                // Populate only the API key field with the loaded credentials
                const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;

                if (apiKeyInput) apiKeyInput.value = result.credentials.apiKey;

                // Set to online mode when auto-authenticating (but don't trigger events during startup)
                modeRouter.setMode('online');

                this.showMainApp();
                this.updateUI();
            } else {
                // No stored credentials or auto-auth failed, show normal login form
                console.log('No stored credentials found, showing login form');
                this.showWelcomeScreen();
                this.updateUI();
            }
        } catch (error) {
            console.log('Auto-authentication error:', error);
            // If auto-auth fails, just continue with normal flow (show login form)
            this.showWelcomeScreen();
            this.updateUI();
        }
    }


    private logout(): void {
        if (this.hasWorldData()) {
            const confirmed = confirm('Are you sure you want to disconnect? You will need to re-enter your API credentials.');
            if (!confirmed) return;

            // Clear authentication and stored credentials
            authManager.clearCredentials();

            // Clear form inputs
            const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
            const apiPinInput = document.getElementById('api-pin') as HTMLInputElement;

            if (apiKeyInput) apiKeyInput.value = '';
            if (apiPinInput) apiPinInput.value = '';

            // Show welcome screen and update UI
            this.showWelcomeScreen();
            this.updateUI();

            this.showAuthStatus('Disconnected successfully', 'info');
            console.log('Logged out successfully');
        }
    }

    private setupCredentialInputs(): void {
        const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
        const apiPinInput = document.getElementById('api-pin') as HTMLInputElement;


        const handleCredentialChange = (input: HTMLInputElement | null, maxLength: number): void => {
            input?.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;

                // Only allow digits and limit length
                target.value = target.value.replace(/\D/g, '').slice(0, maxLength);

                // Update UI immediately for responsive button enabling
                this.updateUI();
            });
        };

        handleCredentialChange(apiKeyInput, 10);
        handleCredentialChange(apiPinInput, 4);
    }

    private attachImportExportListeners(): void {
        // New export button for local mode only
        document.getElementById('export-json-btn')?.addEventListener('click', () => {
            if (modeRouter.getCurrentMode() === 'local') {
                this.showExportModal();
            }
        });
    }

    private showExportModal(): void {
        if (!this.exportModal) {
            this.exportModal = new ExportModal();
        }
        this.exportModal.show();
    }

    private async validateCredentials(): Promise<void> {
        const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
        const apiPinInput = document.getElementById('api-pin') as HTMLInputElement;

        const apiKey = apiKeyInput.value.trim();
        const apiPin = apiPinInput.value.trim();

        if (!apiKey || !apiPin) {
            this.showAuthStatus('Please enter both API Key and PIN', 'error');
            return;
        }

        const validateBtn = document.getElementById('validate-btn') as HTMLButtonElement;
        const originalText = validateBtn.textContent || '';
        validateBtn.disabled = true;
        validateBtn.textContent = 'loading...';

        this.showAuthStatus('');

        // Clear UI before loading new world (in case switching worlds)
        if (this.elementViewer) {
            this.clearMainUI();
        }

        try {
            await authManager.authenticate(apiKey, apiPin);

            // Clear PIN field after successful authentication
            apiPinInput.value = '';

            // Set to online mode
            modeRouter.setMode('online');

            // Show main app and update UI
            this.showMainApp();
            this.updateUI();
            this.showAuthStatus('', 'success');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
            this.showAuthStatus(errorMessage, 'error');
            validateBtn.textContent = originalText;
            validateBtn.disabled = false;
            console.error('Authentication error:', error);
        }
    }


    private showHelp(): void {
        const existingModal = document.getElementById('help-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'help-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>OnlyWorlds Tool Template</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="help-section">
                        <h3>About</h3>
                        <p>This is a template for developers to clone and build their own OnlyWorlds tools on top of.</p>
                        <p>It has basic API validation and element viewing, editing capabilities.</p>
                        <p><a href="https://github.com/OnlyWorlds/tool-template" target="_blank">View on GitHub</a></p>
                    </div>

                    <div class="help-section">
                        <h3>Quick Start</h3>
                        <ol>
                            <li>Get world API credentials from <a href="https://www.onlyworlds.com" target="_blank">onlyworlds.com</a></li>
                            <li>Enter them in the top bar and click "load world"</li>
                            <li>Select a category to view and edit elements</li>
                        </ol>
                    </div>

                    <div class="help-section">
                        <h3>Shortcuts</h3>
                        <ul>
                            <li><strong>Ctrl+L / Cmd+L</strong> - Disconnect and clear stored credentials</li>
                        </ul>
                    </div>

                    <div class="help-section">
                        <p>Learn more at <a href="https://onlyworlds.github.io" target="_blank">onlyworlds.github.io</a></p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('visible');

        const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('visible');
            setTimeout(() => modal.remove(), 300);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('visible');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }

    private showMainApp(): void {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        const isAlreadyShowing = !mainContent.classList.contains('hidden');

        const welcomeScreen = document.getElementById('welcome-screen');
        welcomeScreen?.classList.add('hidden');
        mainContent.classList.remove('hidden');

        // Display world name and API key separately
        const world = modeRouter.getCurrentWorld();
        if (world) {
            const worldNameElement = document.getElementById('world-name');
            const worldApiKeyElement = document.getElementById('world-api-key');

            if (worldNameElement) {
                const worldName = world.name || 'Unnamed World';
                worldNameElement.textContent = worldName;
                worldNameElement.classList.remove('hidden');
            }

            if (worldApiKeyElement) {
                // Always show API key, prefer stored credentials for online mode
                let apiKey = world.api_key || '';

                // For online mode, get API key from storage if not in world data
                if (modeRouter.getCurrentMode() === 'online' && !apiKey) {
                    apiKey = localStorage.getItem('ow_api_key') || '';
                }

                // Fallback to world ID only if no API key available
                if (!apiKey) {
                    apiKey = world.id || '';
                }

                worldApiKeyElement.textContent = apiKey;
                worldApiKeyElement.classList.remove('hidden');
            }
        }

        // If switching worlds, just refresh; otherwise initialize
        if (isAlreadyShowing) {
            this.elementViewer.updateCategoryCounts();
        } else {
            this.elementViewer.init();
            this.elementEditor.init();
        }

        // Initialize import/export manager
        setTimeout(() => {
            this.importExportManager = new ImportExportManager(apiService);

            const controls = document.getElementById('import-export-controls');
            if (controls) {
                controls.classList.remove('hidden');
            }
        }, 100);

        // Process any pending routes after authentication
        this.processPendingRoute();
    }

    private clearMainUI(): void {
        if (this.elementViewer) {
            this.elementViewer.clear();

            const elementLists = document.querySelectorAll('.element-list');
            elementLists.forEach(list => {
                list.innerHTML = '';
            });

            const detailView = document.getElementById('element-detail');
            if (detailView) {
                detailView.innerHTML = '<p class="empty-state">Select an element to view details</p>';
            }

            const activeCategory = document.querySelector('.category-item.active');
            if (activeCategory) {
                activeCategory.classList.remove('active');
            }

            const categoryCounts = document.querySelectorAll('.category-count');
            categoryCounts.forEach(count => {
                count.textContent = '-';
            });

            // Clear middle section state
            const listTitle = document.getElementById('list-title');
            if (listTitle) {
                listTitle.textContent = 'Select a Category';
            }

            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.classList.add('hidden');
                (searchInput as HTMLInputElement).value = '';
            }

            const createBtn = document.getElementById('create-element-btn');
            if (createBtn) {
                createBtn.classList.add('hidden');
            }
        }

        // Clear world name and API key display
        const worldNameElement = document.getElementById('world-name');
        const worldApiKeyElement = document.getElementById('world-api-key');
        if (worldNameElement) {
            worldNameElement.classList.add('hidden');
            worldNameElement.textContent = '';
        }
        if (worldApiKeyElement) {
            worldApiKeyElement.classList.add('hidden');
            worldApiKeyElement.textContent = '';
        }

        // Clear URL hash and internal route state to prevent cross-mode navigation attempts
        router.navigateToRoot();
        router.clearRoute();
    }

    private clearDetailView(): void {
        const detailView = document.getElementById('element-detail');
        if (detailView) {
            detailView.innerHTML = '<p class="empty-state">Select an element to view details</p>';
        }

        // Also clear any selected visual states in the element list
        const selectedItems = document.querySelectorAll('.element-item.selected, .element-card.selected');
        selectedItems.forEach(item => {
            item.classList.remove('selected');
        });
    }

    private showAuthStatus(message: string, type: 'info' | 'success' | 'error' | '' = ''): void {
        const statusElement = document.getElementById('auth-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = 'auth-status';
            if (type) {
                statusElement.classList.add(type);
            }
        }
    }

    private showLoading(show: boolean): void {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            if (show) {
                loadingElement.classList.remove('hidden');
                loadingElement.setAttribute('aria-hidden', 'false');
            } else {
                loadingElement.classList.add('hidden');
                loadingElement.setAttribute('aria-hidden', 'true');
            }
        }
    }

    private showError(message: string): void { 
        const authStatus = document.getElementById('auth-status');
        if (authStatus) {
            authStatus.textContent = message;
            authStatus.className = 'auth-status error';

            // Auto-clear after 5 seconds
            setTimeout(() => {
                authStatus.textContent = '';
                authStatus.className = 'auth-status';
            }, 5000);
        } else {
            // Fallback to alert only if status element not available
            alert(message);
        }
    }

    private async handleRouteChange(event: RouteChangeEvent): Promise<void> {
        // If route is invalid or empty, do nothing
        if (!event.isValid || !event.route) {
            return;
        }

        const { elementType, elementId } = event.route;

        // Can't navigate to elements if no world data
        if (!this.hasWorldData()) {
            console.log(`Deferred route navigation: ${elementType}/${elementId} (no world data yet)`);
            return;
        }

        // Ensure main app is visible
        if (!this.elementViewer) {
            console.warn('Element viewer not initialized, cannot navigate to route');
            return;
        }

        try {  
            // Try to load and select the element
            const success = await this.elementViewer.navigateToElement(elementType, elementId);

            if (!success) { 
                console.warn(`Could not navigate to ${elementType} ${elementId} - element may not exist`);
                this.showRouteError(`Element not found: ${elementType} ${elementId.slice(0, 8)}...`);

                // Clear the invalid route
                router.navigateToRoot();
            }

        } catch (error) {
            console.error('Error navigating to route:', error);
            this.showRouteError(`Error loading element: ${elementType} ${elementId.slice(0, 8)}...`);
 
            router.navigateToRoot();
        }
    }

    private async processPendingRoute(): Promise<void> {
        const currentRoute = router.getCurrentRoute();

        if (currentRoute) {
            await this.handleRouteChange({ route: currentRoute, isValid: true });
        }
    }

    private showRouteError(message: string): void {
        const statusElement = document.getElementById('auth-status');
        if (statusElement) {
            const originalContent = statusElement.textContent;
            const originalClass = statusElement.className;

            statusElement.textContent = message;
            statusElement.className = 'auth-status error';

            // Clear after 3 seconds
            setTimeout(() => {
                statusElement.textContent = originalContent || '';
                statusElement.className = originalClass || 'auth-status';
            }, 3000);
        } else {
            // Fallback to console if status element not available
            console.warn('Route Error:', message);
        }
    }
}

// Initialize the application when DOM is ready
const app = new OnlyWorldsApp();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app.init();
    });
} else {
    app.init();
}

// Make app globally accessible for debugging
(window as any).app = app;

export default OnlyWorldsApp;