/**
 * Viewer Module (TypeScript)
 * Handles displaying elements in the UI with full type safety
 */

import { ONLYWORLDS } from './compatibility.js';
import OnlyWorldsAPI from './api.js';
import InlineEditorClass from './inline-editor.js';
import { router } from './router.js';
import { matchApiResult } from './types/api-result.js';
import { mapApiErrorToUiState, renderErrorState, UiErrorState } from './types/ui-error.js';

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

    init(): void {
        this.populateCategories();
        this.attachEventListeners();
    }

    clear(): void {
        this.currentCategory = null;
        this.currentElements = [];
        this.selectedElement = null;

        if (this.inlineEditor && typeof this.inlineEditor.cleanup === 'function') {
            this.inlineEditor.cleanup();
        }
    }

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
     * Uses parallel execution for all element types
     */
    async updateCategoryCounts(): Promise<void> {
        // Parallel execution for all element types
        const countPromises = ONLYWORLDS.ELEMENT_TYPES.map(async (type: ElementType) => {
            try {
                const result = await this.api.getElements(type);
                const countElement = document.getElementById(`count-${type}`);

                if (result.success) {
                    const elements = result.data;
                    if (countElement) {
                        requestAnimationFrame(() => {
                            countElement.textContent = elements.length.toString();
                        });
                    }
                    return elements.length;
                } else {
                    if (countElement) {
                        requestAnimationFrame(() => {
                            countElement.textContent = '?';
                        });
                    }
                    return 0;
                }
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

        await Promise.all(countPromises);
    }

    async selectCategory(type: ElementType): Promise<void> {
        document.querySelectorAll('.category-item').forEach((item) => {
            (item as HTMLElement).classList.remove('active');
        });

        const categoryElement = document.querySelector(`[data-type="${type}"]`);
        categoryElement?.classList.add('active');

        // Clear selected element and URL when switching categories
        // (unless we're already on this category, which happens during navigation)
        if (this.currentCategory !== type) {
            this.selectedElement = null;
            router.navigateToRoot();
        }

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

    async loadElements(type: ElementType): Promise<void> {
        const elementList = document.getElementById('element-list');
        if (!elementList) return;

        // Show loading state
        const loadingState: UiErrorState = {
            type: 'loading',
            message: `Loading ${(ONLYWORLDS.ELEMENT_LABELS as any)[type]}...`
        };
        renderErrorState(loadingState, elementList);

        // Define retry handler for error recovery
        const retryHandler = async (): Promise<void> => {
            await this.loadElements(type);
        };

        // Use the Result-based API with pattern matching for error handling
        const result = await this.api.getElements(type);

        matchApiResult(result, {
            success: (elements) => {
                this.currentElements = elements;

                if (elements.length === 0) {
                    const emptyState: UiErrorState = {
                        type: 'empty',
                        message: `No ${(ONLYWORLDS.ELEMENT_LABELS as any)[type].toLowerCase()} found in this world.`,
                        action: {
                            label: `Create ${ONLYWORLDS.ELEMENT_SINGULAR[type]}`,
                            handler: () => {
                                const createBtn = document.getElementById('create-element-btn') as HTMLButtonElement;
                                if (createBtn) {
                                    createBtn.dataset.elementType = type;
                                    createBtn.click();
                                }
                            }
                        }
                    };
                    renderErrorState(emptyState, elementList);
                } else {
                    // Success: display the elements
                    this.displayElements(elements);
                }
            },
            authError: (message) => {
                const errorState = mapApiErrorToUiState({ type: 'AUTHENTICATION_ERROR', message }, retryHandler);
                renderErrorState(errorState, elementList);
                console.error(`OnlyWorlds API Error [AUTHENTICATION_ERROR]:`, { message, elementType: type });
            },
            networkError: (message, statusCode) => {
                const errorState = mapApiErrorToUiState({ type: 'NETWORK_ERROR', message, statusCode }, retryHandler);
                renderErrorState(errorState, elementList);
                console.error(`OnlyWorlds API Error [NETWORK_ERROR]:`, { message, statusCode, elementType: type });
            },
            validationError: (field, message) => {
                const errorState = mapApiErrorToUiState({ type: 'VALIDATION_ERROR', field, message }, retryHandler);
                renderErrorState(errorState, elementList);
                console.error(`OnlyWorlds API Error [VALIDATION_ERROR]:`, { field, message, elementType: type });
            },
            notFound: (resourceType, resourceId) => {
                const errorState = mapApiErrorToUiState({ type: 'RESOURCE_NOT_FOUND', resourceType, resourceId }, retryHandler);
                renderErrorState(errorState, elementList);
                console.error(`OnlyWorlds API Error [RESOURCE_NOT_FOUND]:`, { resourceType, resourceId });
            },
            sdkError: (message, originalError) => {
                const errorState = mapApiErrorToUiState({ type: 'SDK_ERROR', message, originalError }, retryHandler);
                renderErrorState(errorState, elementList);
                console.error(`OnlyWorlds API Error [SDK_ERROR]:`, { message, originalError, elementType: type });
            },
            unknownError: (message, originalError) => {
                const errorState = mapApiErrorToUiState({ type: 'UNKNOWN_ERROR', message, originalError }, retryHandler);
                renderErrorState(errorState, elementList);
                console.error(`OnlyWorlds API Error [UNKNOWN_ERROR]:`, { message, originalError, elementType: type });
            }
        });
    }


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

    async selectElement(element: OnlyWorldsElement): Promise<void> {
        document.querySelectorAll('.element-card').forEach((card) => {
            (card as HTMLElement).classList.remove('selected');
        });

        const selectedCard = document.querySelector(`[data-id="${element.id}"]`);
        selectedCard?.classList.add('selected');

        this.selectedElement = element;

        // Update URL to reflect current selection
        if (this.currentCategory) {
            router.navigateToElement(this.currentCategory, element.id);
        }

        await this.displayElementDetails(element);
    }

    /**
     * Navigate to a specific element by type and ID (for deep linking)
     * @param elementType - Type of element to navigate to
     * @param elementId - ID of the element to select
     * @returns True if navigation successful, false if element not found
     */
    /**
     * Navigate to a specific element by type and ID (for deep linking)
     * Handles category switching and element fetching if not in current list
     */
    async navigateToElement(elementType: string, elementId: string): Promise<boolean> {
        try {
            // First, ensure we're on the correct category
            if (this.currentCategory !== elementType) {
                await this.selectCategory(elementType as ElementType);
            }

            // Wait a moment for category loading to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // Look for the element in current loaded elements
            let targetElement = this.currentElements.find(el => el.id === elementId);

            // If not found in current list, try to fetch it directly
            if (!targetElement) {
                console.log(`Element ${elementId} not found in current list, fetching directly...`);
                const fetchedElement = await this.api.getElement(elementType, elementId);

                if (!fetchedElement) {
                    console.warn(`Element ${elementType} ${elementId} not found`);
                    return false;
                }

                targetElement = fetchedElement as OnlyWorldsElement;

                // Add it to current elements if we fetched it
                this.currentElements.push(targetElement);

                // Re-render the element list to include the new element
                await this.displayElements(this.currentElements);
            }

            // Select the element
            await this.selectElement(targetElement);

            console.log(`Successfully navigated to ${elementType} ${elementId}`);
            return true;

        } catch (error) {
            console.error(`Error navigating to ${elementType} ${elementId}:`, error);
            return false;
        }
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

    async deleteElementWithConfirm(type: ElementType, id: string): Promise<void> {
        const element = this.currentElements.find((e: OnlyWorldsElement) => e.id === id);
        const name = element?.name || 'this element';

        if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
            return;
        }

        await this.deleteElement(type, id);
    }

    async deleteElement(type: ElementType, id: string): Promise<void> {
        if (!confirm('Are you sure you want to delete this element? This cannot be undone.')) {
            return;
        }

        try {
            await this.api.deleteElement(type, id);

            // Clear selected element and URL if we just deleted the current selection
            if (this.selectedElement && this.selectedElement.id === id) {
                this.selectedElement = null;
                router.navigateToRoot();
            }

            // Immediately update the UI to reflect the deletion
            await this.loadElements(type);

            const detailContainer = document.getElementById('element-detail');
            if (detailContainer) {
                detailContainer.innerHTML = '<p class="empty-state">Select an element to view details</p>';
            }

            const countElement = document.getElementById(`count-${type}`);
            if (countElement) {
                countElement.textContent = this.currentElements.length.toString();
            }

            // Show success message
            console.log(`Element deleted successfully: ${type} ${id}`);

        } catch (error) {
            // Handle 404 errors gracefully - element might already be deleted
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            if (errorMessage.includes('404') || errorMessage.includes('not found')) {
                // Element was already deleted, just update the UI
                console.log(`Element already deleted: ${type} ${id}`);
                await this.loadElements(type);

                const detailContainer = document.getElementById('element-detail');
                if (detailContainer) {
                    detailContainer.innerHTML = '<p class="empty-state">Select an element to view details</p>';
                }

                const countElement = document.getElementById(`count-${type}`);
                if (countElement) {
                    countElement.textContent = this.currentElements.length.toString();
                }
            } else {
                // Show error for other types of failures
                alert(`Error deleting element: ${errorMessage}`);
                console.error('Error deleting element:', error);
            }
        }
    }

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

    private escapeHtml(text: string): string {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

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