/**
 * Theme Manager Module
 * Handles dark mode toggle, persistence, and system preference detection
 */

class ThemeManager {
    constructor() {
        this.STORAGE_KEY = 'ow_theme';
        this.DEFAULT_THEME = 'light'; // Default to light mode
        this.currentTheme = null;
        this.toggleButton = null;
    }

    /**
     * Initialize the theme system
     */
    init() {
        // Apply theme immediately to prevent flash
        this.applyInitialTheme();
        
        // Set up the toggle button when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupToggleButton());
        } else {
            this.setupToggleButton();
        }
        
        // Listen for system theme changes
        this.watchSystemPreference();
    }

    /**
     * Apply the initial theme based on saved preference or default
     */
    applyInitialTheme() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);
        
        if (savedTheme) {
            // Use saved preference
            this.currentTheme = savedTheme;
        } else {
            // No saved preference, use default (light mode)
            this.currentTheme = this.DEFAULT_THEME;
        }
        
        this.applyTheme(this.currentTheme);
    }

    /**
     * Apply the specified theme to the document
     * @param {string} theme - 'light' or 'dark'
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        
        // Update button icon if it exists
        if (this.toggleButton) {
            this.updateButtonIcon();
        }
    }

    /**
     * Set up the theme toggle button
     */
    setupToggleButton() {
        // Create the toggle button
        const button = document.createElement('button');
        button.id = 'theme-toggle';
        button.className = 'btn-icon';
        button.title = this.currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        button.innerHTML = `
            <span class="material-icons-outlined">
                ${this.currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
        `;
        
        // Add click handler
        button.addEventListener('click', () => this.toggleTheme());
        
        // Insert before help button
        const helpBtn = document.getElementById('help-btn');
        if (helpBtn && helpBtn.parentNode) {
            helpBtn.parentNode.insertBefore(button, helpBtn);
            this.toggleButton = button;
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        
        // Save preference
        localStorage.setItem(this.STORAGE_KEY, newTheme);
        
        // Update button
        this.updateButtonIcon();
    }

    /**
     * Update the toggle button icon and tooltip
     */
    updateButtonIcon() {
        if (!this.toggleButton) return;
        
        const icon = this.toggleButton.querySelector('.material-icons-outlined');
        if (icon) {
            icon.textContent = this.currentTheme === 'dark' ? 'light_mode' : 'dark_mode';
        }
        
        this.toggleButton.title = this.currentTheme === 'dark' 
            ? 'Switch to light mode' 
            : 'Switch to dark mode';
    }

    /**
     * Watch for system theme preference changes
     */
    watchSystemPreference() {
        // Only apply system preference if user hasn't set a preference
        if (localStorage.getItem(this.STORAGE_KEY)) {
            return;
        }
        
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Handle changes
        mediaQuery.addEventListener('change', (e) => {
            // Only apply if user hasn't set a manual preference
            if (!localStorage.getItem(this.STORAGE_KEY)) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    /**
     * Get the current theme
     * @returns {string} Current theme ('light' or 'dark')
     */
    getTheme() {
        return this.currentTheme;
    }

    /**
     * Clear saved theme preference (resets to default)
     */
    clearPreference() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.applyInitialTheme();
    }
}

// Create and export singleton instance
const themeManager = new ThemeManager();
export { themeManager };