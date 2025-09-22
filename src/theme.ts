/**
 * Theme Manager Module
 * Handles dark mode toggle, persistence, and system preference detection
 */

type Theme = 'light' | 'dark';

class ThemeManager {
    private readonly STORAGE_KEY = 'ow_theme';
    private readonly DEFAULT_THEME: Theme = 'light';
    private currentTheme: Theme | null = null;
    private toggleButton: HTMLButtonElement | null = null;

    /**
     * Initialize the theme system
     */
    init(): void {
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
    private applyInitialTheme(): void {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY) as Theme | null;

        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
            this.currentTheme = savedTheme;
        } else {
            this.currentTheme = this.DEFAULT_THEME;
        }

        this.applyTheme(this.currentTheme);
    }

    /**
     * Apply the specified theme to the document
     */
    private applyTheme(theme: Theme): void {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;

        if (this.toggleButton) {
            this.updateButtonIcon();
        }
    }

    /**
     * Set up the theme toggle button
     */
    private setupToggleButton(): void {
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
        if (helpBtn?.parentNode) {
            helpBtn.parentNode.insertBefore(button, helpBtn);
            this.toggleButton = button;
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme(): void {
        const newTheme: Theme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);

        localStorage.setItem(this.STORAGE_KEY, newTheme);

        this.updateButtonIcon();
    }

    /**
     * Update the toggle button icon and tooltip
     */
    private updateButtonIcon(): void {
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
    private watchSystemPreference(): void {
        // Only apply system preference if user hasn't set a preference
        if (localStorage.getItem(this.STORAGE_KEY)) {
            return;
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        mediaQuery.addEventListener('change', (e: MediaQueryListEvent) => {
            if (!localStorage.getItem(this.STORAGE_KEY)) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    /**
     * Get the current theme
     */
    getTheme(): Theme | null {
        return this.currentTheme;
    }

    /**
     * Clear saved theme preference (resets to default)
     */
    clearPreference(): void {
        localStorage.removeItem(this.STORAGE_KEY);
        this.applyInitialTheme();
    }
}

const themeManager = new ThemeManager();
export { themeManager, type Theme };