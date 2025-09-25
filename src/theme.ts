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

    init(): void {
        this.applyInitialTheme();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupToggleButton());
        } else {
            this.setupToggleButton();
        }

        this.watchSystemPreference();
    }

    private applyInitialTheme(): void {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY) as Theme | null;

        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
            this.currentTheme = savedTheme;
        } else {
            this.currentTheme = this.DEFAULT_THEME;
        }

        this.applyTheme(this.currentTheme);
    }

    private applyTheme(theme: Theme): void {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;

        if (this.toggleButton) {
            this.updateButtonIcon();
        }
    }

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

    toggleTheme(): void {
        const newTheme: Theme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);

        localStorage.setItem(this.STORAGE_KEY, newTheme);

        this.updateButtonIcon();
    }

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

    getTheme(): Theme | null {
        return this.currentTheme;
    }

    clearPreference(): void {
        localStorage.removeItem(this.STORAGE_KEY);
        this.applyInitialTheme();
    }
}

const themeManager = new ThemeManager();
export { themeManager, type Theme };