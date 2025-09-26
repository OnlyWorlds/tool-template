/**
 * Mode Router - Routes API calls between online and local modes
 * Provides unified interface that the rest of the app can use
 */

import type OnlyWorldsAPI from '../api.js';
import { LocalStorageAPI } from './local-storage.js';
import { LocalAuthManager } from './local-auth.js';
import { authManager } from '../auth.js';
import type { ApiResult } from '../types/api-result.js';
import { ApiSuccess } from '../types/api-result.js';
import { ONLYWORLDS } from '../compatibility.js';

export type AppMode = 'online' | 'local' | null;

interface Element {
    id: string;
    name: string;
    description?: string;
    world: string;
    [key: string]: any;
}

export class ModeRouter {
    private localStorageAPI: LocalStorageAPI;
    private localAuthManager: LocalAuthManager;

    constructor() {
        this.localStorageAPI = new LocalStorageAPI();
        this.localAuthManager = new LocalAuthManager();
    }

    getCurrentMode(): AppMode {
        return this.localAuthManager.getCurrentMode();
    }

    setMode(mode: AppMode): void {
        const previousMode = this.getCurrentMode();
        this.localAuthManager.setMode(mode);

        // Dispatch mode change event if mode actually changed
        if (previousMode !== mode) {
            window.dispatchEvent(new CustomEvent('modeChanged', {
                detail: { previousMode, newMode: mode }
            }));
        }
    }

    isOnlineMode(): boolean {
        return this.getCurrentMode() === 'online';
    }

    isLocalMode(): boolean {
        return this.getCurrentMode() === 'local';
    }

    async getElements(elementType: string, filters?: Record<string, any>): Promise<ApiResult<Element[]>> {
        const mode = this.getCurrentMode();

        switch(mode) {
            case 'online':
                const apiService = (window as any).apiService as OnlyWorldsAPI;
                return await apiService.getElements(elementType, filters);

            case 'local':
                return await this.localStorageAPI.getElements(elementType, filters);

            default:
                // Return empty success result instead of throwing error during initialization
                return ApiSuccess([]);
        }
    }

    async getElement(elementType: string, elementId: string): Promise<Element | null> {
        const mode = this.getCurrentMode();

        switch(mode) {
            case 'online':
                const apiService = (window as any).apiService as OnlyWorldsAPI;
                return await apiService.getElement(elementType, elementId);

            case 'local':
                return await this.localStorageAPI.getElement(elementType, elementId);

            default:
                return null;
        }
    }

    async createElement(elementType: string, elementData: Partial<Element>): Promise<Element> {
        const mode = this.getCurrentMode();

        switch(mode) {
            case 'online':
                const apiService = (window as any).apiService as OnlyWorldsAPI;
                return await apiService.createElement(elementType, elementData);

            case 'local':
                return await this.localStorageAPI.createElement(elementType, elementData);

            default:
                throw new Error('No mode selected. Please connect to OnlyWorlds or load a JSON file.');
        }
    }

    async updateElement(elementType: string, elementId: string, updates: Partial<Element>): Promise<Element> {
        const mode = this.getCurrentMode();

        switch(mode) {
            case 'online':
                const apiService = (window as any).apiService as OnlyWorldsAPI;
                return await apiService.updateElement(elementType, elementId, updates);

            case 'local':
                return await this.localStorageAPI.updateElement(elementType, elementId, updates);

            default:
                throw new Error('No mode selected. Please connect to OnlyWorlds or load a JSON file.');
        }
    }

    async deleteElement(elementType: string, elementId: string): Promise<boolean> {
        const mode = this.getCurrentMode();

        switch(mode) {
            case 'online':
                const apiService = (window as any).apiService as OnlyWorldsAPI;
                return await apiService.deleteElement(elementType, elementId);

            case 'local':
                return await this.localStorageAPI.deleteElement(elementType, elementId);

            default:
                throw new Error('No mode selected. Please connect to OnlyWorlds or load a JSON file.');
        }
    }

    async searchElements(elementType: string, searchTerm: string): Promise<ApiResult<Element[]>> {
        const mode = this.getCurrentMode();

        switch(mode) {
            case 'online':
                const apiService = (window as any).apiService as OnlyWorldsAPI;
                return await apiService.searchElements(elementType, searchTerm);

            case 'local':
                return await this.localStorageAPI.searchElements(elementType, searchTerm);

            default:
                return ApiSuccess([]);
        }
    }

    getElementTypes(): string[] {
        const mode = this.getCurrentMode();

        switch(mode) {
            case 'online':
                const apiService = (window as any).apiService as OnlyWorldsAPI;
                if (apiService && apiService.getElementTypes) {
                    return apiService.getElementTypes();
                } else {
                    // Fallback to compatibility layer if apiService not ready
                    return ONLYWORLDS.ELEMENT_TYPES;
                }

            case 'local':
                return this.localStorageAPI.getElementTypes();

            default:
                // Fallback to compatibility layer when no mode is selected
                return ONLYWORLDS.ELEMENT_TYPES;
        }
    }

    generateId(): string {
        const mode = this.getCurrentMode();

        switch(mode) {
            case 'online':
                const apiService = (window as any).apiService as OnlyWorldsAPI;
                return apiService.generateId();

            case 'local':
                return this.localStorageAPI.generateId();

            default:
                // Generate ID anyway for fallback cases
                return this.localStorageAPI.generateId();
        }
    }

    getCurrentWorld(): any {
        const mode = this.getCurrentMode();

        switch(mode) {
            case 'online':
                return authManager.getCurrentWorld();

            case 'local':
                return this.localAuthManager.getCurrentWorld();

            default:
                return null;
        }
    }

    async switchToLocalMode(): Promise<boolean> {
        // Show warning if currently online with changes
        const currentMode = this.getCurrentMode();
        if (currentMode === 'online') {
            // This will be handled by the UI layer
            console.log('Switching from online to local mode');
        }

        this.setMode('local');
        return true;
    }

    async switchToOnlineMode(): Promise<boolean> {
        // Show warning if currently local with changes
        const currentMode = this.getCurrentMode();
        if (currentMode === 'local') {
            console.log('Switching from local to online mode');
        }

        this.setMode('online');
        return true;
    }

    // Local-specific methods
    async importFromJSON(jsonData: any): Promise<void> {
        if (this.getCurrentMode() !== 'local') {
            throw new Error('Can only import JSON in local mode');
        }

        return await this.localStorageAPI.importFromJSON(jsonData);
    }

    exportToJSON(): any {
        if (this.getCurrentMode() !== 'local') {
            throw new Error('Can only export JSON in local mode');
        }

        return this.localStorageAPI.exportToJSON();
    }

    clearLocalWorld(): void {
        this.localStorageAPI.clearLocalWorld();
    }

    // Initialization method
    async initializeMode(): Promise<AppMode> {
        return await this.localAuthManager.initializeMode();
    }
}

// Export singleton instance
export const modeRouter = new ModeRouter();