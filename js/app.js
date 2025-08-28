/**
 * Main Application Module
 * Coordinates all modules and handles the main application flow
 */

class OnlyWorldsApp {
    constructor() {
        this.isConnected = false;
    }
    
    /**
     * Initialize the application
     */
    init() {
        console.log('OnlyWorlds Tool Template - Initializing...');
        
        // Set up global error handler
        this.setupErrorHandling();
        
        // Initialize viewer and editor with API service
        window.elementViewer = new ElementViewer(window.apiService);
        window.elementEditor = new ElementEditor(window.apiService);
        
        // Attach main event listeners
        this.attachEventListeners();
        
        // Pre-fill development credentials (REMOVE FOR PRODUCTION!)
        document.getElementById('api-key').value = '3550908908';
        document.getElementById('api-pin').value = '1111';
        
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
            this.updateValidateButton();
        });
        
        document.getElementById('api-pin')?.addEventListener('input', (e) => {
            // Only allow digits and limit to 4
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
            this.updateValidateButton();
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
        
        try {
            // Authenticate
            await window.authManager.authenticate(apiKey, apiPin);
            
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
            validateBtn.textContent = 'validated';
            validateBtn.classList.add('validated');
        } else {
            // Enable only when API key is 10 digits and PIN is 4 digits
            validateBtn.disabled = apiKey.length !== 10 || apiPin.length !== 4;
            validateBtn.textContent = 'validate';
            validateBtn.classList.remove('validated');
        }
    }
    
    /**
     * Show help modal
     */
    showHelp() {
        alert(`OnlyWorlds Tool Template - Help\n\n` +
              `1. Get your API Key and PIN from onlyworlds.com\n` +
              `2. Enter them in the top bar\n` +
              `3. Click 'validate' to connect\n` +
              `4. Browse elements using the sidebar\n` +
              `5. Click elements to view details\n` +
              `6. Use 'Create New Element' to add elements\n\n` +
              `For more help, visit https://www.onlyworlds.com/api/docs`);
    }
    
    /**
     * Show the main application interface
     */
    showMainApp() {
        // Hide welcome screen
        document.getElementById('welcome-screen').classList.add('hidden');
        
        // Show main content
        document.getElementById('main-content').classList.remove('hidden');
        
        // Display world name
        const world = window.authManager.getCurrentWorld();
        if (world) {
            const worldNameElement = document.getElementById('world-name');
            worldNameElement.textContent = world.name || 'Unnamed World';
            worldNameElement.classList.remove('hidden');
        }
        
        // Initialize viewer and editor
        window.elementViewer.init();
        window.elementEditor.init();
        
        this.isConnected = true;
        
        console.log('Connected to OnlyWorlds successfully');
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
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new OnlyWorldsApp();
    app.init();
    
    // Make app globally accessible for debugging
    window.app = app;
    
    console.log('OnlyWorlds Tool Template - Ready');
    console.log('Visit https://www.onlyworlds.com to get your API credentials');
});