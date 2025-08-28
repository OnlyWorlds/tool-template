/**
 * Editor Module  
 * Handles creating new elements via modal
 * Note: Editing existing elements is now handled by inline-editor.js
 */

class ElementEditor {
    constructor(apiService) {
        this.api = apiService;
        this.currentElement = null;
        this.isEditMode = false;
        this.currentType = null;
    }
    
    /**
     * Initialize the editor
     */
    init() {
        this.attachEventListeners();
        this.populateElementTypes();
    }
    
    /**
     * Populate element type dropdown in the form
     */
    populateElementTypes() {
        const typeSelect = document.getElementById('element-type');
        if (!typeSelect) return;
        
        typeSelect.innerHTML = '<option value="">Select a type...</option>';
        
        ONLYWORLDS.ELEMENT_TYPES.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            // Use proper singular form
            const label = ONLYWORLDS.ELEMENT_LABELS[type];
            let singular = label;
            // Handle special pluralization cases
            if (label === 'Abilities') singular = 'Ability';
            else if (label === 'Families') singular = 'Family';
            else if (label === 'Species') singular = 'Species';
            else if (label === 'Phenomena') singular = 'Phenomenon';
            else if (label.endsWith('ies')) singular = label.slice(0, -3) + 'y';
            else if (label.endsWith('s')) singular = label.slice(0, -1);
            
            option.textContent = singular;
            typeSelect.appendChild(option);
        });
    }
    
    /**
     * Open the modal for creating a new element
     */
    createNewElement() {
        this.isEditMode = false;
        this.currentElement = null;
        this.currentType = null;
        
        // Reset form
        document.getElementById('element-form').reset();
        
        // Clear dynamic fields
        const container = document.getElementById('dynamic-fields-container');
        if (container) {
            container.innerHTML = '';
        }
        
        // Update modal title
        document.getElementById('modal-title').textContent = 'Create New Element';
        
        // Enable type selection
        document.getElementById('element-type').disabled = false;
        
        // Show modal
        this.showModal();
    }
    
    /**
     * Note: Editing is now handled by inline-editor.js
     * This modal is only for creating new elements
     */
    
    /**
     * Populate the form with element data
     * @param {Object} element - Element to populate form with
     */
    populateForm(element) {
        // Set type
        document.getElementById('element-type').value = this.currentType;
        
        // Set base fields
        document.getElementById('element-name').value = element.name || '';
        document.getElementById('element-description').value = element.description || '';
        document.getElementById('element-supertype').value = element.supertype || '';
        document.getElementById('element-subtype').value = element.subtype || '';
        
        // Generate and populate dynamic fields
        this.generateDynamicFields(this.currentType, element);
    }
    
    /**
     * Generate dynamic form fields based on element type
     * @param {string} elementType - Type of element
     * @param {Object} elementData - Existing element data (for edit mode)
     */
    generateDynamicFields(elementType, elementData = {}) {
        const container = document.getElementById('dynamic-fields-container');
        if (!container) return;
        
        // Clear existing dynamic fields
        container.innerHTML = '';
        
        // Note: Type-specific fields are now handled by the field-types.js system
        // Fields will be available for editing after creation via inline editor
        const info = document.createElement('div');
        info.className = 'form-info';
        info.innerHTML = '<p><em>Additional fields will be available for editing after creation.</em></p>';
        container.appendChild(info);
        
        // Skip dynamic field generation - now handled by getFieldType() system
        if (false) { // Disable the old field generation
            const dummyFieldEntries = [];
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            // Create label
            const label = document.createElement('label');
            label.setAttribute('for', `field-${fieldName}`);
            const labelText = fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            label.textContent = labelText;
            
            // Create input based on field type
            let input;
            const fieldValue = elementData[fieldName];
            
            switch(fieldType) {
                case 'date':
                    input = document.createElement('input');
                    input.type = 'date';
                    input.id = `field-${fieldName}`;
                    input.name = fieldName;
                    if (fieldValue) {
                        // Convert ISO date to YYYY-MM-DD format for date input
                        const dateValue = fieldValue.split('T')[0];
                        input.value = dateValue;
                    }
                    break;
                    
                case 'number':
                    input = document.createElement('input');
                    input.type = 'number';
                    input.id = `field-${fieldName}`;
                    input.name = fieldName;
                    input.value = fieldValue || '';
                    break;
                    
                case 'boolean':
                    input = document.createElement('input');
                    input.type = 'checkbox';
                    input.id = `field-${fieldName}`;
                    input.name = fieldName;
                    input.checked = fieldValue === true;
                    break;
                    
                case 'array<uuid>':
                case 'array<string>':
                    input = document.createElement('input');
                    input.type = 'text';
                    input.id = `field-${fieldName}`;
                    input.name = fieldName;
                    input.placeholder = '';
                    if (Array.isArray(fieldValue)) {
                        input.value = fieldValue.join(', ');
                    } else {
                        input.value = fieldValue || '';
                    }
                    // Add a help text for UUID arrays
                    if (fieldType === 'array<uuid>') {
                        const helpText = document.createElement('small');
                        helpText.className = 'form-help-text';
                        helpText.textContent = '';
                        formGroup.appendChild(label);
                        formGroup.appendChild(input);
                        formGroup.appendChild(helpText);
                        container.appendChild(formGroup);
                        return;
                    }
                    break;
                    
                case 'uuid':
                    input = document.createElement('input');
                    input.type = 'text';
                    input.id = `field-${fieldName}`;
                    input.name = fieldName;
                    input.placeholder = '';
                    input.value = fieldValue || '';
                    // Add help text
                    const helpText = document.createElement('small');
                    helpText.className = 'form-help-text';
                    helpText.textContent = '';
                    formGroup.appendChild(label);
                    formGroup.appendChild(input);
                    formGroup.appendChild(helpText);
                    container.appendChild(formGroup);
                    return;
                    
                case 'object':
                    input = document.createElement('textarea');
                    input.id = `field-${fieldName}`;
                    input.name = fieldName;
                    input.rows = 2;
                    input.placeholder = '';
                    if (fieldValue && typeof fieldValue === 'object') {
                        input.value = JSON.stringify(fieldValue);
                    } else {
                        input.value = fieldValue || '';
                    }
                    break;
                    
                default: // string
                    input = document.createElement('input');
                    input.type = 'text';
                    input.id = `field-${fieldName}`;
                    input.name = fieldName;
                    input.value = fieldValue || '';
                    break;
            }
            
            // Add data attribute for field type (useful for form processing)
            input.setAttribute('data-field-type', fieldType);
            
            // This code is disabled - use inline editor after creation instead
            } // End disabled section
    }
    
    /**
     * Save the element (create or update)
     */
    async saveElement() {
        // Get form values
        const formData = this.getFormData();
        
        // Validate
        if (!formData.name) {
            alert('Name is required');
            return false;
        }
        
        if (!this.isEditMode && !formData.type) {
            alert('Please select an element type');
            return false;
        }
        
        try {
            let result;
            
            if (this.isEditMode) {
                // Update existing element - include all fields from formData except 'type'
                const updates = { ...formData };
                delete updates.type; // Remove type field as it shouldn't be updated
                
                result = await this.api.updateElement(this.currentType, this.currentElement.id, updates);
                alert('Element updated successfully');
                
            } else {
                // Create new element - use all fields except 'type'
                const elementData = { ...formData };
                const elementType = elementData.type;
                delete elementData.type; // Remove type from data as it's passed separately
                
                result = await this.api.createElement(elementType, elementData);
                alert('Element created successfully');
            }
            
            // Close modal
            this.hideModal();
            
            // Refresh the viewer if it's showing this type
            if (window.elementViewer && 
                (window.elementViewer.currentCategory === this.currentType || 
                 window.elementViewer.currentCategory === formData.type)) {
                await window.elementViewer.loadElements(window.elementViewer.currentCategory);
                
                // If we were editing, refresh the detail view
                if (this.isEditMode) {
                    await window.elementViewer.selectElement(result);
                }
            }
            
            // Update category count
            if (window.elementViewer) {
                window.elementViewer.updateCategoryCounts();
            }
            
            return true;
            
        } catch (error) {
            alert(`Error saving element: ${error.message}`);
            console.error('Error saving element:', error);
            return false;
        }
    }
    
    /**
     * Get form data
     * @returns {Object} Form data
     */
    getFormData() {
        const formData = {
            type: document.getElementById('element-type').value,
            name: document.getElementById('element-name').value.trim(),
            description: document.getElementById('element-description').value.trim(),
            supertype: document.getElementById('element-supertype').value.trim(),
            subtype: document.getElementById('element-subtype').value.trim()
        };
        
        // Collect dynamic fields
        const dynamicInputs = document.querySelectorAll('#dynamic-fields-container [data-field-type]');
        dynamicInputs.forEach(input => {
            const fieldName = input.name;
            const fieldType = input.getAttribute('data-field-type');
            
            if (!fieldName) return;
            
            // Process value based on field type
            let value;
            switch(fieldType) {
                case 'boolean':
                    value = input.checked;
                    break;
                    
                case 'number':
                    value = input.value ? parseFloat(input.value) : null;
                    break;
                    
                case 'date':
                    value = input.value || null;
                    break;
                    
                case 'array<uuid>':
                case 'array<string>':
                    // Convert comma-separated string to array
                    if (input.value.trim()) {
                        value = input.value.split(',').map(v => v.trim()).filter(v => v);
                    } else {
                        value = [];
                    }
                    break;
                    
                case 'object':
                    // Try to parse JSON
                    if (input.value.trim()) {
                        try {
                            value = JSON.parse(input.value);
                        } catch (e) {
                            // If JSON is invalid, store as string
                            value = input.value.trim();
                        }
                    } else {
                        value = null;
                    }
                    break;
                    
                default: // string, uuid
                    value = input.value.trim() || null;
                    break;
            }
            
            // Only add field if it has a value
            if (value !== null && value !== '' && (!Array.isArray(value) || value.length > 0)) {
                formData[fieldName] = value;
            }
        });
        
        return formData;
    }
    
    /**
     * Show the modal
     */
    showModal() {
        document.getElementById('modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        
        // Focus on first input
        setTimeout(() => {
            if (this.isEditMode) {
                document.getElementById('element-name').focus();
            } else {
                document.getElementById('element-type').focus();
            }
        }, 100);
    }
    
    /**
     * Hide the modal
     */
    hideModal() {
        document.getElementById('modal').classList.add('hidden');
        document.body.style.overflow = ''; // Re-enable scrolling
        
        // Reset state
        this.currentElement = null;
        this.isEditMode = false;
        this.currentType = null;
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Create button
        document.getElementById('create-element-btn')?.addEventListener('click', () => {
            this.createNewElement();
        });
        
        // Modal close button
        document.getElementById('modal-close')?.addEventListener('click', () => {
            this.hideModal();
        });
        
        // Cancel button
        document.getElementById('cancel-btn')?.addEventListener('click', () => {
            this.hideModal();
        });
        
        // Form submit
        document.getElementById('element-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveElement();
        });
        
        // Close modal on backdrop click
        document.getElementById('modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                this.hideModal();
            }
        });
        
        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !document.getElementById('modal').classList.contains('hidden')) {
                this.hideModal();
            }
        });
        
        // Add supertype suggestions based on element type and generate dynamic fields
        document.getElementById('element-type')?.addEventListener('change', (e) => {
            const type = e.target.value;
            const supertypeInput = document.getElementById('element-supertype');
            
            if (ONLYWORLDS.COMMON_SUPERTYPES[type]) {
                supertypeInput.placeholder = '';
            } else {
                supertypeInput.placeholder = '';
            }
            
            // Generate dynamic fields for the selected type
            if (type && !this.isEditMode) {
                this.generateDynamicFields(type);
            }
        });
    }
}

// Create global instance (will be initialized after API is ready)
window.elementEditor = null;