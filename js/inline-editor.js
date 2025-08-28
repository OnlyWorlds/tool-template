/**
 * Inline Editor Module
 * Handles direct editing of element fields in the detail view
 * 
 * Educational Note: This module demonstrates modern UX patterns:
 * - Immediate editing without mode switching
 * - Auto-save with debouncing
 * - Optimistic UI updates with rollback on error
 * - Clear visual feedback for edit states
 */

class InlineEditor {
    constructor(apiService) {
        this.api = apiService;
        this.editingElement = null;
        this.editingType = null;
        this.originalValues = {};
        this.dirtyFields = new Set();
        this.saveTimeout = null;
        this.isSaving = false;
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
        this.elementType = elementType;  // Store for use in createCompactField
        this.originalValues = {};
        this.dirtyFields.clear();
        
        // Store original values for rollback
        this.storeOriginalValues(element);
        
        // Build the editable interface
        this.renderEditableFields(container);
    }
    
    /**
     * Store original values for potential rollback
     * @param {Object} element - Element with original values
     */
    storeOriginalValues(element) {
        // Store all current values
        Object.keys(element).forEach(key => {
            if (element[key] !== undefined) {
                // Deep clone arrays and objects
                if (Array.isArray(element[key])) {
                    this.originalValues[key] = [...element[key]];
                } else if (typeof element[key] === 'object' && element[key] !== null) {
                    this.originalValues[key] = { ...element[key] };
                } else {
                    this.originalValues[key] = element[key];
                }
            }
        });
    }
    
    /**
     * Render editable fields in the container
     * @param {HTMLElement} container - Container for the fields
     */
    renderEditableFields(container) {
        // Clear container
        container.innerHTML = '';
        
        // Create header with save status
        const header = document.createElement('div');
        header.className = 'inline-editor-header';
        header.innerHTML = `
            <h2>${this.escapeHtml(this.editingElement.name || 'Unnamed')}</h2>
            <div class="save-status" id="save-status">
                <span class="status-text">All changes saved</span>
            </div>
        `;
        container.appendChild(header);
        
        // Create fields container
        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'fields-container';
        
        // Render all fields in compact format
        this.renderCompactFields(fieldsContainer);
        container.appendChild(fieldsContainer);
        
        // Add delete button at bottom
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = `Delete ${this.editingElement.name || 'Element'}`;
        deleteBtn.style.marginTop = '20px';
        deleteBtn.onclick = () => {
            if (confirm(`Delete "${this.editingElement.name}"? This cannot be undone.`)) {
                window.elementViewer.deleteElement(this.editingType, this.editingElement.id);
            }
        };
        container.appendChild(deleteBtn);
    }
    
    /**
     * Render all fields in compact format
     * @param {HTMLElement} container - Container element
     */
    renderCompactFields(container) {
        // Base fields that all elements have
        const baseFields = ['name', 'description', 'supertype', 'subtype', 'image_url'];
        
        // Render base fields
        baseFields.forEach(fieldName => {
            if (this.editingElement.hasOwnProperty(fieldName) || fieldName === 'name' || fieldName === 'description') {
                const fieldDiv = this.createCompactField(
                    fieldName,
                    this.editingElement[fieldName],
                    'string'
                );
                container.appendChild(fieldDiv);
            }
        });
        
        // Render all element fields (using new field type system)
        Object.keys(this.editingElement).forEach(fieldName => {
            // Skip if already rendered base field or metadata
            if (baseFields.includes(fieldName) || 
                ['id', 'world', 'created_at', 'updated_at'].includes(fieldName)) {
                return;
            }
            
            // Get field type using new system
            const fieldType = getFieldTypeString(fieldName);
            
            const fieldDiv = this.createCompactField(
                fieldName,
                this.editingElement[fieldName],
                fieldType
            );
            container.appendChild(fieldDiv);
        });
    }
    
