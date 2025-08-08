/**
 * Editor Module
 * Handles creating and editing elements
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
        
        // Update modal title
        document.getElementById('modal-title').textContent = 'Create New Element';
        
        // Enable type selection
        document.getElementById('element-type').disabled = false;
        
        // Show modal
        this.showModal();
    }
    
    /**
     * Open the modal for editing an existing element
     * @param {string} type - Element type
     * @param {string} id - Element ID
     */
    async editElement(type, id) {
        this.isEditMode = true;
        this.currentType = type;
        
        try {
            // Fetch the element
            const element = await this.api.getElement(type, id);
            this.currentElement = element;
            
            // Populate form with element data
            this.populateForm(element);
            
            // Update modal title
            document.getElementById('modal-title').textContent = `Edit ${element.name}`;
            
            // Disable type selection in edit mode
            document.getElementById('element-type').disabled = true;
            
            // Show modal
            this.showModal();
            
        } catch (error) {
            alert(`Error loading element: ${error.message}`);
            console.error('Error loading element:', error);
        }
    }
    
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
                // Update existing element
                const updates = {
                    name: formData.name,
                    description: formData.description,
                    supertype: formData.supertype,
                    subtype: formData.subtype
                };
                
                result = await this.api.updateElement(this.currentType, this.currentElement.id, updates);
                alert('Element updated successfully');
                
            } else {
                // Create new element
                const elementData = {
                    name: formData.name,
                    description: formData.description,
                    supertype: formData.supertype,
                    subtype: formData.subtype
                };
                
                result = await this.api.createElement(formData.type, elementData);
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
        return {
            type: document.getElementById('element-type').value,
            name: document.getElementById('element-name').value.trim(),
            description: document.getElementById('element-description').value.trim(),
            supertype: document.getElementById('element-supertype').value.trim(),
            subtype: document.getElementById('element-subtype').value.trim()
        };
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
        
        // Add supertype suggestions based on element type
        document.getElementById('element-type')?.addEventListener('change', (e) => {
            const type = e.target.value;
            const supertypeInput = document.getElementById('element-supertype');
            
            if (ONLYWORLDS.COMMON_SUPERTYPES[type]) {
                supertypeInput.placeholder = `e.g., ${ONLYWORLDS.COMMON_SUPERTYPES[type].slice(0, 3).join(', ')}`;
            } else {
                supertypeInput.placeholder = 'e.g., protagonist, artifact';
            }
        });
    }
}

// Create global instance (will be initialized after API is ready)
window.elementEditor = null;