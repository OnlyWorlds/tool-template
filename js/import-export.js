/**
 * Export Manager for OnlyWorlds
 * 
 * This module handles JSON export functionality, allowing users to:
 * - Export their entire world to a JSON file (website-compatible format)
 * 
 * Educational notes throughout explain web development patterns like:
 * - Blob API for file downloads
 * - Promise.all() for parallel operations
 * - Retry logic with exponential backoff
 */

import { authManager } from './auth.js';

export class ImportExportManager {
    constructor(apiService) {
        this.api = apiService;
        
        // All 22 OnlyWorlds element types
        // Capital case for website JSON compatibility
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
            // This is much faster than fetching sequentially
            const allData = await this.fetchAllElements();
            
            // Get world metadata
            const world = authManager.getCurrentWorld();
            const worldName = world?.name || 'world';
            
            // Format as website-compatible JSON
            const exportData = this.formatExportData(allData, world);
            
            // Generate filename with date
            const timestamp = new Date().toISOString().split('T')[0];
            const safeName = worldName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `onlyworlds_${safeName}_${timestamp}.json`;
            
            // Trigger download
            this.downloadAsFile(exportData, filename);
            
            // Count total elements
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
        
        // Create array of promises for parallel fetching
        const promises = this.ELEMENT_TYPES.map(type => 
            this.fetchWithRetry(() => 
                this.api.getElements(type.toLowerCase())
            ).then(elements => ({
                type,
                elements: elements || []
            })).catch(error => {
                console.warn(`Failed to fetch ${type}:`, error);
                return { type, elements: [] }; // Graceful failure
            })
        );
        
        // Wait for all fetches to complete
        const results = await Promise.all(promises);
        
        // Filter out empty results
        return results.filter(r => r.elements.length > 0);
    }
    
    /**
     * Format data for export (website-compatible)
     * The format matches OnlyWorlds website export structure
     */
    formatExportData(allData, world) {
        const exportData = {
            // Metadata section
            metadata: {
                version: '1.0',
                exportDate: new Date().toISOString(),
                worldId: world?.id || null,
                worldName: world?.name || 'Unknown World',
                elementCount: allData.reduce((sum, item) => 
                    sum + item.elements.length, 0)
            },
            
            // World settings
            world: {
                id: world?.id || null,
                name: world?.name || '',
                description: world?.description || '',
                created_at: world?.created_at || null,
                updated_at: world?.updated_at || null
            }
        };
        
        // Add each element type's data
        // Using capital case for website compatibility
        for (const { type, elements } of allData) {
            exportData[type] = elements;
        }
        
        return exportData;
    }
    
    /**
     * Download data as a file using Blob API
     * This creates a download link programmatically
     */
    downloadAsFile(data, filename) {
        // Convert data to JSON string with pretty formatting
        const jsonString = JSON.stringify(data, null, 2);
        
        // Create Blob (Binary Large Object) from string
        // Blob is a file-like object of immutable raw data
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create temporary URL for the blob
        const url = URL.createObjectURL(blob);
        
        // Create invisible download link
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Free memory
    }
    
    /**
     * Retry failed requests with exponential backoff
     * Useful for handling temporary network issues
     */
    async fetchWithRetry(fetchFn, maxRetries = 3) {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fetchFn();
            } catch (error) {
                lastError = error;
                
                // Don't retry on 4xx errors (client errors)
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
            
            // Update message if provided
            if (message) {
                const messageEl = loading.querySelector('.loading-message');
                if (messageEl) {
                    messageEl.textContent = message;
                } else if (show) {
                    // Create message element if it doesn't exist
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
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('notification-visible');
        });
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('notification-visible');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}