/**
 * Auto-Save Manager Module (TypeScript)
 * Handles automatic saving of field changes with debouncing
 * Extracted from inline-editor.js for better modularity
 */

import { isRelationshipField } from './compatibility.js';
import type OnlyWorldsAPI from './api.js';

type SaveStatus = 'typing' | 'saving' | 'saved' | 'error';

type FieldType = 'string' | 'number' | 'boolean' | 'array<uuid>' | 'array<string>' | 'object';

interface Element {
    id: string;
    [key: string]: any;
}

type UpdateCallback = (element: Element) => void;

export class AutoSaveManager {
    private api: OnlyWorldsAPI;
    private updateCallback: UpdateCallback | null;
    private saveTimeout: number | null = null;
    private dirtyFields = new Set<string>();
    private isSaving = false;
    private originalValues: Record<string, any> = {};
    private editingElement: Element | null = null;
    private editingType: string | null = null;
    private enabled = true;
    private paused = false;

    constructor(api: OnlyWorldsAPI, updateCallback?: UpdateCallback) {
        this.api = api;
        this.updateCallback = updateCallback || null;
    }

    /**
     * Set the element being edited
     */
    setEditingContext(element: Element, type: string): void {
        this.editingElement = element;
        this.editingType = type;
        this.originalValues = {};
        this.dirtyFields.clear();
        this.storeOriginalValues(element);
    }

    /**
     * Store original values for reverting
     */
    private storeOriginalValues(element: Element): void {
        this.originalValues = {};
        for (const [key, value] of Object.entries(element)) {
            if (Array.isArray(value)) {
                this.originalValues[key] = [...value];
            } else if (typeof value === 'object' && value !== null) {
                this.originalValues[key] = { ...value };
            } else {
                this.originalValues[key] = value;
            }
        }
    }

    /**
     * Handle field change - main entry point for auto-save
     */
    onFieldChange(fieldName: string, input: HTMLInputElement | HTMLTextAreaElement): void {
        if (!this.enabled || this.paused) {
            return;
        }

        this.dirtyFields.add(fieldName);

        const fieldDiv = document.querySelector(`[data-field="${fieldName}"]`);
        if (fieldDiv) {
            fieldDiv.classList.add('dirty');
        }

        this.updateSaveStatus('typing');

        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Set auto-save timeout (2 seconds after stop typing)
        this.saveTimeout = window.setTimeout(() => {
            this.saveChanges();
        }, 2000);
    }

    /**
     * Cancel editing for a field
     */
    cancelFieldEdit(fieldName: string, input: HTMLInputElement | HTMLTextAreaElement): void {
        const originalValue = this.originalValues[fieldName];

        if (input instanceof HTMLInputElement && input.type === 'checkbox') {
            input.checked = originalValue === true;
        } else {
            input.value = Array.isArray(originalValue)
                ? originalValue.join(', ')
                : (originalValue || '');
        }

        this.dirtyFields.delete(fieldName);
        const fieldDiv = document.querySelector(`[data-field="${fieldName}"]`);
        if (fieldDiv) {
            fieldDiv.classList.remove('dirty', 'editing');
        }

        if (this.dirtyFields.size === 0) {
            this.updateSaveStatus('saved');
        }
    }

    /**
     * Save a single field immediately (for relationship editor)
     */
    async saveField(fieldName: string, value: any): Promise<boolean> {
        if (!this.editingElement || !this.editingType) {
            return false;
        }

        // Show saving indicator
        this.updateSaveStatus('saving');

        try {
            const updated = await this.api.updateElement(
                this.editingType,
                this.editingElement.id,
                { [fieldName]: value }
            );

            Object.assign(this.editingElement, updated);

            if (this.updateCallback) {
                this.updateCallback(this.editingElement);
            }

            // Show saved indicator
            this.updateSaveStatus('saved');

            return true;
        } catch (error) {
            // Show error indicator
            this.updateSaveStatus('error');

            // Enhanced error message for relationship fields
            const isRelField = isRelationshipField && isRelationshipField(fieldName);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            let fullErrorMessage = `Failed to save ${fieldName}: ${errorMessage}`;

            if (isRelField) {
                fullErrorMessage += `\n\nThis is a relationship field. Common causes:`;
                fullErrorMessage += `\n• Linked elements don't exist or belong to different world`;
                fullErrorMessage += `\n• World field is missing or incorrect`;
                fullErrorMessage += `\n• API key/pin permissions issue`;
                fullErrorMessage += `\n\nCheck the browser console for detailed diagnostics.`;
            }

            alert(fullErrorMessage);
            return false;
        }
    }

    /**
     * Save all changes
     */
    async saveChanges(): Promise<void> {
        if (!this.enabled || this.paused || !this.editingElement || !this.editingType) return;

        if (this.dirtyFields.size === 0 || this.isSaving) return;

        this.isSaving = true;
        this.updateSaveStatus('saving');

        try {
            const updates = this.collectChangedValues();

            const updated = await this.api.updateElement(
                this.editingType,
                this.editingElement.id,
                updates
            );

            Object.assign(this.editingElement, updated);

            this.storeOriginalValues(this.editingElement);

            this.dirtyFields.clear();
            document.querySelectorAll('.dirty').forEach(el => {
                el.classList.remove('dirty');
            });

            this.updateSaveStatus('saved');

            if (this.updateCallback) {
                this.updateCallback(this.editingElement);
            }

        } catch (error) {
            console.error('Save failed:', error);
            this.updateSaveStatus('error');

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to save: ${errorMessage}`);
        } finally {
            this.isSaving = false;
        }
    }

    /**
     * Collect values that have changed
     */
    private collectChangedValues(): Record<string, any> {
        const updates: Record<string, any> = {};

        this.dirtyFields.forEach(fieldName => {
            const input = document.querySelector(`[name="${fieldName}"]`) as HTMLInputElement | HTMLTextAreaElement;
            if (!input) return;

            const fieldTypeElement = input.closest('[data-type]') as HTMLElement;
            const fieldType = (fieldTypeElement?.dataset.type || 'string') as FieldType;
            let value: any;

            switch (fieldType) {
                case 'boolean':
                    value = (input as HTMLInputElement).checked;
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
     */
    private updateSaveStatus(status: SaveStatus): void {
        const statusEl = document.getElementById('save-status');
        if (!statusEl) return;

        statusEl.className = 'save-status';

        const statusTextEl = statusEl.querySelector('.status-text') as HTMLElement;
        if (!statusTextEl) return;

        switch (status) {
            case 'typing':
                statusEl.classList.add('typing');
                statusTextEl.textContent = 'Editing...';
                break;

            case 'saving':
                statusEl.classList.add('saving');
                statusTextEl.textContent = 'Saving...';
                break;

            case 'saved':
                statusEl.classList.add('saved');
                statusTextEl.textContent = 'All changes saved';
                break;

            case 'error':
                statusEl.classList.add('error');
                statusTextEl.textContent = 'Failed to save';
                break;
        }
    }

    /**
     * Clean up when editing is done
     */
    cleanup(): void {
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
    pause(): void {
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
    resume(): void {
        this.paused = false;
        // If there are dirty fields, save them now
        if (this.dirtyFields.size > 0 && this.enabled) {
            this.saveChanges();
        }
    }
}