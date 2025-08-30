/**
 * Auto-Save Manager Module
 * Handles automatic saving of field changes with debouncing
 * Extracted from inline-editor.js for better modularity
 */

import { isRelationshipField } from './field-types.js';

export class AutoSaveManager {
    constructor(api, updateCallback) {
        this.api = api;
        this.updateCallback = updateCallback;
        this.saveTimeout = null;
        this.dirtyFields = new Set();
        this.isSaving = false;
        this.originalValues = {};
        this.editingElement = null;
        this.editingType = null;
        
        // Import/export support
        this.enabled = localStorage.getItem('ow_auto_save') !== 'false';
        this.paused = false;
    }
    
    /**
     * Set the element being edited
     */
    setEditingContext(element, type) {
        this.editingElement = element;
        this.editingType = type;
        this.originalValues = {};
        this.dirtyFields.clear();
        this.storeOriginalValues(element);
    }
    
    /**
     * Store original values for reverting
     */
    storeOriginalValues(element) {
        this.originalValues = {};
        for (const [key, value] of Object.entries(element)) {
            if (Array.isArray(value)) {
                this.originalValues[key] = [...value];
            } else if (typeof value === 'object' && value !== null) {
                this.originalValues[key] = {...value};
            } else {
                this.originalValues[key] = value;
            }
        }
    }
    
    /**
     * Handle field change - main entry point for auto-save
     */
    onFieldChange(fieldName, input) {
        // Check if auto-save is enabled and not paused
        if (!this.enabled || this.paused) {
            return; // Don't auto-save
        }
        
        // Mark field as dirty
        this.dirtyFields.add(fieldName);
        
        // Update visual state
        const fieldDiv = document.querySelector(`[data-field="${fieldName}"]`);
        if (fieldDiv) {
            fieldDiv.classList.add('dirty');
        }
        
        // Update save status
        this.updateSaveStatus('typing');
        
        // Clear existing timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        // Set auto-save timeout (2 seconds after stop typing)
        this.saveTimeout = setTimeout(() => {
            this.saveChanges();
        }, 2000);
    }
    
    /**
     * Cancel editing for a field
     */
    cancelFieldEdit(fieldName, input) {
        // Restore original value
        const originalValue = this.originalValues[fieldName];
        
        if (input.type === 'checkbox') {
            input.checked = originalValue === true;
        } else {
            input.value = Array.isArray(originalValue) 
                ? originalValue.join(', ')
                : (originalValue || '');
        }
        
        // Remove dirty state
        this.dirtyFields.delete(fieldName);
        const fieldDiv = document.querySelector(`[data-field="${fieldName}"]`);
        if (fieldDiv) {
            fieldDiv.classList.remove('dirty', 'editing');
        }
        
        // Update status
        if (this.dirtyFields.size === 0) {
            this.updateSaveStatus('saved');
        }
    }
    
    /**
     * Save a single field immediately (for relationship editor)
     */
    async saveField(fieldName, value) {
        try {
            const updated = await this.api.updateElement(
                this.editingType,
                this.editingElement.id,
                { [fieldName]: value }
            );
            
            // Update local element
            Object.assign(this.editingElement, updated);
            
            // Notify callback if provided
            if (this.updateCallback) {
                this.updateCallback(this.editingElement);
            }
            
            return true;
        } catch (error) {
            // Enhanced error message for relationship fields
            const isRelField = isRelationshipField && isRelationshipField(fieldName);
            let errorMessage = `Failed to save ${fieldName}: ${error.message}`;
            
            if (isRelField) {
                errorMessage += `\n\nThis is a relationship field. Common causes:`;
                errorMessage += `\n• Linked elements don't exist or belong to different world`;
                errorMessage += `\n• World field is missing or incorrect`;
                errorMessage += `\n• API key/pin permissions issue`;
                errorMessage += `\n\nCheck the browser console for detailed diagnostics.`;
            }
            
            alert(errorMessage);
            return false;
        }
    }
    
