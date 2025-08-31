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
    
    init() {
        themeManager.init();
        this.setupErrorHandling();
        
        this.elementViewer = new ElementViewer(apiService);
        this.elementEditor = new ElementEditor(apiService);
        
        // Make globally accessible for debugging
        window.elementViewer = this.elementViewer;
        window.elementEditor = this.elementEditor;
        
        this.attachEventListeners();
    }
    
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showError('An unexpected error occurred. Please refresh the page.');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showError('An error occurred while processing your request.');
        });
    }
    
    attachEventListeners() {
        document.getElementById('validate-btn')?.addEventListener('click', () => {
            this.validateCredentials();
        });
        
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
        
        // Handle credential input changes
        this.setupCredentialInputs();
        
        this.attachImportExportListeners();
    }
    
    setupCredentialInputs() {
        const apiKeyInput = document.getElementById('api-key');
        const apiPinInput = document.getElementById('api-pin');
        
        const handleCredentialChange = (input, maxLength) => {
            input?.addEventListener('input', (e) => {
                // Only allow digits and limit length
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, maxLength);
                
                // Reset connection status if credentials change
                if (this.isConnected) {
                    this.isConnected = false;
                    this.showAuthStatus('Credentials changed. Please validate again.', 'info');
                }
                
                this.updateValidateButton();
            });
        };
        
        handleCredentialChange(apiKeyInput, 10);
        handleCredentialChange(apiPinInput, 4);
    }
    
    attachImportExportListeners() {
        document.getElementById('export-btn')?.addEventListener('click', () => {
            if (this.importExportManager) {
                this.importExportManager.exportWorld();
            }
        });
    }
    
    async validateCredentials() {
        const apiKey = document.getElementById('api-key').value.trim();
        const apiPin = document.getElementById('api-pin').value.trim();
        
        if (!apiKey || !apiPin) {
            this.showAuthStatus('Please enter both API Key and PIN', 'error');
            return;
        }
        
        const validateBtn = document.getElementById('validate-btn');
        const originalText = validateBtn.textContent;
        validateBtn.disabled = true;
        validateBtn.textContent = 'loading...';
        
        this.showAuthStatus('');
        
        // Clear UI before loading new world (in case switching worlds)
        if (this.elementViewer) {
            this.clearMainUI();
        }
        
        try {
            await authManager.authenticate(apiKey, apiPin);
            
            this.showMainApp();
            validateBtn.textContent = 'validated';
            validateBtn.classList.add('validated');
            this.showAuthStatus('', 'success');
            
        } catch (error) {
            this.showAuthStatus(error.message, 'error');
            validateBtn.textContent = originalText;
            validateBtn.disabled = false;
            console.error('Authentication error:', error);
        }
    }
    
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
    
    showHelp() {
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
                        <p>Learn more at <a href="https://onlyworlds.github.io" target="_blank">onlyworlds.github.io</a></p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.classList.add('visible');
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
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
    
    showMainApp() {
        const isAlreadyShowing = !document.getElementById('main-content').classList.contains('hidden');
        
        document.getElementById('welcome-screen').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        
        // Display world name
        const world = authManager.getCurrentWorld();
        if (world) {
            const worldNameElement = document.getElementById('world-name');
            worldNameElement.textContent = world.name || 'Unnamed World';
            worldNameElement.classList.remove('hidden');
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
        
        this.isConnected = true;
    }
    
    clearMainUI() {
        if (this.elementViewer) {
            this.elementViewer.clear();
            
            const elementLists = document.querySelectorAll('.element-list');
            elementLists.forEach(list => {
                list.innerHTML = '';
            });
            
            const detailView = document.getElementById('detail-view');
            if (detailView) {
                detailView.innerHTML = '<div class="empty-state">Select an element to view details</div>';
            }
            
            const activeCategory = document.querySelector('.category-item.active');
            if (activeCategory) {
                activeCategory.classList.remove('active');
            }
            
            const categoryCounts = document.querySelectorAll('.category-count');
            categoryCounts.forEach(count => {
                count.textContent = '-';
            });
        }
    }
    
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
    
    showError(message) {
        // TODO: Replace with better notification system
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
    app.init();
}

// Make app globally accessible for debugging
window.app = app;