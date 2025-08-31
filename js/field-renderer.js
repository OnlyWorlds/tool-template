/**
 * Field Renderer Module
 * Handles rendering of different field types for inline editing
 * Extracted from inline-editor.js for better modularity
 */

import { getFieldType } from './field-types.js';
import typeManager from './type-manager.js';

export class FieldRenderer {
    constructor(onFieldChange) {
        this.onFieldChange = onFieldChange;
        this.elementType = null;
        this.editingElement = null;
    }
    
    /**
     * Set context for field rendering
     */
    setContext(elementType, editingElement) {
        this.elementType = elementType;
        this.editingElement = editingElement;
    }
    
    /**
     * Format field name for display
     */
    formatFieldName(fieldName) {
        return fieldName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    /**
     * Create an editable field with appropriate input type
     */
    createEditableField(fieldName, value, fieldType) {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'editable-field';
        fieldDiv.dataset.field = fieldName;
        fieldDiv.dataset.type = fieldType;
        
        const label = document.createElement('label');
        label.textContent = this.formatFieldName(fieldName);
        fieldDiv.appendChild(label);
        
        let input;
        
        switch (fieldType) {
            case 'date':
                input = this.createDateInput(fieldName, value);
                break;
                
            case 'number':
                input = this.createNumberInput(fieldName, value);
                break;
                
            case 'boolean':
                input = this.createBooleanInput(fieldName, value);
                break;
                
            case 'array<uuid>':
            case 'array<string>':
                input = this.createArrayInput(fieldName, value, fieldType);
                break;
                
            case 'uuid':
                input = this.createUuidInput(fieldName, value);
                break;
                
            case 'object':
                input = this.createObjectInput(fieldName, value);
                break;
                
            default: // string or description
                if (fieldName === 'description' || fieldName === 'content') {
                    input = this.createTextareaInput(fieldName, value);
                } else {
                    input = this.createTextInput(fieldName, value);
                }
        }
        
        this.attachEditingListeners(input, fieldName, fieldType);
        
        fieldDiv.appendChild(input);
        
        // Add help text for complex types
        if (fieldType === 'array<uuid>' || fieldType === 'uuid') {
            const help = document.createElement('small');
            help.className = 'field-help';
            help.textContent = '';
            fieldDiv.appendChild(help);
        }
        
        return fieldDiv;
    }
    
    /**
     * Create text input (now as textarea for multiline support)
     */
    createTextInput(fieldName, value) {
        const textarea = document.createElement('textarea');
        textarea.name = fieldName;
        textarea.value = value || '';
        textarea.className = 'inline-input inline-textarea-small';
        textarea.rows = 1;
        textarea.placeholder = '';
        
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        });
        
