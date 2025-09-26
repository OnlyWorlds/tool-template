/**
 * Local Authentication Manager
 * Handles mode switching and local world management
 */

import type { AppMode } from './mode-router.js';

export class LocalAuthManager {
    private readonly MODE_STORAGE_KEY = 'ow_active_mode';
    private readonly MODE_PERSISTENCE_KEY = 'ow_preferred_mode';

    getCurrentMode(): AppMode {
        try {
            const stored = localStorage.getItem(this.MODE_STORAGE_KEY);
            return (stored as AppMode) || null;
        } catch (error) {
            console.warn('Could not read current mode from localStorage:', error);
            return null;
        }
    }

    setMode(mode: AppMode): void {
        try {
            if (mode === null) {
                localStorage.removeItem(this.MODE_STORAGE_KEY);
            } else {
                localStorage.setItem(this.MODE_STORAGE_KEY, mode);

                // Also save as preferred mode for persistence
                localStorage.setItem(this.MODE_PERSISTENCE_KEY, mode);
            }
        } catch (error) {
            console.warn('Could not save mode to localStorage:', error);
        }
    }

    getPreferredMode(): AppMode {
        try {
            const stored = localStorage.getItem(this.MODE_PERSISTENCE_KEY);
            return (stored as AppMode) || 'online'; // Default to online mode
        } catch (error) {
            console.warn('Could not read preferred mode from localStorage:', error);
            return 'online';
        }
    }

    clearMode(): void {
        try {
            localStorage.removeItem(this.MODE_STORAGE_KEY);
        } catch (error) {
            console.warn('Could not clear mode from localStorage:', error);
        }
    }

    getCurrentWorld(): any {
        if (this.getCurrentMode() !== 'local') {
            return null;
        }

        try {
            const stored = localStorage.getItem('ow_local_world_data');
            if (!stored) return null;

            const data = JSON.parse(stored);
            if (!data.World) return null;

            return {
                id: data.World.api_key, // Use API key as world ID in local mode
                name: data.World.name,
                description: data.World.description,
                created_at: data.World.created_at,
                updated_at: data.World.updated_at,
                api_key: data.World.api_key,
                version: data.World.version,
                total_elements: data.World.total_elements
            };
        } catch (error) {
            console.error('Error loading local world info:', error);
            return null;
        }
    }

    /**
     * Check if we can safely switch modes (warns about data loss)
     */
    canSwitchModes(): { canSwitch: boolean; warning?: string; localChanges?: boolean } {
        const currentMode = this.getCurrentMode();

        if (currentMode === 'local') {
            // Check if there are local changes
            const hasLocalWorld = this.hasLocalWorld();

            if (hasLocalWorld) {
                return {
                    canSwitch: true,
                    warning: 'You have a local world loaded. Switching to online mode will hide your local changes until you switch back. Consider exporting your local world first.',
                    localChanges: true
                };
            }
        }

        if (currentMode === 'online') {
            // Always safe to switch from online to local
            return {
                canSwitch: true,
                warning: 'Switching to local mode will disconnect from OnlyWorlds.com. You can switch back anytime.',
                localChanges: false
            };
        }

        return { canSwitch: true };
    }

    hasLocalWorld(): boolean {
        try {
            const stored = localStorage.getItem('ow_local_world_data');
            if (!stored) return false;

            const data = JSON.parse(stored);
            return data && data.World && data.World.name;
        } catch (error) {
            return false;
        }
    }

    getLocalWorldInfo(): { name: string; elementCount: number; lastModified: string } | null {
        if (!this.hasLocalWorld()) return null;

        try {
            const stored = localStorage.getItem('ow_local_world_data');
            const meta = localStorage.getItem('ow_local_meta');

            if (!stored) return null;

            const data = JSON.parse(stored);
            let metaData = null;

            try {
                metaData = meta ? JSON.parse(meta) : null;
            } catch (e) {
                // Meta data is optional
            }

            return {
                name: data.World.name,
                elementCount: data.World.total_elements || 0,
                lastModified: metaData?.lastModified || data.World.updated_at || 'Unknown'
            };
        } catch (error) {
            console.error('Error reading local world info:', error);
            return null;
        }
    }

    /**
     * Initialize mode on app startup
     */
    async initializeMode(): Promise<AppMode> {
        // Check if we have a preferred mode and can restore it
        const preferredMode = this.getPreferredMode();

        if (preferredMode === 'local' && this.hasLocalWorld()) {
            // Restore local mode if we have local data
            this.setMode('local');
            return 'local';
        }

        // Default to no mode selected (user must choose)
        this.setMode(null);
        return null;
    }

    /**
     * Clear all local authentication data
     */
    clearAllLocalData(): void {
        try {
            localStorage.removeItem(this.MODE_STORAGE_KEY);
            localStorage.removeItem(this.MODE_PERSISTENCE_KEY);
            localStorage.removeItem('ow_local_world_data');
            localStorage.removeItem('ow_local_meta');
            console.log('Cleared all local authentication data');
        } catch (error) {
            console.error('Error clearing local data:', error);
        }
    }
}