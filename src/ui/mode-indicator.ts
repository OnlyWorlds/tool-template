/**
 * Mode Indicator
 * Shows current mode (Online/Local) and provides mode switching
 */

import { modeRouter } from '../modes/mode-router.js';
import type { AppMode } from '../modes/mode-router.js';

export class ModeIndicator {
    private container: HTMLElement | null = null;
    private currentMode: AppMode = null;

    init(): void {
        this.createIndicator();
        this.updateDisplay();

        // Listen for mode changes
        window.addEventListener('modeChanged', () => {
            this.updateDisplay();
        });

        // Also update display when mode is set directly
        const originalSetMode = modeRouter.setMode.bind(modeRouter);
        modeRouter.setMode = (mode) => {
            originalSetMode(mode);
            this.updateDisplay();
        };
    }

    private createIndicator(): void {
        // Find or create the mode indicator container
        this.container = document.getElementById('mode-indicator');

        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'mode-indicator';
            this.container.className = 'mode-indicator';

            // Insert after the world name element
            const worldName = document.getElementById('world-name');
            if (worldName && worldName.parentNode) {
                worldName.parentNode.insertBefore(this.container, worldName.nextSibling);
            } else {
                // Fallback: add to top bar
                const topBar = document.querySelector('.top-bar');
                topBar?.appendChild(this.container);
            }
        }