    /**
     * Create a compact field with inline label and value
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
        
        // Create label (fixed width for alignment)
        const label = document.createElement('label');
        label.className = 'compact-label';
        label.textContent = this.formatFieldName(fieldName) + ':';
        fieldDiv.appendChild(label);
        
        // Create value container
        const valueContainer = document.createElement('div');
        valueContainer.className = 'compact-value';
        
        // For relationship fields, use new relationship editor
        if (fieldType === 'uuid' || fieldType === 'array<uuid>') {
            if (!window.relationshipEditor) {
                window.relationshipEditor = new RelationshipEditor(this.api, this);
            }
            
            window.relationshipEditor.createRelationshipField(
                valueContainer, 
                fieldName, 
                value, 
                fieldType, 
                this.editingElement  // Use the stored element from initialization
            );
        } else {
            // Create normal input
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
                    
                case 'array<string>':
                    input = this.createArrayInput(fieldName, value, fieldType);
                    break;
                    
                case 'object':
                    input = this.createObjectInput(fieldName, value);
                    break;
                    
                case 'longtext':
                    input = this.createTextareaInput(fieldName, value);
                    break;
                    
                default: // string
                    input = this.createTextInput(fieldName, value);
            }
            
            // Add event listeners
            this.attachEditingListeners(input, fieldName, fieldType);
            valueContainer.appendChild(input);
        }
        
        fieldDiv.appendChild(valueContainer);
        return fieldDiv;
    }
    
    /**
     * Create relationship picker for UUID fields
     * @param {HTMLElement} container - Container for the picker
     * @param {string} fieldName - Name of the field
     * @param {*} value - Current value (UUID or array of UUIDs)
     * @param {string} fieldType - Type of field (uuid or array<uuid>)
     */
    createRelationshipPicker(container, fieldName, value, fieldType) {
        // Determine the element type from field name
        let targetType = this.guessElementType(fieldName);
        
        // Create display for current values
        const display = document.createElement('div');
        display.className = 'relationship-display';
        
        if (fieldType === 'array<uuid>') {
            // Multiple relationships
            const values = Array.isArray(value) ? value : [];
            display.innerHTML = values.length > 0 
                ? `<span class="relationship-count">${values.length} linked</span>`
                : '<span class="relationship-empty">None</span>';
        } else {
            // Single relationship
            display.innerHTML = value 
                ? `<span class="relationship-id">${this.getElementName(value, targetType) || value}</span>`
                : '<span class="relationship-empty">None</span>';
        }
        
        container.appendChild(display);
        
        // Create picker button
        const pickerBtn = document.createElement('button');
        pickerBtn.className = 'btn-picker';
        pickerBtn.innerHTML = '📝';
        pickerBtn.title = 'Select elements';
        pickerBtn.onclick = () => this.openRelationshipPicker(fieldName, value, fieldType, targetType);
        container.appendChild(pickerBtn);
        
        // Store for updates
        container.dataset.fieldName = fieldName;
        container.dataset.fieldType = fieldType;
    }
    
    /**
     * Guess element type from field name
     */
    guessElementType(fieldName) {
        // Remove _id or _ids suffix
        const cleanName = fieldName.replace(/_ids?$/, '');
        
        // Direct matches
        if (ONLYWORLDS.ELEMENT_TYPES.includes(cleanName)) {
            return cleanName;
        }
        
        // Common mappings
        const mappings = {
            'birthplace': 'location',
            'location': 'location',
            'parent_location': 'location',
            'species': 'species',
            'abilities': 'ability',
            'traits': 'trait',
            'titles': 'title',
            'members': 'character',
            'participants': 'character',
            'zones': 'zone',
            'languages': 'language',
            'laws': 'law',
            'institutions': 'institution'
        };
        
        return mappings[cleanName] || 'character'; // Default to character
    }
    
    /**
     * Get element name by ID (from cache or API)
     */
    getElementName(elementId, elementType) {
        // For now, just return shortened ID
        // In a real implementation, you'd fetch from API or cache
        return elementId ? `...${elementId.slice(-8)}` : null;
    }
    
