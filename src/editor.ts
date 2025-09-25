/**
 * Editor Module (TypeScript)
 * Handles creating new elements via modal with full type safety
 * Note: Editing existing elements is handled by inline-editor.js
 */

import { ONLYWORLDS, getFieldType } from './compatibility.js';
import OnlyWorldsAPI from './api.js';

// Type definitions
type ElementType = typeof ONLYWORLDS.ELEMENT_TYPES[number];

interface BaseElement {
    id: string;
    name: string;
    description?: string;
    supertype?: string;
    subtype?: string;
    image_url?: string;
    world: string;
    created_at: string;
    updated_at: string;
}

interface OnlyWorldsElement extends BaseElement {
    [key: string]: any;
}

interface FormData {
    type?: string;
    name: string;
    description?: string;
    [key: string]: any;
}

// Global interface for window object
declare global {
    interface Window {
        elementViewer?: {
            currentCategory: ElementType | null;
            loadElements(category: ElementType): Promise<void>;
            selectElement(element: OnlyWorldsElement): Promise<void>;
            updateCategoryCounts(): void;
        };
    }
}

export default class ElementEditor {
    private api: OnlyWorldsAPI;
    private currentElement: OnlyWorldsElement | null = null;
    private isEditMode: boolean = false;
    private currentType: ElementType | null = null;

    constructor(apiService: OnlyWorldsAPI) {
        this.api = apiService;
    }

    /**
     * Initialize the editor
     */
    init(): void {
        this.attachEventListeners();
        this.populateElementTypes();
    }

