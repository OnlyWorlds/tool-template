/**
 * Theme Manager Module
 * Handles dark mode toggle, persistence, and system preference detection
 */

class ThemeManager {
    constructor() {
        this.STORAGE_KEY = 'ow_theme';
        this.DEFAULT_THEME = 'light';
        this.currentTheme = null;
        this.toggleButton = null;
    }

    /**
     * Initialize the theme system
     */
    init() {
        this.applyInitialTheme();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupToggleButton());
        } else {
            this.setupToggleButton();
        }
        
        this.watchSystemPreference();
    }

    /**
     * Apply the initial theme based on saved preference or default
     */
    applyInitialTheme() {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);
        
        if (savedTheme) {
            this.currentTheme = savedTheme;
        } else {
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
        
        if (this.toggleButton) {
            this.updateButtonIcon();
        }
    }

    /**
     * Set up the theme toggle button
     */
    setupToggleButton() {
        const button = document.createElement('button');
        button.id = 'theme-toggle';
        button.className = 'btn-icon';
        button.title = this.currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        button.innerHTML = `
            <span class="material-icons-outlined">
                ${this.currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
        `;
        
        button.addEventListener('click', () => this.toggleTheme());
        
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
        
        localStorage.setItem(this.STORAGE_KEY, newTheme);
        
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
        
        mediaQuery.addEventListener('change', (e) => {
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

const themeManager = new ThemeManager();
export { themeManager };