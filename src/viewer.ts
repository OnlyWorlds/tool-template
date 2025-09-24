/**
 * Viewer Module (TypeScript)
 * Handles displaying elements in the UI with full type safety
 */

import { ONLYWORLDS } from './compatibility.js';
import OnlyWorldsAPI from './api.js';
import InlineEditorClass from './inline-editor.js';

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

// InlineEditor interface for compatibility
interface InlineEditorInterface {
    cleanup?(): void;
    initializeEditor?(element: OnlyWorldsElement, category: string, container: HTMLElement): void;
}

export default class ElementViewer {
    private api: OnlyWorldsAPI;
    private currentCategory: ElementType | null = null;
    private currentElements: OnlyWorldsElement[] = [];
    private selectedElement: OnlyWorldsElement | null = null;
    private inlineEditor?: InlineEditorInterface;

    constructor(apiService: OnlyWorldsAPI) {
        this.api = apiService;
    }

    /**
     * Initialize the viewer and populate categories
     */
    init(): void {
        this.populateCategories();
        this.attachEventListeners();
    }

    /**
     * Clear all cached data and reset the viewer
     */
    clear(): void {
        this.currentCategory = null;
        this.currentElements = [];
        this.selectedElement = null;

        if (this.inlineEditor && typeof this.inlineEditor.cleanup === 'function') {
            this.inlineEditor.cleanup();
        }
    }

    /**
     * Populate the category sidebar
     */
    populateCategories(): void {
        const categoryList = document.getElementById('category-list');
        if (!categoryList) return;

        categoryList.innerHTML = '';

        ONLYWORLDS.ELEMENT_TYPES.forEach((type: ElementType) => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.dataset.type = type;

            categoryItem.innerHTML = `
                <span class="category-icon material-icons-outlined">${(ONLYWORLDS.ELEMENT_ICONS as any)[type] || 'category'}</span>
                <span class="category-name">${ONLYWORLDS.ELEMENT_SINGULAR[type]}</span>
                <span class="category-count" id="count-${type}">-</span>
            `;

            categoryItem.addEventListener('click', () => this.selectCategory(type));
            categoryList.appendChild(categoryItem);
        });