    /**
     * Populate element type dropdown in the form
     */
    populateElementTypes(): void {
        const typeSelect = document.getElementById('element-type') as HTMLSelectElement;
        if (!typeSelect) return;

        typeSelect.innerHTML = '<option value="">Select a type...</option>';

        ONLYWORLDS.ELEMENT_TYPES.forEach((type: ElementType) => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = ONLYWORLDS.ELEMENT_SINGULAR[type];
            typeSelect.appendChild(option);
        });
    }

    /**
     * Open the modal for creating a new element
     */
    createNewElement(): void {
        this.isEditMode = false;
        this.currentElement = null;

        const createBtn = document.getElementById('create-element-btn') as HTMLButtonElement;
        const preselectedType = createBtn?.dataset.elementType as ElementType || null;
        this.currentType = preselectedType;

        const form = document.getElementById('element-form') as HTMLFormElement;
        form?.reset();

        const container = document.getElementById('dynamic-fields-container');
        if (container) {
            container.innerHTML = '';
        }

        const typeSelect = document.getElementById('element-type') as HTMLSelectElement;
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

        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.textContent = title;
        }

        this.showModal();
    }

    /**
     * Populate the form with element data
     */
    populateForm(element: OnlyWorldsElement): void {
        const typeSelect = document.getElementById('element-type') as HTMLSelectElement;
        const nameInput = document.getElementById('element-name') as HTMLInputElement;
        const descInput = document.getElementById('element-description') as HTMLTextAreaElement;

        if (typeSelect) typeSelect.value = this.currentType || '';
        if (nameInput) nameInput.value = element.name || '';
        if (descInput) descInput.value = element.description || '';

        if (this.currentType) {
            this.generateDynamicFields(this.currentType, element);
        }
    }

    /**
     * Generate dynamic form fields based on element type
     * Currently disabled - inline editor handles field editing after creation
     */
    generateDynamicFields(elementType: ElementType, elementData: Partial<OnlyWorldsElement> = {}): void {
        const container = document.getElementById('dynamic-fields-container');
        if (!container) return;

        container.innerHTML = '';
        // Dynamic field generation disabled - use inline editor after creation
    }

    /**
     * Save the element (create or update)
     */
    async saveElement(): Promise<boolean> {
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
            let result: OnlyWorldsElement;

            if (this.isEditMode && this.currentElement && this.currentType) {
                const updates = { ...formData };
                delete updates.type;

                result = await this.api.updateElement(this.currentType, this.currentElement.id, updates);
                alert('Element updated successfully');

            } else {
                const elementData = { ...formData };
                const elementType = elementData.type as ElementType;
                delete elementData.type;

                result = await this.api.createElement(elementType, elementData);
            }

            this.hideModal();

            // Update viewer if available
            const viewer = window.elementViewer;
            if (viewer && viewer.currentCategory && (viewer.currentCategory === this.currentType || viewer.currentCategory === formData.type)) {
                await viewer.loadElements(viewer.currentCategory);

                // Auto-select the element (both for edit mode and new elements)
                await viewer.selectElement(result);
            }

            if (viewer) {
                viewer.updateCategoryCounts();
            }

            return true;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`Error saving element: ${errorMessage}`);
            console.error('Error saving element:', error);
            return false;
        }
    }

    /**
     * Get form data from the modal form
     */
    private getFormData(): FormData {
        const typeSelect = document.getElementById('element-type') as HTMLSelectElement;
        const nameInput = document.getElementById('element-name') as HTMLInputElement;
        const descInput = document.getElementById('element-description') as HTMLTextAreaElement;

        const formData: FormData = {
            type: typeSelect?.value || '',
            name: nameInput?.value?.trim() || '',
            description: descInput?.value?.trim() || ''
        };

        // Process dynamic fields
        const dynamicInputs = document.querySelectorAll('#dynamic-fields-container [data-field-type]') as NodeListOf<HTMLInputElement>;
        dynamicInputs.forEach((input: HTMLInputElement) => {
            const fieldName = input.name;
            const fieldType = input.getAttribute('data-field-type');

            if (!fieldName) return;

            let value: any;
            switch (fieldType) {
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
    private showModal(): void {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.remove('hidden');
        }

        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            if (this.isEditMode) {
                const nameInput = document.getElementById('element-name') as HTMLInputElement;
                nameInput?.focus();
            } else {
                const typeSelect = document.getElementById('element-type') as HTMLSelectElement;
                typeSelect?.focus();
            }
        }, 100);
    }

    /**
     * Hide the modal
     */
    private hideModal(): void {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.add('hidden');
        }

        document.body.style.overflow = '';

        this.currentElement = null;
        this.isEditMode = false;
        this.currentType = null;
    }

    /**
     * Attach event listeners
     */
    private attachEventListeners(): void {
        // Create element button
        const createBtn = document.getElementById('create-element-btn');
        createBtn?.addEventListener('click', () => {
            this.createNewElement();
        });

        // Modal close button
        const closeBtn = document.getElementById('modal-close');
        closeBtn?.addEventListener('click', () => {
            this.hideModal();
        });

        // Cancel button
        const cancelBtn = document.getElementById('cancel-btn');
        cancelBtn?.addEventListener('click', () => {
            this.hideModal();
        });

        // Form submission
        const form = document.getElementById('element-form') as HTMLFormElement;
        form?.addEventListener('submit', async (e: Event) => {
            e.preventDefault();
            await this.saveElement();
        });

        // Modal backdrop click
        const modal = document.getElementById('modal');
        modal?.addEventListener('click', (e: Event) => {
            if ((e.target as HTMLElement).id === 'modal') {
                this.hideModal();
            }
        });

        // Escape key
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            const modal = document.getElementById('modal');
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                this.hideModal();
            }
        });

        // Element type change
        const typeSelect = document.getElementById('element-type') as HTMLSelectElement;
        typeSelect?.addEventListener('change', async (e: Event) => {
            const target = e.target as HTMLSelectElement;
            const type = target.value as ElementType;

            if (type && !this.isEditMode) {
                this.generateDynamicFields(type);
            }
        });
    }

    // Getters for current state
    getCurrentElement(): OnlyWorldsElement | null {
        return this.currentElement;
    }

    getCurrentType(): ElementType | null {
        return this.currentType;
    }

    getIsEditMode(): boolean {
        return this.isEditMode;
    }
}