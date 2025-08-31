/**
 * Main Application Module
 * Coordinates all modules and handles the main application flow
 */

import { apiService } from './api.js';
import { authManager } from './auth.js';
import ElementEditor from './editor.js';
import { ImportExportManager } from './import-export.js';
import { themeManager } from './theme.js';
import ElementViewer from './viewer.js';

class OnlyWorldsApp {
    constructor() {
        this.isConnected = false;
        this.importExportManager = null;
    }
    
    /**
     * Initialize the application
     */
    init() {
        console.log('OnlyWorlds Tool Template - Initializing...');
        
        // Initialize theme manager (light mode by default)
        themeManager.init();
        
        // Set up global error handler
        this.setupErrorHandling();
        
        // Initialize viewer and editor with API service
        this.elementViewer = new ElementViewer(apiService);
        this.elementEditor = new ElementEditor(apiService);
        
        // Make them globally accessible for debugging and cross-module access
        window.elementViewer = this.elementViewer;
        window.elementEditor = this.elementEditor;
        
        // Attach main event listeners
        this.attachEventListeners();
        
        // Development helper - add ?dev=true to URL to enable
        if (window.location.search.includes('dev=true')) {
            // Developers add their own credentials here locally
            // document.getElementById('api-key').value = 'YOUR_KEY';
            // document.getElementById('api-pin').value = 'YOUR_PIN';
            console.log('Dev mode enabled - uncomment lines 29-30 in app.js to add your credentials');
        }
        
        // Check for saved credentials (optional - remove for production)
        this.checkSavedCredentials();
    }
    
