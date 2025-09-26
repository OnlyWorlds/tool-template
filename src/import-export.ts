/**
 * Import/Export Manager for OnlyWorlds
 *
 * Handles JSON export functionality for entire worlds
 * Educational patterns demonstrated: Blob API, Promise.all(), retry logic
 */

import type OnlyWorldsAPI from './api.js';
import { authManager } from './auth.js';
import { ONLYWORLDS_VERSION } from '@onlyworlds/sdk';

// Element types from OnlyWorlds (capitalized for website compatibility)
// Use dynamic element types from API service
type ElementType = string;

interface ElementData {
    type: ElementType;
    elements: any[];
}

interface OnlyWorldsExportData {
    World: {
        api_key: string;
        name: string;
        description: string;
        version: string;
        image_url?: string;
        total_elements: number;
        created_at: string;
        updated_at: string;
        id?: string; // Optional - may not be available in local mode
    };
    [key: string]: any; // Dynamic element type properties (Character, Location, etc.)
}

type NotificationType = 'info' | 'success' | 'error';

export class ImportExportManager {
    private api: OnlyWorldsAPI;

    constructor(apiService: OnlyWorldsAPI) {
        this.api = apiService;
    }

    async exportWorld(): Promise<void> {
        try {
            this.showLoading(true, 'Preparing export...');

            // Fetch all elements in parallel for efficiency
            const allData = await this.fetchAllElements();

            const world = authManager.getCurrentWorld();
            const worldName = world?.name || 'world';

            const exportData = this.formatExportData(allData, world);

            const timestamp = new Date().toISOString().split('T')[0];
            const safeName = worldName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `onlyworlds_${safeName}_${timestamp}.json`;

            this.downloadAsFile(exportData, filename);

            const elementCount = allData.reduce((sum, item) =>
                sum + (item.elements?.length || 0), 0);

            this.showNotification(`✓ Exported ${elementCount} elements`, 'success');

        } catch (error) {
            console.error('Export failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.showNotification(`Export failed: ${errorMessage}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Fetch all elements from API in parallel
     * Uses Promise.all() for concurrent requests with retry logic
     */
    private async fetchAllElements(): Promise<ElementData[]> {
        this.showLoading(true, 'Fetching elements...');

        // Get dynamic element types and capitalize for export format
        const elementTypes = this.api.getElementTypes().map(type =>
            type.charAt(0).toUpperCase() + type.slice(1)
        );

        const promises = elementTypes.map(type =>
            this.fetchWithRetry(async () => {
                const result = await this.api.getElements(type.toLowerCase());
                return result.success ? result.data : [];
            }).then(elements => ({
                type,
                elements: elements || []
            })).catch(error => {
                console.warn(`Failed to fetch ${type}:`, error);
                return { type, elements: [] };
            })
        );

        const results = await Promise.all(promises);

        return results.filter(r => r.elements.length > 0);
    }

    private formatExportData(allData: ElementData[], world: any): OnlyWorldsExportData {
        const totalElements = allData.reduce((sum, item) => sum + item.elements.length, 0);

        const exportData: OnlyWorldsExportData = {
            World: {
                api_key: world?.api_key || world?.id || '0000000000', // Use world ID as fallback for API key
                name: world?.name || 'Unnamed World',
                description: world?.description || '',
                version: ONLYWORLDS_VERSION,
                image_url: world?.image_url || undefined,
                total_elements: totalElements,
                created_at: world?.created_at || new Date().toISOString(),
                updated_at: world?.updated_at || new Date().toISOString(),
                id: world?.id || undefined
            }
        };

        // Add each element type's data directly to root level
        for (const { type, elements } of allData) {
            exportData[type] = elements;
        }

        return exportData;
    }

    private downloadAsFile(data: OnlyWorldsExportData, filename: string): void {
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
    }

    /**
     * Retry failed requests with exponential backoff
     * Skips retry for 4xx client errors
     */
    private async fetchWithRetry<T>(fetchFn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
        let lastError: Error | unknown;

        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fetchFn();
            } catch (error) {
                lastError = error;

                // Don't retry on 4xx errors
                if (error instanceof Error && error.message?.includes('4')) {
                    throw error;
                }

                // Exponential backoff: 1s, 2s, 4s...
                const delay = Math.pow(2, i) * 1000;
                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private showLoading(show: boolean, message: string = ''): void {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.toggle('hidden', !show);

            if (message) {
                const messageEl = loading.querySelector('.loading-message') as HTMLElement;
                if (messageEl) {
                    messageEl.textContent = message;
                } else if (show) {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = 'loading-message';
                    msgDiv.textContent = message;
                    loading.appendChild(msgDiv);
                }
            }
        }
    }

    private showNotification(message: string, type: NotificationType = 'info'): void {
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
}