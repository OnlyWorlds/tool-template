/**
 * Import/Export Manager for OnlyWorlds
 * 
 * This module handles JSON import/export functionality, allowing users to:
 * - Export their entire world to a JSON file (website-compatible format)
 * - Import worlds with three modes: merge, overwrite, or replace
 * - Batch process large imports to avoid rate limiting
 * 
 * Educational notes throughout explain web development patterns like:
 * - Blob API for file downloads
 * - FileReader API for file uploads
 * - Promise.all() for parallel operations
 * - Retry logic with exponential backoff
 * - Progress tracking for long operations
 */

import { authManager } from './auth.js';

export class ImportExportManager {
    constructor(apiService, autoSaveManager) {
        this.api = apiService;
        this.autoSave = autoSaveManager;
        
        // All 22 OnlyWorlds element types
        // Capital case for website JSON compatibility
        this.ELEMENT_TYPES = [
            'Ability', 'Character', 'Collective', 'Construct',
            'Creature', 'Event', 'Family', 'Institution',
            'Language', 'Law', 'Location', 'Map', 'Marker',
            'Narrative', 'Object', 'Phenomenon', 'Pin',
            'Relation', 'Species', 'Title', 'Trait', 'Zone'
        ];
        
        // Progress tracking
        this.currentProgress = 0;
        this.totalProgress = 0;
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
        return await Promise.all(promises);
    }
    
    /**
     * Format data for website compatibility
     * Matches exact structure used by onlyworlds.com
     */
    formatExportData(allData, world) {
        const exportData = {};
        
        // Add world metadata (without sensitive data)
        if (world) {
            exportData.World = {
                name: world.name || '',
                description: world.description || '',
                version: world.version || '00.30',
                image_url: world.image_url || '',
                // Optional time format fields can be added here
            };
        }
        
        // Add elements (only types with data)
        // Need to flatten relationship fields to just arrays of IDs
        allData.forEach(({ type, elements }) => {
            if (elements && elements.length > 0) {
                // Process each element to flatten relationships
                const processedElements = elements.map(element => 
                    this.flattenRelationships(element)
                );
                exportData[type] = processedElements;
            }
        });
        
        return exportData;
    }
    
    /**
     * Flatten relationship fields to arrays of IDs
     * Converts expanded objects to simple ID arrays for website compatibility
     * Also converts nulls to empty strings and numbers to strings
     */
    flattenRelationships(element) {
        const processed = {};
        
        // Map of element type names to their numeric IDs for Pin element_type field
        const elementTypeIds = {
            'Ability': '1',
            'Character': '2', 
            'Collective': '3',
            'Construct': '4',
            'Creature': '5',
            'Event': '6',
            'Family': '7',
            'Institution': '8',
            'Language': '9',
            'Law': '10',
            'Location': '11',
            'Map': '12',
            'Marker': '13',
            'Narrative': '14',
            'Object': '15',
            'Phenomenon': '16',
            'Pin': '17',
            'Relation': '18',
            'Species': '19',
            'Title': '20',
            'Trait': '21',
            'Zone': '22'
        };
        
        for (const [key, value] of Object.entries(element)) {
            // Convert null/undefined to empty string (website format)
            if (value === null || value === undefined) {
                processed[key] = "";
            } else if (Array.isArray(value)) {
                // Check if array contains objects with IDs (relationship array)
                if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && 'id' in value[0]) {
                    // Extract just the IDs
                    processed[key] = value.map(item => item.id);
                } else if (value.length === 0) {
                    // Empty arrays stay as empty arrays
                    processed[key] = [];
                } else {
                    // Regular array, keep as is but convert numbers to strings
                    processed[key] = value.map(v => typeof v === 'number' ? String(v) : v);
                }
            } else if (typeof value === 'object' && value !== null && 'id' in value) {
                // Single relationship object - extract just the ID
                processed[key] = value.id;
            } else if (typeof value === 'number') {
                // Convert numbers to strings (website format)
                processed[key] = String(value);
            } else if (typeof value === 'boolean') {
                // Convert booleans to strings
                processed[key] = value ? "true" : "false";
            } else {
                // Regular field, keep as is
                processed[key] = value;
            }
        }
        
        // Special handling for Pin element_type field - convert to numeric ID
        if (processed.element_type && elementTypeIds[processed.element_type]) {
            processed.element_type = elementTypeIds[processed.element_type];
        }
        