        // Initial resize
        setTimeout(() => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }, 0);
        
        return textarea;
    }
    
    /**
     * Create type input with datalist for supertype/subtype
     */
    createTypeInput(fieldName, value) {
        const input = document.createElement('input');
        input.type = 'text';
        input.name = fieldName;
        input.value = value || '';
        input.className = 'inline-input';
        
        // Load type suggestions asynchronously
        if (typeManager && this.elementType) {
            if (fieldName === 'supertype') {
                typeManager.getSupertypes(this.elementType).then(supertypes => {
                    if (supertypes.length > 0) {
                        let datalistId = `inline-supertype-list-${this.editingElement.id}`;
                        let datalist = document.getElementById(datalistId);
                        if (!datalist) {
                            datalist = document.createElement('datalist');
                            datalist.id = datalistId;
                            document.body.appendChild(datalist);
                        }
                        
                        datalist.innerHTML = '';
                        supertypes.forEach(st => {
                            const option = document.createElement('option');
                            option.value = st;
                            datalist.appendChild(option);
                        });
                        
                        input.setAttribute('list', datalistId);
                    }
                });
            } else if (fieldName === 'subtype') {
                const currentSupertype = this.editingElement.supertype;
                if (currentSupertype) {
                    typeManager.getSubtypes(this.elementType, currentSupertype).then(subtypes => {
                        if (subtypes.length > 0) {
                            let datalistId = `inline-subtype-list-${this.editingElement.id}`;
                            let datalist = document.getElementById(datalistId);
                            if (!datalist) {
                                datalist = document.createElement('datalist');
                                datalist.id = datalistId;
                                document.body.appendChild(datalist);
                            }
                            
                            datalist.innerHTML = '';
                            subtypes.forEach(st => {
                                const option = document.createElement('option');
                                option.value = st;
                                datalist.appendChild(option);
                            });
                            
                            input.setAttribute('list', datalistId);
                        }
                    });
                }
            }
        }
        
        // If supertype changes, update the subtype field
        if (fieldName === 'supertype') {
            input.addEventListener('change', () => {
                this.editingElement.supertype = input.value;
                
                const subtypeField = document.querySelector('.compact-field[data-field="subtype"] input');
                if (subtypeField && typeManager) {
                    subtypeField.value = '';
                    this.editingElement.subtype = '';
                    
                    typeManager.getSubtypes(this.elementType, input.value).then(subtypes => {
                        if (subtypes.length > 0) {
                            let datalistId = `inline-subtype-list-${this.editingElement.id}`;
                            let datalist = document.getElementById(datalistId);
                            if (!datalist) {
                                datalist = document.createElement('datalist');
                                datalist.id = datalistId;
                                document.body.appendChild(datalist);
                            }
                            
                            datalist.innerHTML = '';
                            subtypes.forEach(st => {
                                const option = document.createElement('option');
                                option.value = st;
                                datalist.appendChild(option);
                            });
                            
                            subtypeField.setAttribute('list', datalistId);
                        } else {
                            subtypeField.removeAttribute('list');
                        }
                    });
                }
            });
        }
        
        return input;
    }
    
    /**
     * Create textarea input
     */
    createTextareaInput(fieldName, value) {
        const textarea = document.createElement('textarea');
        textarea.name = fieldName;
        textarea.value = value || '';
        textarea.className = 'inline-textarea';
        textarea.rows = 3;
        textarea.placeholder = '';
        
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        });
        
        // Initial resize
        setTimeout(() => {
            textarea.style.height = textarea.scrollHeight + 'px';
        }, 0);
        
        return textarea;
    }
    
    /**
     * Create date input
     */
    createDateInput(fieldName, value) {
        const input = document.createElement('input');
        input.type = 'date';
        input.name = fieldName;
        if (value) {
            input.value = value.split('T')[0]; // Convert ISO to date format
        }
        input.className = 'inline-input';
        return input;
    }
    
    /**
     * Create number input
     */
    createNumberInput(fieldName, value) {
        const input = document.createElement('input');
        input.type = 'number';
        input.name = fieldName;
        input.value = value || '';
        input.className = 'inline-input';
        input.placeholder = '';
        return input;
    }
    
    /**
     * Create boolean checkbox
     */
    createBooleanInput(fieldName, value) {
        const wrapper = document.createElement('div');
        wrapper.className = 'checkbox-wrapper';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = fieldName;
        input.checked = value === true;
        input.className = 'inline-checkbox';
        
        const label = document.createElement('span');
        label.textContent = value ? 'Yes' : 'No';
        label.className = 'checkbox-label';
        
        input.addEventListener('change', () => {
            label.textContent = input.checked ? 'Yes' : 'No';
        });
        
        wrapper.appendChild(input);
        wrapper.appendChild(label);
        return wrapper;
    }
    
    /**
     * Create array input
     */
    createArrayInput(fieldName, value, fieldType) {
        const input = document.createElement('input');
        input.type = 'text';
        input.name = fieldName;
        input.className = 'inline-input';
        
        if (Array.isArray(value)) {
            input.value = value.join(', ');
        } else {
            input.value = value || '';
        }
        
        input.placeholder = '';
        return input;
    }
    
    /**
     * Create UUID input
     */
    createUuidInput(fieldName, value) {
        const input = document.createElement('input');
        input.type = 'text';
        input.name = fieldName;
        input.value = value || '';
        input.className = 'inline-input uuid-input';
        input.placeholder = '';
        input.pattern = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
        return input;
    }
    
    /**
     * Create object/JSON input
     */
    createObjectInput(fieldName, value) {
        const textarea = document.createElement('textarea');
        textarea.name = fieldName;
        textarea.className = 'inline-textarea json-input';
        textarea.rows = 2;
        textarea.placeholder = '';
        
        if (value && typeof value === 'object') {
            textarea.value = JSON.stringify(value, null, 2);
        } else {
            textarea.value = value || '';
        }
        
        return textarea;
    }
    
    /**
     * Attach editing event listeners to input
     */
    attachEditingListeners(input, fieldName, fieldType) {
        const actualInput = input.querySelector('input, textarea') || input;
        
        actualInput.addEventListener('input', () => {
            if (this.onFieldChange) {
                this.onFieldChange(fieldName, actualInput);
            }
        });
        
        // Handle checkbox changes immediately
        if (actualInput.type === 'checkbox') {
            actualInput.addEventListener('change', () => {
                if (this.onFieldChange) {
                    this.onFieldChange(fieldName, actualInput);
                }
            });
        }
        
        // Handle keyboard shortcuts
        actualInput.addEventListener('keydown', (e) => {
            if (actualInput.tagName === 'INPUT' && actualInput.type !== 'checkbox' && actualInput.type !== 'number' && actualInput.type !== 'date') {
                // For non-text inputs: Enter saves
                if (e.key === 'Enter') {
                    e.preventDefault();
                    actualInput.blur();
                }
            } else if (actualInput.tagName === 'TEXTAREA') {
                // For textareas: Ctrl+Enter saves, Enter adds new line
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    actualInput.blur();
                }
            }
            
            // Escape cancels editing
            if (e.key === 'Escape') {
                e.preventDefault();
                actualInput.blur();
            }
        });
    }
}