    /**
     * Open relationship picker modal
     */
    async openRelationshipPicker(fieldName, currentValue, fieldType, targetType) {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'relationship-modal';
        modal.innerHTML = `
            <div class="relationship-modal-content">
                <div class="relationship-modal-header">
                    <h3>Select ${this.formatFieldName(targetType)}${fieldType === 'array<uuid>' ? '(s)' : ''}</h3>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <div class="relationship-modal-body">
                    <input type="text" class="relationship-search" placeholder="">
                    <div class="relationship-list">Loading...</div>
                </div>
                <div class="relationship-modal-footer">
                    <button class="btn btn-secondary">Cancel</button>
                    <button class="btn btn-primary">Save Selection</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Load elements
        try {
            const elements = await this.api.getElements(targetType);
            const listContainer = modal.querySelector('.relationship-list');
            
            // Current values as array
            const currentValues = fieldType === 'array<uuid>' 
                ? (Array.isArray(currentValue) ? currentValue : [])
                : (currentValue ? [currentValue] : []);
            
            // Build list
            listContainer.innerHTML = '';
            elements.forEach(element => {
                const item = document.createElement('div');
                item.className = 'relationship-item';
                
                const isSelected = currentValues.includes(element.id);
                
                if (fieldType === 'array<uuid>') {
                    // Checkbox for multiple
                    item.innerHTML = `
                        <input type="checkbox" id="rel-${element.id}" ${isSelected ? 'checked' : ''}>
                        <label for="rel-${element.id}">
                            ${element.name || 'Unnamed'}
                            <small>${element.supertype || element.subtype || ''}</small>
                        </label>
                    `;
                } else {
                    // Radio for single
                    item.innerHTML = `
                        <input type="radio" name="relationship-select" id="rel-${element.id}" ${isSelected ? 'checked' : ''}>
                        <label for="rel-${element.id}">
                            ${element.name || 'Unnamed'}
                            <small>${element.supertype || element.subtype || ''}</small>
                        </label>
                    `;
                }
                
                item.dataset.id = element.id;
                item.dataset.name = element.name || 'Unnamed';
                listContainer.appendChild(item);
            });
            
            // Search functionality
            const searchInput = modal.querySelector('.relationship-search');
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                modal.querySelectorAll('.relationship-item').forEach(item => {
                    const name = item.dataset.name.toLowerCase();
                    item.style.display = name.includes(searchTerm) ? '' : 'none';
                });
            });
            
            // Save button
            modal.querySelector('.btn-primary').onclick = () => {
                let newValue;
                
                if (fieldType === 'array<uuid>') {
                    // Collect checked checkboxes
                    newValue = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked'))
                        .map(cb => cb.id.replace('rel-', ''));
                } else {
                    // Get selected radio
                    const selected = modal.querySelector('input[type="radio"]:checked');
                    newValue = selected ? selected.id.replace('rel-', '') : null;
                }
                
                // Update field
                this.updateRelationshipField(fieldName, newValue, fieldType);
                document.body.removeChild(modal);
            };
            
            // Cancel button
            modal.querySelector('.btn-secondary').onclick = () => {
                document.body.removeChild(modal);
            };
            
            // Close button
            modal.querySelector('.modal-close-btn').onclick = () => {
                document.body.removeChild(modal);
            };
            
        } catch (error) {
            console.error('Failed to load elements:', error);
            modal.querySelector('.relationship-list').innerHTML = 'Failed to load elements';
        }
    }
    
    /**
     * Update relationship field after picker selection
     */
    updateRelationshipField(fieldName, value, fieldType) {
        // Find the field container
        const fieldContainer = document.querySelector(`[data-field="${fieldName}"] .relationship-display`);
        if (!fieldContainer) return;
        
        // Update display
        if (fieldType === 'array<uuid>') {
            const values = Array.isArray(value) ? value : [];
            fieldContainer.innerHTML = values.length > 0 
                ? `<span class="relationship-count">${values.length} linked</span>`
                : '<span class="relationship-empty">None</span>';
            
            // Store value for saving
            this.editingElement[fieldName] = values;
        } else {
            fieldContainer.innerHTML = value 
                ? `<span class="relationship-id">${value.slice(-8)}</span>`
                : '<span class="relationship-empty">None</span>';
            
            // Store value for saving
            this.editingElement[fieldName] = value;
        }
        
        // Mark as dirty and trigger save
        this.dirtyFields.add(fieldName);
        this.onFieldChange(fieldName, null, fieldType);
    }
    
    /**
     * Create an editable field based on type (OLD - kept for reference)
     * @param {string} fieldName - Name of the field
     * @param {*} value - Current value
     * @param {string} fieldType - Type of the field
     * @returns {HTMLElement} Field container element
     */
    createEditableField(fieldName, value, fieldType) {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'editable-field';
        fieldDiv.dataset.field = fieldName;
        fieldDiv.dataset.type = fieldType;
        
        // Create label
        const label = document.createElement('label');
        label.textContent = this.formatFieldName(fieldName);
        fieldDiv.appendChild(label);
        
        // Create appropriate input based on type
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
        
        // Add event listeners for editing
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
     * Create text input
     */
    createTextInput(fieldName, value) {
        const input = document.createElement('input');
        input.type = 'text';
        input.name = fieldName;
        input.value = value || '';
        input.className = 'inline-input';
        input.placeholder = '';
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
        
        // Auto-resize textarea
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
        // Get the actual input element (might be wrapped)
        const actualInput = input.querySelector('input, textarea') || input;
        
        // Focus effect
        actualInput.addEventListener('focus', () => {
            this.onFieldFocus(fieldName);
        });
        
        // Change tracking
        actualInput.addEventListener('input', () => {
            this.onFieldChange(fieldName, actualInput, fieldType);
        });
        
        // Keyboard shortcuts
        actualInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.saveChanges();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelFieldEdit(fieldName, actualInput);
            }
        });
    }
    
    /**
     * Handle field focus
     */
    onFieldFocus(fieldName) {
        // Visual feedback
        const fieldDiv = document.querySelector(`[data-field="${fieldName}"]`);
        if (fieldDiv) {
            fieldDiv.classList.add('editing');
        }
    }
    
    /**
     * Handle field change
     */
    onFieldChange(fieldName, input, fieldType) {
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
        // Save field to API
        
        try {
            const updated = await this.api.updateElement(
                this.editingType,
                this.editingElement.id,
                { [fieldName]: value }
            );
            
            // Field saved successfully
            
            // Update local element
            Object.assign(this.editingElement, updated);
            return true;
        } catch (error) {
            // Save failed
            
            // Enhanced error message for relationship fields
            const isRelField = window.isRelationshipField && window.isRelationshipField(fieldName);
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
     * Format field name for display
     */
    formatFieldName(fieldName) {
        // Remove _id or _ids suffix for relationship fields
        let cleaned = fieldName.replace(/_ids?$/, '');
        
        // Format the cleaned name
        return cleaned
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(' Url', ' URL');
    }
    
    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Clean up when leaving edit mode
     */
    cleanup() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        // Save any pending changes
        if (this.dirtyFields.size > 0) {
            this.saveChanges();
        }
        
        this.editingElement = null;
        this.editingType = null;
        this.originalValues = {};
        this.dirtyFields.clear();
    }
}

// Export for use in other modules
window.InlineEditor = InlineEditor;