        return processed;
    }
    
    /**
     * Download JSON data as file
     * Uses Blob API to create downloadable file in browser
     */
    downloadAsFile(data, filename) {
        // Create Blob (Binary Large Object) from JSON string
        // The null, 2 formats JSON with 2-space indentation
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create temporary URL for the blob
        const url = URL.createObjectURL(blob);
        
        // Create invisible link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Free memory
    }
    
    /**
     * Import world from JSON file
     * @param {File} file - The JSON file to import
     * @param {string} mode - Import mode: 'merge', 'overwrite', or 'replace'
     */
    async importWorld(file, mode = 'merge') {
        try {
            // Read and parse file
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Validate structure
            this.validateImportData(data);
            
            // Count elements for confirmation
            const counts = this.countElements(data);
            
            // Show preview and get confirmation
            const message = this.getImportMessage(mode, counts);
            if (!confirm(message)) {
                return;
            }
            
            // Pause auto-save during import
            this.autoSave.pause();
            this.showLoading(true, 'Importing...');
            
            // Execute import based on mode
            let results;
            switch (mode) {
                case 'replace':
                    results = await this.importReplace(data);
                    break;
                case 'overwrite':
                    results = await this.importOverwrite(data);
                    break;
                case 'merge':
                default:
                    results = await this.importMerge(data);
                    break;
            }
            
            // Show results
            this.showImportResults(results);
            
            // Refresh current view
            if (window.elementViewer) {
                // If there's a current element type selected, refresh it
                const currentType = window.elementViewer.currentElementType;
                if (currentType) {
                    window.elementViewer.loadElements(currentType);
                }
            }
            
        } catch (error) {
            console.error('Import failed:', error);
            this.showNotification(`Import failed: ${error.message}`, 'error');
        } finally {
            this.autoSave.resume();
            this.showLoading(false);
        }
    }
    
    /**
     * Validate import data structure
     * Ensures JSON matches expected format
     */
    validateImportData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid JSON: Expected object');
        }
        
        // Must have at least World or some elements
        const hasContent = Object.keys(data).length > 0;
        if (!hasContent) {
            throw new Error('Empty JSON file');
        }
        
        // Validate each element type
        for (const [type, elements] of Object.entries(data)) {
            if (type === 'World') continue; // Skip metadata
            
            if (!Array.isArray(elements)) {
                throw new Error(`Invalid data for ${type}: Expected array`);
            }
            
            // Check required fields
            elements.forEach((el, idx) => {
                if (!el.id) {
                    throw new Error(`${type}[${idx}] missing required field: id`);
                }
                // Name can be empty string but must exist
                if (el.name === undefined) {
                    throw new Error(`${type}[${idx}] missing required field: name`);
                }
            });
        }
        
        return true;
    }
    
    /**
     * MERGE mode: Only add new elements
     * Safest option - skips existing IDs
     */
    async importMerge(data) {
        const results = { created: 0, skipped: 0, failed: 0 };
        this.initProgress(this.countElements(data).total);
        
        for (const [type, elements] of Object.entries(data)) {
            if (type === 'World' || !Array.isArray(elements)) continue;
            
            // Get existing IDs to check for conflicts
            const existing = await this.api.getElements(type.toLowerCase());
            const existingIds = new Set(existing.map(e => e.id));
            
            // Filter to only new elements
            const newElements = elements.filter(el => !existingIds.has(el.id));
            const skippedCount = elements.length - newElements.length;
            
            results.skipped += skippedCount;
            
            // Batch import new elements
            if (newElements.length > 0) {
                const batchResults = await this.importBatch(
                    newElements, 
                    type.toLowerCase()
                );
                results.created += batchResults.created;
                results.failed += batchResults.failed;
            }
            
            this.updateProgress(elements.length);
        }
        
        return results;
    }
    
    /**
     * OVERWRITE mode: Update existing, add new
     * More complex - updates existing elements
     */
    async importOverwrite(data) {
        const results = { created: 0, updated: 0, failed: 0 };
        this.initProgress(this.countElements(data).total);
        
        for (const [type, elements] of Object.entries(data)) {
            if (type === 'World' || !Array.isArray(elements)) continue;
            
            const typeLower = type.toLowerCase();
            
            // Get existing elements
            const existing = await this.api.getElements(typeLower);
            const existingMap = new Map(existing.map(e => [e.id, e]));
            
            // Separate into updates and creates
            const toUpdate = [];
            const toCreate = [];
            
            elements.forEach(el => {
                if (existingMap.has(el.id)) {
                    toUpdate.push(el);
                } else {
                    toCreate.push(el);
                }
            });
            
            // Batch update existing
            for (const element of toUpdate) {
                try {
                    await this.api.updateElement(typeLower, element.id, element);
                    results.updated++;
                } catch (error) {
                    console.error(`Failed to update ${type} ${element.id}:`, error);
                    results.failed++;
                }
                this.updateProgress(1);
            }
            
            // Batch create new
            if (toCreate.length > 0) {
                const batchResults = await this.importBatch(toCreate, typeLower);
                results.created += batchResults.created;
                results.failed += batchResults.failed;
            }
        }
        
        return results;
    }
    
    /**
     * REPLACE mode: Delete all, then import
     * Most destructive - complete replacement
     */
    async importReplace(data) {
        // Extra confirmation for destructive operation
        const doubleCheck = confirm(
            '⚠️ WARNING: This will DELETE ALL existing elements!\n\n' +
            'Are you absolutely sure you want to replace everything?'
        );
        
        if (!doubleCheck) {
            return { cancelled: true };
        }
        
        this.showLoading(true, 'Deleting existing elements...');
        
        // Delete all existing elements
        for (const type of this.ELEMENT_TYPES) {
            const existing = await this.api.getElements(type.toLowerCase());
            for (const element of existing) {
                try {
                    await this.api.deleteElement(type.toLowerCase(), element.id);
                } catch (error) {
                    console.warn(`Failed to delete ${type} ${element.id}:`, error);
                }
            }
        }
        
        // Now import all new elements using merge logic
        return await this.importMerge(data);
    }
    
    /**
     * Batch import elements with rate limiting
     * Processes in chunks to avoid overwhelming the API
     */
    async importBatch(elements, type, batchSize = 10) {
        const results = { created: 0, failed: 0 };
        
        // Process in batches
        for (let i = 0; i < elements.length; i += batchSize) {
            const batch = elements.slice(i, i + batchSize);
            
            // Create promises for parallel processing within batch
            const promises = batch.map(element => 
                this.api.createElement(type, element)
                    .then(() => {
                        results.created++;
                        return true;
                    })
                    .catch(error => {
                        console.error(`Failed to create ${type}:`, error);
                        results.failed++;
                        return false;
                    })
            );
            
            // Wait for batch to complete
            await Promise.all(promises);
            
            // Update progress
            this.updateProgress(batch.length);
            
            // Small delay between batches to avoid rate limiting
            if (i + batchSize < elements.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }
    
    /**
     * Fetch with retry logic
     * Implements exponential backoff for failed requests
     */
    async fetchWithRetry(fetchFn, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await fetchFn();
            } catch (error) {
                if (attempt === maxRetries - 1) {
                    throw error; // Final attempt failed
                }
                
                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    /**
     * Count elements in import data
     */
    countElements(data) {
        let total = 0;
        const breakdown = {};
        
        for (const [type, elements] of Object.entries(data)) {
            if (type === 'World') continue;
            if (Array.isArray(elements)) {
                breakdown[type] = elements.length;
                total += elements.length;
            }
        }
        
        return { total, breakdown };
    }
    
    /**
     * Generate import confirmation message
     */
    getImportMessage(mode, counts) {
        let message = `Import ${counts.total} elements?\n\n`;
        
        // Add breakdown by type (top 5)
        const types = Object.entries(counts.breakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        types.forEach(([type, count]) => {
            message += `• ${type}: ${count}\n`;
        });
        
        if (Object.keys(counts.breakdown).length > 5) {
            message += `• ... and more\n`;
        }
        
        message += `\nImport mode: ${mode.toUpperCase()}\n`;
        
        switch (mode) {
            case 'merge':
                message += '(Will skip existing elements)';
                break;
            case 'overwrite':
                message += '(Will update existing elements)';
                break;
            case 'replace':
                message += '⚠️ WARNING: Will DELETE all existing elements!';
                break;
        }
        
        return message;
    }
    
    /**
     * Show import results summary
     */
    showImportResults(results) {
        if (results.cancelled) {
            this.showNotification('Import cancelled', 'info');
            return;
        }
        
        let message = 'Import complete!\n\n';
        
        if (results.created > 0) {
            message += `✓ Created: ${results.created}\n`;
        }
        if (results.updated > 0) {
            message += `✓ Updated: ${results.updated}\n`;
        }
        if (results.skipped > 0) {
            message += `⊘ Skipped: ${results.skipped}\n`;
        }
        if (results.failed > 0) {
            message += `✗ Failed: ${results.failed}\n`;
        }
        
        this.showNotification(message, results.failed > 0 ? 'warning' : 'success');
    }
    
    /**
     * Progress tracking helpers
     */
    initProgress(total) {
        this.currentProgress = 0;
        this.totalProgress = total;
        this.updateProgressBar(0);
    }
    
    updateProgress(increment) {
        this.currentProgress += increment;
        const percent = Math.min(100, Math.round(
            (this.currentProgress / this.totalProgress) * 100
        ));
        this.updateProgressBar(percent);
    }
    
    updateProgressBar(percent) {
        const progressBar = document.querySelector('#import-progress .progress-fill');
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
            progressBar.textContent = `${percent}%`;
        }
    }
    
    /**
     * UI Helper methods
     */
    showLoading(show, message = 'Loading...') {
        const loading = document.getElementById('loading');
        if (loading) {
            if (show) {
                loading.classList.remove('hidden');
                const spinner = loading.querySelector('.spinner');
                if (spinner && message) {
                    spinner.setAttribute('data-message', message);
                }
            } else {
                loading.classList.add('hidden');
            }
        }
    }
    
    showNotification(message, type = 'info') {
        // Simple alert for now, can be replaced with better UI
        alert(message);
    }
}