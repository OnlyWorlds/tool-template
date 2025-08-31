/**
 * Inline Editor Module (Refactored)
 * Handles direct editing of element fields in the detail view
 * Now uses extracted FieldRenderer and AutoSaveManager modules
 */

import { ONLYWORLDS } from './constants.js';
import { getFieldType, isRelationshipField } from './field-types.js';
import RelationshipEditor from './relationship-editor.js';
import typeManager from './type-manager.js';
import { FieldRenderer } from './field-renderer.js';
import { AutoSaveManager } from './auto-save.js';

class InlineEditor {
    constructor(apiService) {
        this.api = apiService;
        this.editingElement = null;
        this.editingType = null;
        this.elementType = null;
        
        // Create autoSaveManager first since fieldRenderer needs it
        this.autoSaveManager = new AutoSaveManager(apiService, (updatedElement) => {
            this.editingElement = updatedElement;
        });
        
        this.fieldRenderer = new FieldRenderer((fieldName, input) => {
            if (this.autoSaveManager) {
                this.autoSaveManager.onFieldChange(fieldName, input);
            }
        });
        
        this.relationshipEditor = null;
    }
    
    /**
     * Initialize inline editing for an element
     * @param {Object} element - The element to edit
     * @param {string} elementType - Type of the element
     * @param {HTMLElement} container - Container element for the editor
     */
    initializeEditor(element, elementType, container) {
        this.editingElement = element;
        this.editingType = elementType;
        this.elementType = elementType;
        
        this.fieldRenderer.setContext(elementType, element);
        this.autoSaveManager.setEditingContext(element, elementType);
        
        this.renderEditableFields(container);
    }
    
    /**
     * Render editable fields in the container
     * @param {HTMLElement} container - Container for the fields
     */
    renderEditableFields(container) {
        container.innerHTML = '';
        
        const header = document.createElement('div');
        header.className = 'inline-editor-header';
        header.innerHTML = `
            <h2>${this.escapeHtml(this.editingElement.name || 'Unnamed')}</h2>
            <div class="header-actions">
                <div class="save-status" id="save-status">
                    <span class="status-indicator"></span>
                    <span class="status-text">Ready</span>
                </div>
                <button class="delete-btn-icon" title="Delete ${this.escapeHtml(this.editingType)}" aria-label="Delete element">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
        `;
        container.appendChild(header);
        
        const deleteBtn = header.querySelector('.delete-btn-icon');
        deleteBtn.onclick = async () => {
            if (confirm(`Are you sure you want to delete this ${this.editingType}?`)) {
                try {
                    await this.api.deleteElement(this.editingType, this.editingElement.id);
                    window.elementViewer.deleteElement(this.editingType, this.editingElement.id);
                } catch (error) {
                    alert(`Failed to delete: ${error.message}`);
                }
            }
        };
        
        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'inline-editor-fields';
        
        this.renderCompactFields(fieldsContainer);
        
        container.appendChild(fieldsContainer);
    }
    
    /**
     * Render fields in compact format
     * @param {HTMLElement} container - Container for the fields
     */
    renderCompactFields(container) {
        const element = this.editingElement;
        
        const primaryFields = ['name', 'description'];
        const metaFields = ['supertype', 'subtype', 'image_url'];
        const systemFields = ['id', 'world', 'created_at', 'updated_at'];
        
        const allFieldNames = Object.keys(element);
        const otherFields = allFieldNames.filter(field => 
            !primaryFields.includes(field) && 
            !metaFields.includes(field) && 
            !systemFields.includes(field)
        );
        
        // Render primary fields
        primaryFields.forEach(fieldName => {
            if (fieldName in element) {
                const fieldType = getFieldType(fieldName).type;
                container.appendChild(this.createCompactField(fieldName, element[fieldName], fieldType));
            }
        });
        
        // Render meta fields
        metaFields.forEach(fieldName => {
            if (fieldName in element) {
                const fieldType = getFieldType(fieldName).type;
                container.appendChild(this.createCompactField(fieldName, element[fieldName], fieldType));
            }
        });
        
        // Render other fields
        otherFields.forEach(fieldName => {
            const fieldType = getFieldType(fieldName).type;
            container.appendChild(this.createCompactField(fieldName, element[fieldName], fieldType));
        });
        
        // System fields (read-only) at the bottom
        if (systemFields.some(field => field in element)) {
            const systemSection = document.createElement('div');
            systemSection.className = 'system-fields-section';
            systemSection.innerHTML = '<h4>System Fields</h4>';
            
            systemFields.forEach(fieldName => {
                if (fieldName in element) {
                    const fieldDiv = this.createCompactField(fieldName, element[fieldName], 'readonly');
                    fieldDiv.classList.add('readonly');
                    systemSection.appendChild(fieldDiv);
                }
            });
            
            container.appendChild(systemSection);
        }
    }
    
