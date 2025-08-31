/**
 * Editor Module  
 * Handles creating new elements via modal
 * Note: Editing existing elements is now handled by inline-editor.js
 */

import { ONLYWORLDS } from './constants.js';
import { getFieldType } from './field-types.js';

export default class ElementEditor {
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
            option.textContent = ONLYWORLDS.ELEMENT_SINGULAR[type];
            typeSelect.appendChild(option);
        });
    }
    
    /**
     * Open the modal for creating a new element
     */
    createNewElement() {
        this.isEditMode = false;
        this.currentElement = null;
        
        const createBtn = document.getElementById('create-element-btn');
        const preselectedType = createBtn?.dataset.elementType || null;
        this.currentType = preselectedType;
        
        document.getElementById('element-form').reset();
        
        const container = document.getElementById('dynamic-fields-container');
        if (container) {
            container.innerHTML = '';
        }
        
        const typeSelect = document.getElementById('element-type');
        if (preselectedType && typeSelect) {
            typeSelect.value = preselectedType;
            typeSelect.disabled = true;
            this.generateDynamicFields(preselectedType);
        } else if (typeSelect) {
            typeSelect.disabled = false;
        }
        
        const title = preselectedType ? 
            `Create New ${ONLYWORLDS.ELEMENT_SINGULAR[preselectedType]}` : 
            'Create New Element';
        document.getElementById('modal-title').textContent = title;
        
        this.showModal();
    }
    
    /**
     * Populate the form with element data
     * @param {Object} element - Element to populate form with
     */
    populateForm(element) {
        document.getElementById('element-type').value = this.currentType;
        document.getElementById('element-name').value = element.name || '';
        document.getElementById('element-description').value = element.description || '';
        
        this.generateDynamicFields(this.currentType, element);
    }
    
    /**
     * Generate dynamic form fields based on element type
     * Currently disabled - inline editor handles field editing after creation
     */
    generateDynamicFields(elementType, elementData = {}) {
        const container = document.getElementById('dynamic-fields-container');
        if (!container) return;
        
        container.innerHTML = '';
        // Dynamic field generation disabled - use inline editor after creation
    }
    
    /**
     * Save the element (create or update)
     */
    async saveElement() {
        const formData = this.getFormData();
        
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
                const updates = { ...formData };
                delete updates.type;
                
                result = await this.api.updateElement(this.currentType, this.currentElement.id, updates);
                alert('Element updated successfully');
                
            } else {
                const elementData = { ...formData };
                const elementType = elementData.type;
                delete elementData.type;
                
                result = await this.api.createElement(elementType, elementData);
            }
            
            this.hideModal();
            
            if (window.elementViewer && 
                (window.elementViewer.currentCategory === this.currentType || 
                 window.elementViewer.currentCategory === formData.type)) {
                await window.elementViewer.loadElements(window.elementViewer.currentCategory);
                
                if (this.isEditMode) {
                    await window.elementViewer.selectElement(result);
                }
            }
            
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
            description: document.getElementById('element-description').value.trim()
        };
        
        const dynamicInputs = document.querySelectorAll('#dynamic-fields-container [data-field-type]');
        dynamicInputs.forEach(input => {
            const fieldName = input.name;
            const fieldType = input.getAttribute('data-field-type');
            
            if (!fieldName) return;
            
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
                    if (input.value.trim()) {
                        value = input.value.split(',').map(v => v.trim()).filter(v => v);
                    } else {
                        value = [];
                    }
                    break;
                    
                case 'object':
                    if (input.value.trim()) {
                        try {
                            value = JSON.parse(input.value);
                        } catch (e) {
                            value = input.value.trim();
                        }
                    } else {
                        value = null;
                    }
                    break;
                    
                default:
                    value = input.value.trim() || null;
                    break;
            }
            
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
        document.body.style.overflow = 'hidden';
        
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
        document.body.style.overflow = '';
        
        this.currentElement = null;
        this.isEditMode = false;
        this.currentType = null;
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        document.getElementById('create-element-btn')?.addEventListener('click', () => {
            this.createNewElement();
        });
        
        document.getElementById('modal-close')?.addEventListener('click', () => {
            this.hideModal();
        });
        
        document.getElementById('cancel-btn')?.addEventListener('click', () => {
            this.hideModal();
        });
        
        document.getElementById('element-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveElement();
        });
        
        document.getElementById('modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                this.hideModal();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !document.getElementById('modal').classList.contains('hidden')) {
                this.hideModal();
            }
        });
        
        document.getElementById('element-type')?.addEventListener('change', async (e) => {
            const type = e.target.value;
            
            if (type && !this.isEditMode) {
                this.generateDynamicFields(type);
            }
        });
    }
}