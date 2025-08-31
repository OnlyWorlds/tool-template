/**
 * Export Manager for OnlyWorlds
 * 
 * Handles JSON export functionality for entire worlds
 * Educational patterns demonstrated: Blob API, Promise.all(), retry logic
 */

import { authManager } from './auth.js';

export class ImportExportManager {
    constructor(apiService) {
        this.api = apiService;
        
        // All 22 OnlyWorlds element types (capital case for website compatibility)
        this.ELEMENT_TYPES = [
            'Ability', 'Character', 'Collective', 'Construct',
            'Creature', 'Event', 'Family', 'Institution',
            'Language', 'Law', 'Location', 'Map', 'Marker',
            'Narrative', 'Object', 'Phenomenon', 'Pin',
            'Relation', 'Species', 'Title', 'Trait', 'Zone'
        ];
    }
    
    /**
     * Export world to JSON file
     * Downloads all elements in website-compatible format
     */
    async exportWorld() {
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
            this.showNotification(`Export failed: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Fetch all elements from API in parallel
     * Uses Promise.all() for concurrent requests
     */
    async fetchAllElements() {
        this.showLoading(true, 'Fetching elements...');
        
        const promises = this.ELEMENT_TYPES.map(type => 
            this.fetchWithRetry(() => 
                this.api.getElements(type.toLowerCase())
            ).then(elements => ({
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
    
    /**
     * Format data for export (website-compatible)
     */
    formatExportData(allData, world) {
        const exportData = {
            metadata: {
                version: '1.0',
                exportDate: new Date().toISOString(),
                worldId: world?.id || null,
                worldName: world?.name || 'Unknown World',
                elementCount: allData.reduce((sum, item) => 
                    sum + item.elements.length, 0)
            },
            
            world: {
                id: world?.id || null,
                name: world?.name || '',
                description: world?.description || '',
                created_at: world?.created_at || null,
                updated_at: world?.updated_at || null
            }
        };
        
        // Add each element type's data
        for (const { type, elements } of allData) {
            exportData[type] = elements;
        }
        
        return exportData;
    }
    
    /**
     * Download data as a file using Blob API
     */
    downloadAsFile(data, filename) {
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
     */
    async fetchWithRetry(fetchFn, maxRetries = 3) {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fetchFn();
            } catch (error) {
                lastError = error;
                
                // Don't retry on 4xx errors
                if (error.message?.includes('4')) {
                    throw error;
                }
                
                // Exponential backoff: 1s, 2s, 4s...
                const delay = Math.pow(2, i) * 1000;
                await this.sleep(delay);
            }
        }
        
        throw lastError;
    }
    
    /**
     * Utility sleep function for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Show loading indicator with message
     */
    showLoading(show, message = '') {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.toggle('hidden', !show);
            
            if (message) {
                const messageEl = loading.querySelector('.loading-message');
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
    
    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
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