    /**
     * Create a compact field display
     * @param {string} fieldName - Name of the field
     * @param {*} value - Current value
     * @param {string} fieldType - Type of the field
     * @returns {HTMLElement} Field container element
     */
    createCompactField(fieldName, value, fieldType) {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'compact-field';
        fieldDiv.dataset.field = fieldName;
        fieldDiv.dataset.type = fieldType;
        
        const label = document.createElement('label');
        label.className = 'compact-label';
        label.textContent = this.fieldRenderer.formatFieldName(fieldName) + ':';
        fieldDiv.appendChild(label);
        
        const valueContainer = document.createElement('div');
        valueContainer.className = 'compact-value';
        
        // Check if this is a generic UUID field with no specific target
        const fieldInfo = getFieldType(fieldName);
        const isGenericUuid = (fieldType === 'uuid' || fieldType === 'array<uuid>') && 
                               fieldInfo.related_to === null;
        
        // Make Pin's element_type, element_id, and map fields read-only
        // Also make Marker's map field read-only (required field)
        const isPinSpecialField = this.editingType === 'pin' && 
                                  (fieldName === 'element_type' || fieldName === 'element_id' || fieldName === 'map');
        const isMarkerMapField = this.editingType === 'marker' && fieldName === 'map';
        
        if (isPinSpecialField || isMarkerMapField) {
            fieldType = 'readonly';
        }
        
        // For relationship fields (but not generic UUIDs), use new relationship editor
        if ((fieldType === 'uuid' || fieldType === 'array<uuid>') && !isGenericUuid && !isPinSpecialField) {
            if (!this.relationshipEditor) {
                this.relationshipEditor = new RelationshipEditor(this.api, this);
            }
            
            this.relationshipEditor.createRelationshipField(
                valueContainer, 
                fieldName, 
                value, 
                fieldType, 
                this.editingElement
            );
        } else if (fieldType === 'readonly') {
            let displayValue = value;
            if (fieldName === 'created_at' || fieldName === 'updated_at') {
                displayValue = this.formatDate(value);
            } else if (fieldName === 'element_type') {
                displayValue = value ? `${value} (Pin reference - read only)` : 'N/A';
            } else if (fieldName === 'element_id') {
                displayValue = value ? `${value} (Pin reference - read only)` : 'N/A';
            } else if (fieldName === 'map' && (this.editingType === 'pin' || this.editingType === 'marker')) {
                const mapId = typeof value === 'object' && value !== null ? value.id : value;
                displayValue = mapId ? `${mapId} (Required - read only)` : 'N/A';
            }
            valueContainer.innerHTML = `<span class="readonly-value">${this.escapeHtml(displayValue || 'N/A')}</span>`;
        } else {
            let input;
            
            switch (fieldType) {
                case 'date':
                    input = this.fieldRenderer.createDateInput(fieldName, value);
                    break;
                    
                case 'number':
                    input = this.fieldRenderer.createNumberInput(fieldName, value);
                    break;
                    
                case 'boolean':
                    input = this.fieldRenderer.createBooleanInput(fieldName, value);
                    break;
                    
                case 'array<string>':
                    input = this.fieldRenderer.createArrayInput(fieldName, value, fieldType);
                    break;
                    
                case 'object':
                    input = this.fieldRenderer.createObjectInput(fieldName, value);
                    break;
                    
                case 'longtext':
                    input = this.fieldRenderer.createTextareaInput(fieldName, value);
                    break;
                    
                default: // string
                    if (fieldName === 'supertype' || fieldName === 'subtype') {
                        input = this.fieldRenderer.createTypeInput(fieldName, value);
                    } else if (fieldName === 'description' || fieldName === 'content') {
                        input = this.fieldRenderer.createTextareaInput(fieldName, value);
                    } else {
                        input = this.fieldRenderer.createTextInput(fieldName, value);
                    }
            }
            
            this.fieldRenderer.attachEditingListeners(input, fieldName, fieldType);
            valueContainer.appendChild(input);
        }
        
        fieldDiv.appendChild(valueContainer);
        
        return fieldDiv;
    }
    
    /**
     * Save a single field immediately (delegate to auto-save manager)
     * @param {string} fieldName - Field name to save
     * @param {*} value - New value
     * @returns {Promise<boolean>} Success status
     */
    async saveField(fieldName, value) {
        this.editingElement[fieldName] = value;
        return await this.autoSaveManager.saveField(fieldName, value);
    }
    
    /**
     * Update relationship field after selection
     * @param {string} fieldName - Field name
     * @param {*} value - New value
     * @param {string} fieldType - Field type
     */
    async updateRelationshipField(fieldName, value, fieldType) {
        const success = await this.saveField(fieldName, value);
        
        if (success) {
            const fieldContainer = document.querySelector(`[data-field="${fieldName}"] .compact-value`);
            if (fieldContainer && this.relationshipEditor) {
                fieldContainer.innerHTML = '';
                this.relationshipEditor.createRelationshipField(
                    fieldContainer,
                    fieldName,
                    value,
                    fieldType,
                    this.editingElement
                );
            }
        }
    }
    
    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString();
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Clean up when leaving edit mode
     */
    cleanup() {
        if (this.autoSaveManager.dirtyFields.size > 0) {
            this.autoSaveManager.saveChanges();
        }
        
        this.autoSaveManager.cleanup();
        
        this.editingElement = null;
        this.editingType = null;
        this.elementType = null;
    }
}

export default InlineEditor;