        this.updateCategoryCounts();
    }

    /**
     * Update element counts for each category
     */
    async updateCategoryCounts(): Promise<void> {
        // Create all promises at once to ensure true parallel execution
        const countPromises = ONLYWORLDS.ELEMENT_TYPES.map(async (type: ElementType) => {
            try {
                const elements = await this.api.getElements(type);
                const countElement = document.getElementById(`count-${type}`);
                if (countElement) {
                    requestAnimationFrame(() => {
                        countElement.textContent = elements.length.toString();
                    });
                }
                return elements.length;
            } catch (error) {
                console.warn(`Could not get count for ${type}:`, error);
                const countElement = document.getElementById(`count-${type}`);
                if (countElement) {
                    requestAnimationFrame(() => {
                        countElement.textContent = '0';
                    });
                }
                return 0;
            }
        });

        // Wait for all to complete (they're still parallel)
        await Promise.all(countPromises);
    }

    /**
     * Select a category and load its elements
     */
    async selectCategory(type: ElementType): Promise<void> {
        document.querySelectorAll('.category-item').forEach((item) => {
            (item as HTMLElement).classList.remove('active');
        });

        const categoryElement = document.querySelector(`[data-type="${type}"]`);
        categoryElement?.classList.add('active');

        this.currentCategory = type;

        const listTitle = document.getElementById('list-title');
        if (listTitle) {
            listTitle.textContent = (ONLYWORLDS.ELEMENT_LABELS as any)[type];
        }

        const searchInput = document.getElementById('search-input');
        searchInput?.classList.remove('hidden');

        const createBtn = document.getElementById('create-element-btn');
        if (createBtn) {
            createBtn.classList.remove('hidden');
            createBtn.dataset.elementType = type;
        }

        await this.loadElements(type);
    }

    /**
     * Load elements for a category
     */
    async loadElements(type: ElementType): Promise<void> {
        const elementList = document.getElementById('element-list');
        if (!elementList) return;

        elementList.innerHTML = '<p class="loading-text">Loading...</p>';

        try {
            const elements = await this.api.getElements(type);
            this.currentElements = elements;

            if (elements.length === 0) {
                elementList.innerHTML = `<p class="empty-state">No ${(ONLYWORLDS.ELEMENT_LABELS as any)[type].toLowerCase()} found</p>`;
                return;
            }

            this.displayElements(elements);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            elementList.innerHTML = `<p class="error-text">Error loading ${type}s: ${errorMessage}</p>`;
            console.error('Error loading elements:', error);
        }
    }

    /**
     * Display a list of elements
     */
    displayElements(elements: OnlyWorldsElement[]): void {
        const elementList = document.getElementById('element-list');
        if (!elementList || !this.currentCategory) return;

        elementList.innerHTML = '';

        // Use DocumentFragment for batch DOM operations
        const fragment = document.createDocumentFragment();
        const icon = (ONLYWORLDS.ELEMENT_ICONS as any)[this.currentCategory] || 'category';

        elements.forEach((element: OnlyWorldsElement) => {
            const elementCard = document.createElement('div');
            elementCard.className = 'element-card';
            elementCard.dataset.id = element.id;

            const supertype = element.supertype ? `<span class="element-supertype">${element.supertype}</span>` : '';
            const displayName = element.name || element.title || `Unnamed ${this.currentCategory}`;

            elementCard.innerHTML = `
                <div class="element-header">
                    <span class="element-icon material-icons-outlined">${icon}</span>
                    <div class="element-info">
                        <h3 class="element-name">${this.escapeHtml(displayName)}</h3>
                        ${supertype}
                    </div>
                </div>
                ${element.description ? `<p class="element-description">${this.escapeHtml(element.description)}</p>` : ''}
            `;

            elementCard.addEventListener('click', () => this.selectElement(element));
            fragment.appendChild(elementCard);
        });

        elementList.appendChild(fragment);
    }

    /**
     * Select and display an element's details
     */
    async selectElement(element: OnlyWorldsElement): Promise<void> {
        document.querySelectorAll('.element-card').forEach((card) => {
            (card as HTMLElement).classList.remove('selected');
        });

        const selectedCard = document.querySelector(`[data-id="${element.id}"]`);
        selectedCard?.classList.add('selected');

        this.selectedElement = element;

        await this.displayElementDetails(element);
    }

    /**
     * Display detailed view of an element with inline editing
     */
    async displayElementDetails(element: OnlyWorldsElement): Promise<void> {
        const detailContainer = document.getElementById('element-detail');
        if (!detailContainer || !this.currentCategory) return;

        if (!this.inlineEditor) {
            this.inlineEditor = new InlineEditorClass(this.api);
        }

        if (typeof this.inlineEditor.cleanup === 'function') {
            this.inlineEditor.cleanup();
        }

        if (typeof this.inlineEditor.initializeEditor === 'function') {
            this.inlineEditor.initializeEditor(element, this.currentCategory, detailContainer);
        }
    }

    /**
     * Delete element with confirmation
     */
    async deleteElementWithConfirm(type: ElementType, id: string): Promise<void> {
        const element = this.currentElements.find((e: OnlyWorldsElement) => e.id === id);
        const name = element?.name || 'this element';

        if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
            return;
        }

        await this.deleteElement(type, id);
    }

    /**
     * Delete an element after confirmation
     */
    async deleteElement(type: ElementType, id: string): Promise<void> {
        if (!confirm('Are you sure you want to delete this element? This cannot be undone.')) {
            return;
        }

        try {
            await this.api.deleteElement(type, id);

            await this.loadElements(type);

            const detailContainer = document.getElementById('element-detail');
            if (detailContainer) {
                detailContainer.innerHTML = '<p class="empty-state">Select an element to view details</p>';
            }

            const countElement = document.getElementById(`count-${type}`);
            if (countElement) {
                countElement.textContent = this.currentElements.length.toString();
            }

            alert('Element deleted successfully');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`Error deleting element: ${errorMessage}`);
            console.error('Error deleting element:', error);
        }
    }

    /**
     * Search elements in the current category
     */
    async searchElements(searchTerm: string): Promise<void> {
        if (!this.currentCategory) return;

        if (!searchTerm) {
            await this.loadElements(this.currentCategory);
            return;
        }

        // Filter current elements locally for quick response
        const filtered = this.currentElements.filter((element: OnlyWorldsElement) =>
            element.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            element.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            element.supertype?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        this.displayElements(filtered);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners(): void {
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        let searchTimeout: ReturnType<typeof setTimeout>;

        searchInput?.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchElements(target.value);
            }, 300);
        });
    }

    /**
     * Escape HTML to prevent XSS
     */
    private escapeHtml(text: string): string {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format date for display
     */
    formatDate(dateString: string): string {
        if (!dateString) return 'Unknown';
        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        } catch {
            return dateString;
        }
    }

    // Getters for current state
    getCurrentCategory(): ElementType | null {
        return this.currentCategory;
    }

    getCurrentElements(): OnlyWorldsElement[] {
        return this.currentElements;
    }

    getSelectedElement(): OnlyWorldsElement | null {
        return this.selectedElement;
    }
}