        this.attachEventListeners();
    }

    private attachEventListeners(): void {
        if (!this.container) return;

        // Mode switch button click
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;

            if (target.classList.contains('mode-switch-btn')) {
                this.handleModeSwitchRequest();
            }
        });
    }

    private async handleModeSwitchRequest(): Promise<void> {
        const currentMode = modeRouter.getCurrentMode();

        if (currentMode === 'online') {
            this.showModeSwitchDialog('local');
        } else if (currentMode === 'local') {
            this.showModeSwitchDialog('online');
        }
    }

    private showModeSwitchDialog(targetMode: 'online' | 'local'): void {
        const currentMode = modeRouter.getCurrentMode();
        const fromMode = currentMode === 'online' ? 'ONLINE' : 'LOCAL';
        const toMode = targetMode === 'online' ? 'ONLINE' : 'LOCAL';

        let warningMessage = '';
        let hasLocalChanges = false;

        if (currentMode === 'local' && targetMode === 'online') {
            warningMessage = 'Switching to ONLINE mode will hide your local world data until you switch back.';

            // Check if there's local data
            const localData = localStorage.getItem('ow_local_world_data');
            if (localData) {
                hasLocalChanges = true;
                warningMessage += '\n\nConsider exporting your local world first to keep a backup.';
            }
        } else if (currentMode === 'online' && targetMode === 'local') {
            warningMessage = 'Switching to LOCAL mode will disconnect from OnlyWorlds.com.';
        }

        const modal = document.createElement('div');
        modal.className = 'modal mode-switch-modal';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>⚠️ Switch Mode</h2>
                </div>

                <div class="modal-body">
                    <p><strong>Switching from ${fromMode} to ${toMode} mode</strong></p>
                    <p>${warningMessage}</p>

                    ${hasLocalChanges ? `
                        <div class="local-changes-info">
                            <h4>Local World Information:</h4>
                            <div id="local-world-info">Loading...</div>
                        </div>
                    ` : ''}
                </div>

                <div class="modal-footer">
                    ${hasLocalChanges ? '<button type="button" id="export-first-btn" class="btn btn-secondary">Export First</button>' : ''}
                    <button type="button" id="switch-anyway-btn" class="btn btn-primary">Switch Anyway</button>
                    <button type="button" id="cancel-switch-btn" class="btn btn-secondary">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('visible');

        // Load local world info if needed
        if (hasLocalChanges) {
            this.loadLocalWorldInfo(modal);
        }

        // Event listeners
        const exportBtn = modal.querySelector('#export-first-btn') as HTMLButtonElement;
        const switchBtn = modal.querySelector('#switch-anyway-btn') as HTMLButtonElement;
        const cancelBtn = modal.querySelector('#cancel-switch-btn') as HTMLButtonElement;

        exportBtn?.addEventListener('click', () => {
            this.exportLocalWorld();
            modal.remove();
        });

        switchBtn?.addEventListener('click', async () => {
            await this.switchMode(targetMode);
            modal.remove();
        });

        cancelBtn?.addEventListener('click', () => {
            modal.remove();
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    private loadLocalWorldInfo(modal: HTMLElement): void {
        const infoEl = modal.querySelector('#local-world-info');
        if (!infoEl) return;

        try {
            const localData = localStorage.getItem('ow_local_world_data');
            const localMeta = localStorage.getItem('ow_local_meta');

            if (localData) {
                const data = JSON.parse(localData);
                let meta = null;

                try {
                    meta = localMeta ? JSON.parse(localMeta) : null;
                } catch (e) {
                    // Meta is optional
                }

                const worldName = data.World?.name || 'Unnamed World';
                const elementCount = data.World?.total_elements || 0;
                const lastModified = meta?.lastModified || data.World?.updated_at || 'Unknown';

                infoEl.innerHTML = `
                    <ul>
                        <li><strong>World:</strong> ${worldName}</li>
                        <li><strong>Elements:</strong> ${elementCount}</li>
                        <li><strong>Last modified:</strong> ${new Date(lastModified).toLocaleString()}</li>
                    </ul>
                `;
            } else {
                infoEl.textContent = 'No local world data found.';
            }
        } catch (error) {
            infoEl.textContent = 'Error loading local world information.';
        }
    }

    private exportLocalWorld(): void {
        try {
            const data = modeRouter.exportToJSON();
            const worldName = data.World?.name || 'local_world';
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `onlyworlds_${worldName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}.json`;

            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = filename;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);

            this.showNotification('✅ Local world exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('❌ Failed to export local world', 'error');
        }
    }

    private async switchMode(targetMode: 'online' | 'local'): Promise<void> {
        try {
            if (targetMode === 'online') {
                await modeRouter.switchToOnlineMode();
            } else {
                await modeRouter.switchToLocalMode();
            }

            this.updateDisplay();
            this.showNotification(`✅ Switched to ${targetMode.toUpperCase()} mode`, 'success');

            // Trigger app refresh
            window.dispatchEvent(new CustomEvent('modeChanged'));

        } catch (error) {
            console.error('Mode switch error:', error);
            this.showNotification('❌ Failed to switch mode', 'error');
        }
    }

    private updateDisplay(): void {
        if (!this.container) return;

        this.currentMode = modeRouter.getCurrentMode();
        const world = modeRouter.getCurrentWorld();

        let modeDisplay = '';
        let modeClass = 'mode-none';

        switch (this.currentMode) {
            case 'online':
                modeDisplay = `
                    <div class="mode-badge online">
                        <span class="mode-icon">🌐</span>
                        <span class="mode-text">ONLINE</span>
                    </div>
                    <button type="button" class="mode-switch-btn" title="Switch to local mode">
                        Switch to Local
                    </button>
                `;
                modeClass = 'mode-online';
                break;

            case 'local':
                modeDisplay = `
                    <div class="mode-badge local">
                        <span class="mode-icon">💾</span>
                        <span class="mode-text">LOCAL</span>
                    </div>
                    <button type="button" class="mode-switch-btn" title="Switch to online mode">
                        Switch to Online
                    </button>
                `;
                modeClass = 'mode-local';
                break;

            default:
                modeDisplay = `
                    <div class="mode-badge none">
                        <span class="mode-text">No mode selected</span>
                    </div>
                `;
                modeClass = 'mode-none';
                break;
        }

        this.container.innerHTML = modeDisplay;
        this.container.className = `mode-indicator ${modeClass}`;
    }

    private showNotification(message: string, type: 'info' | 'success' | 'error'): void {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        requestAnimationFrame(() => {
            notification.classList.add('notification-visible');
        });

        setTimeout(() => {
            notification.classList.remove('notification-visible');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    show(): void {
        if (this.container) {
            this.container.classList.remove('hidden');
        }
    }

    hide(): void {
        if (this.container) {
            this.container.classList.add('hidden');
        }
    }
}