    /**
     * Save all changes
     */
    async saveChanges() {
        // Check if auto-save is disabled or paused
        if (!this.enabled || this.paused) return;
        
        if (this.dirtyFields.size === 0 || this.isSaving) return;
        
        this.isSaving = true;
        this.updateSaveStatus('saving');
        
        try {
            // Collect changed values
            const updates = this.collectChangedValues();
            
            // Call API to update
            const updated = await this.api.updateElement(
                this.editingType,
                this.editingElement.id,
                updates
            );
            
            // Update local element
            Object.assign(this.editingElement, updated);
            
            // Update original values with new saved values
            this.storeOriginalValues(this.editingElement);
            
            // Clear dirty fields
            this.dirtyFields.clear();
            document.querySelectorAll('.dirty').forEach(el => {
                el.classList.remove('dirty');
            });
            
            this.updateSaveStatus('saved');
            
            // Notify callback if provided
            if (this.updateCallback) {
                this.updateCallback(this.editingElement);
            }
            
        } catch (error) {
            console.error('Save failed:', error);
            this.updateSaveStatus('error');
            
            // Show error message
            alert(`Failed to save: ${error.message}`);
        } finally {
            this.isSaving = false;
        }
    }
    
    /**
     * Collect values that have changed
     */
    collectChangedValues() {
        const updates = {};
        
        this.dirtyFields.forEach(fieldName => {
            const input = document.querySelector(`[name="${fieldName}"]`);
            if (!input) return;
            
            const fieldType = input.closest('[data-type]')?.dataset.type || 'string';
            let value;
            
            switch (fieldType) {
                case 'boolean':
                    value = input.checked;
                    break;
                    
                case 'number':
                    value = input.value ? parseFloat(input.value) : null;
                    break;
                    
                case 'array<uuid>':
                case 'array<string>':
                    value = input.value
                        .split(',')
                        .map(v => v.trim())
                        .filter(v => v);
                    break;
                    
                case 'object':
                    try {
                        value = input.value ? JSON.parse(input.value) : null;
                    } catch {
                        value = input.value; // Keep as string if invalid JSON
                    }
                    break;
                    
                default:
                    value = input.value.trim() || null;
            }
            
            updates[fieldName] = value;
        });
        
        return updates;
    }
    
    /**
     * Update save status indicator
     * @param {string} status - Status type: typing, saving, saved, error
     */
    updateSaveStatus(status) {
        const statusEl = document.getElementById('save-status');
        if (!statusEl) return;
        
        statusEl.className = 'save-status';
        
        switch (status) {
            case 'typing':
                statusEl.classList.add('typing');
                statusEl.querySelector('.status-text').textContent = 'Editing...';
                break;
                
            case 'saving':
                statusEl.classList.add('saving');
                statusEl.querySelector('.status-text').textContent = 'Saving...';
                break;
                
            case 'saved':
                statusEl.classList.add('saved');
                statusEl.querySelector('.status-text').textContent = 'All changes saved';
                break;
                
            case 'error':
                statusEl.classList.add('error');
                statusEl.querySelector('.status-text').textContent = 'Failed to save';
                break;
        }
    }
    
    /**
     * Clean up when editing is done
     */
    cleanup() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        this.dirtyFields.clear();
        this.originalValues = {};
        this.editingElement = null;
        this.editingType = null;
        this.isSaving = false;
    }
    
    /**
     * Pause auto-save (for imports)
     * Temporarily disables auto-save without losing the enabled preference
     */
    pause() {
        this.paused = true;
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
    }
    
    /**
     * Resume auto-save after pause
     * Saves any pending changes and re-enables auto-save
     */
    resume() {
        this.paused = false;
        // If there are dirty fields, save them now
        if (this.dirtyFields.size > 0 && this.enabled) {
            this.saveChanges();
        }
    }
    
    /**
     * Toggle auto-save on/off
     * Persists preference to localStorage
     */
    toggle(enabled) {
        this.enabled = enabled;
        localStorage.setItem('ow_auto_save', enabled ? 'true' : 'false');
        
        // Update UI checkbox if it exists
        const checkbox = document.getElementById('auto-save-toggle');
        if (checkbox) {
            checkbox.checked = enabled;
        }
        
        // If disabling, clear any pending saves
        if (!enabled && this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
    }
}