    /**
     * Set up global error handling
     */
    setupErrorHandling() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showError('An unexpected error occurred. Please refresh the page.');
        });
        
        // Handle promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showError('An error occurred while processing your request.');
        });
    }
    
    /**
     * Attach main application event listeners
     */
    attachEventListeners() {
        // Validate button
        document.getElementById('validate-btn')?.addEventListener('click', () => {
            this.validateCredentials();
        });
        
        // Help button
        document.getElementById('help-btn')?.addEventListener('click', () => {
            this.showHelp();
        });
        
        // Enter key on auth inputs
        ['api-key', 'api-pin'].forEach(id => {
            document.getElementById(id)?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.validateCredentials();
                }
            });
        });
        
        // Input change handlers for validation button state and formatting
        document.getElementById('api-key')?.addEventListener('input', (e) => {
            // Only allow digits and limit to 10
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
            
            // Reset connection status if credentials change, but don't clear UI yet
            if (this.isConnected) {
                this.isConnected = false;
                this.showAuthStatus('Credentials changed. Please validate again.', 'info');
            }
            
            this.updateValidateButton();
        });
        
        document.getElementById('api-pin')?.addEventListener('input', (e) => {
            // Only allow digits and limit to 4
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
            
            // Reset connection status if credentials change, but don't clear UI yet
            if (this.isConnected) {
                this.isConnected = false;
                this.showAuthStatus('Credentials changed. Please validate again.', 'info');
            }
            
            this.updateValidateButton();
        });
        
        // Import/Export event listeners
        this.attachImportExportListeners();
    }
    
    /**
     * Attach import/export related event listeners
     */
    attachImportExportListeners() {
        // Export button
        document.getElementById('export-btn')?.addEventListener('click', () => {
            if (this.importExportManager) {
                this.importExportManager.exportWorld();
            }
        });
    }
    
    /**
     * Validate credentials with OnlyWorlds API
     */
    async validateCredentials() {
        const apiKey = document.getElementById('api-key').value.trim();
        const apiPin = document.getElementById('api-pin').value.trim();
        
        // Validate inputs
        if (!apiKey || !apiPin) {
            this.showAuthStatus('Please enter both API Key and PIN', 'error');
            return;
        }
        
        // Update button state
        const validateBtn = document.getElementById('validate-btn');
        const originalText = validateBtn.textContent;
        validateBtn.disabled = true;
        validateBtn.textContent = 'loading...';
        
        // Clear previous status
        this.showAuthStatus('');
        
        // Clear the UI before loading new world (in case switching worlds)
        if (this.elementViewer) {
            this.clearMainUI();
        }
        
        try {
            // Authenticate
            await authManager.authenticate(apiKey, apiPin);
            
            // Success! Update UI
            this.showMainApp();
            validateBtn.textContent = 'validated';
            validateBtn.classList.add('validated');
            this.showAuthStatus('', 'success');
            
            // Save credentials for convenience (optional - remove for production)
            this.saveCredentials(apiKey, apiPin);
            
        } catch (error) {
            this.showAuthStatus(error.message, 'error');
            validateBtn.textContent = originalText;
            validateBtn.disabled = false;
            console.error('Authentication error:', error);
        }
    }
    
    /**
     * Update validate button state based on input
     */
    updateValidateButton() {
        const apiKey = document.getElementById('api-key').value.trim();
        const apiPin = document.getElementById('api-pin').value.trim();
        const validateBtn = document.getElementById('validate-btn');
        
        if (this.isConnected) {
            validateBtn.disabled = true;
            validateBtn.textContent = 'Connected ✓';
            validateBtn.classList.add('validated');
        } else {
            // Enable only when API key is 10 digits and PIN is 4 digits
            validateBtn.disabled = apiKey.length !== 10 || apiPin.length !== 4;
            validateBtn.textContent = 'load world';
            validateBtn.classList.remove('validated');
        }
    }
    
    /**
     * Show help modal
     */
    showHelp() {
        // Remove any existing help modal
        const existingModal = document.getElementById('help-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create help modal
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
                        <p>Learn more at <a href="https://onlyworlds.github.io" target="_blank">onlyworlds.github.io</a></p>
                    </div>
                </div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(modal);
        
        // Show modal
        modal.classList.add('visible');
        
        // Close button handler
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.classList.remove('visible');
            setTimeout(() => modal.remove(), 300);
        });
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('visible');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }
    
    /**
     * Show the main application interface
     */
    showMainApp() {
        const isAlreadyShowing = !document.getElementById('main-content').classList.contains('hidden');
        
        // Hide welcome screen
        document.getElementById('welcome-screen').classList.add('hidden');
        
        // Show main content
        document.getElementById('main-content').classList.remove('hidden');
        
        // Display world name
        const world = authManager.getCurrentWorld();
        if (world) {
            const worldNameElement = document.getElementById('world-name');
            worldNameElement.textContent = world.name || 'Unnamed World';
            worldNameElement.classList.remove('hidden');
        }
        
        // If we're switching worlds (already showing), just refresh the data
        // Otherwise, initialize everything
        if (isAlreadyShowing) {
            // Just refresh the category counts for the new world
            this.elementViewer.updateCategoryCounts();
        } else {
            // First time showing - initialize viewer and editor
            this.elementViewer.init();
            this.elementEditor.init();
        }
        
        // Initialize import/export manager
        setTimeout(() => {
            this.importExportManager = new ImportExportManager(apiService);
            
            // Show import/export controls
            const controls = document.getElementById('import-export-controls');
            if (controls) {
                controls.classList.remove('hidden');
            }
        }, 100);
        
        this.isConnected = true;
        
        console.log('Connected to OnlyWorlds successfully');
    }
    
    /**
     * Clear the main UI when loading a new world (but stay logged in)
     */
    clearMainUI() {
        // Clear the element viewer
        if (this.elementViewer) {
            // Clear viewer's internal state
            this.elementViewer.clear();
            
            // Clear all element lists
            const elementLists = document.querySelectorAll('.element-list');
            elementLists.forEach(list => {
                list.innerHTML = '';
            });
            
            // Clear the detail view
            const detailView = document.getElementById('detail-view');
            if (detailView) {
                detailView.innerHTML = '<div class="empty-state">Select an element to view details</div>';
            }
            
            // Deselect any active category
            const activeCategory = document.querySelector('.category-item.active');
            if (activeCategory) {
                activeCategory.classList.remove('active');
            }
            
            // Reset category counts to show loading state
            const categoryCounts = document.querySelectorAll('.category-count');
            categoryCounts.forEach(count => {
                count.textContent = '-';
            });
        }
        
    
    }
    
    /**
     * Show authentication status message
     * @param {string} message - Status message
     * @param {string} type - 'error' or 'success'
     */
    showAuthStatus(message, type = '') {
        const statusElement = document.getElementById('auth-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = 'auth-status';
            if (type) {
                statusElement.classList.add(type);
            }
        }
    }
    
    /**
     * Show loading indicator
     * @param {boolean} show - Whether to show or hide
     */
    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            if (show) {
                loadingElement.classList.remove('hidden');
            } else {
                loadingElement.classList.add('hidden');
            }
        }
    }
    
    /**
     * Show general error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        // For now, use alert. In production, use a better notification system
        alert(message);
    }
    
    /**
     * Save credentials to localStorage (optional convenience feature)
     * WARNING: Only use this for development. In production, use more secure methods
     * @param {string} apiKey - API key to save
     * @param {string} apiPin - PIN to save
     */
    saveCredentials(apiKey, apiPin) {
        // Uncomment to enable credential saving (NOT RECOMMENDED FOR PRODUCTION)
        // localStorage.setItem('ow_api_key', apiKey);
        // localStorage.setItem('ow_api_pin', apiPin);
    }
    
    /**
     * Check for saved credentials and auto-connect
     */
    checkSavedCredentials() {
        // Uncomment to enable auto-connect (NOT RECOMMENDED FOR PRODUCTION)
        /*
        const savedKey = localStorage.getItem('ow_api_key');
        const savedPin = localStorage.getItem('ow_api_pin');
        
        if (savedKey && savedPin) {
            document.getElementById('api-key').value = savedKey;
            document.getElementById('api-pin').value = savedPin;
            
            // Auto-connect after a short delay
            setTimeout(() => {
                this.connect();
            }, 500);
        }
        */
    }
    
    /**
     * Clear saved credentials
     */
    clearSavedCredentials() {
        localStorage.removeItem('ow_api_key');
        localStorage.removeItem('ow_api_pin');
    }
    
    
    /**
     * Show error message to user
     * @param {string} message - Error message to display
     */
    showError(message) {
        // For now use alert, but could be improved later with a better UI
        alert(message);
    }
}

// Initialize the application when DOM is ready
const app = new OnlyWorldsApp();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app.init();
    });
} else {
    // DOM is already loaded
    app.init();
}

// Make app globally accessible for debugging
window.app = app;

console.log('OnlyWorlds Tool Template - Ready');
console.log('Visit https://www.onlyworlds.com to get your API credentials');