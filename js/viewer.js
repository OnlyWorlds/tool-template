/**
 * Viewer Module
 * Handles displaying elements in the UI
 */

import { ONLYWORLDS } from './constants.js';
import InlineEditor from './inline-editor.js';

export default class ElementViewer {
    constructor(apiService) {
        this.api = apiService;
        this.currentCategory = null;
        this.currentElements = [];
        this.selectedElement = null;
    }
    
    /**
     * Initialize the viewer and populate categories
     */
    init() {
        this.populateCategories();
        this.attachEventListeners();
    }
    
    /**
     * Clear all cached data and reset the viewer
     */
    clear() {
        this.currentCategory = null;
        this.currentElements = [];
        this.selectedElement = null;
        
        if (this.inlineEditor && this.inlineEditor.cleanup) {
            this.inlineEditor.cleanup();
        }
    }
    
    /**
     * Populate the category sidebar
     */
    populateCategories() {
        const categoryList = document.getElementById('category-list');
        categoryList.innerHTML = '';
        
        ONLYWORLDS.ELEMENT_TYPES.forEach(type => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.dataset.type = type;
            
            categoryItem.innerHTML = `
                <span class="category-icon material-icons-outlined">${ONLYWORLDS.ELEMENT_ICONS[type]}</span>
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
    async updateCategoryCounts() {
        // Create all promises at once to ensure true parallel execution
        const countPromises = ONLYWORLDS.ELEMENT_TYPES.map((type) => 
            this.api.getElements(type)
                .then(elements => {
                    const countElement = document.getElementById(`count-${type}`);
                    if (countElement) {
                        requestAnimationFrame(() => {
                            countElement.textContent = elements.length;
                        });
                    }
                    return elements.length;
                })
                .catch(error => {
                    console.warn(`Could not get count for ${type}:`, error);
                    const countElement = document.getElementById(`count-${type}`);
                    if (countElement) {
                        requestAnimationFrame(() => {
                            countElement.textContent = '0';
                        });
                    }
                    return 0;
                })
        );
        
        // Wait for all to complete (they're still parallel)
        await Promise.all(countPromises);
    }
    
    /**
     * Select a category and load its elements
     * @param {string} type - Element type to select
     */
    async selectCategory(type) {
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`)?.classList.add('active');
        
        this.currentCategory = type;
        
        document.getElementById('list-title').textContent = ONLYWORLDS.ELEMENT_LABELS[type];
        
        document.getElementById('search-input').classList.remove('hidden');
        
        const createBtn = document.getElementById('create-element-btn');
        if (createBtn) {
            createBtn.classList.remove('hidden');
            createBtn.dataset.elementType = type;
        }
        
        await this.loadElements(type);
    }
    
    /**
     * Load elements for a category
     * @param {string} type - Element type to load
     */
    async loadElements(type) {
        const elementList = document.getElementById('element-list');
        
        elementList.innerHTML = '<p class="loading-text">Loading...</p>';
        
        try {
            const elements = await this.api.getElements(type);
            this.currentElements = elements;
            
            if (elements.length === 0) {
                elementList.innerHTML = `<p class="empty-state">No ${ONLYWORLDS.ELEMENT_LABELS[type].toLowerCase()} found</p>`;
                return;
            }
            
            this.displayElements(elements);
            
        } catch (error) {
            elementList.innerHTML = `<p class="error-text">Error loading ${type}s: ${error.message}</p>`;
            console.error('Error loading elements:', error);
        }
    }
    
    /**
     * Display a list of elements
     * @param {Array} elements - Elements to display
     */
    displayElements(elements) {
        const elementList = document.getElementById('element-list');
        elementList.innerHTML = '';
        
        // Use DocumentFragment for batch DOM operations
        const fragment = document.createDocumentFragment();
        const icon = ONLYWORLDS.ELEMENT_ICONS[this.currentCategory] || 'category';
        
        elements.forEach(element => {
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
     * @param {Object} element - Element to display
     */
    async selectElement(element) {
        document.querySelectorAll('.element-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-id="${element.id}"]`)?.classList.add('selected');
        
        this.selectedElement = element;
        
        await this.displayElementDetails(element);
    }
    
    /**
     * Display detailed view of an element with inline editing
     * @param {Object} element - Element to display in detail
     */
    async displayElementDetails(element) {
        const detailContainer = document.getElementById('element-detail');
        
        if (!this.inlineEditor) {
            this.inlineEditor = new InlineEditor(this.api);
        }
        
        this.inlineEditor.cleanup();
        
        this.inlineEditor.initializeEditor(element, this.currentCategory, detailContainer);
    }
    
    /**
     * Delete element with confirmation
     * @param {string} type - Element type
     * @param {string} id - Element ID
     */
    async deleteElementWithConfirm(type, id) {
        const element = this.currentElements.find(e => e.id === id);
        const name = element?.name || 'this element';
        
        if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
            return;
        }
        
        await this.deleteElement(type, id);
    }
    
    /**
     * Delete an element after confirmation
     * @param {string} type - Element type
     * @param {string} id - Element ID
     */
    async deleteElement(type, id) {
        if (!confirm('Are you sure you want to delete this element? This cannot be undone.')) {
            return;
        }
        
        try {
            await this.api.deleteElement(type, id);
            
            await this.loadElements(type);
            
            document.getElementById('element-detail').innerHTML = '<p class="empty-state">Select an element to view details</p>';
            
            const countElement = document.getElementById(`count-${type}`);
            if (countElement) {
                countElement.textContent = this.currentElements.length;
            }
            
            alert('Element deleted successfully');
            
        } catch (error) {
            alert(`Error deleting element: ${error.message}`);
            console.error('Error deleting element:', error);
        }
    }
    
    /**
     * Search elements in the current category
     * @param {string} searchTerm - Search term
     */
    async searchElements(searchTerm) {
        if (!this.currentCategory) return;
        
        if (!searchTerm) {
            await this.loadElements(this.currentCategory);
            return;
        }
        
        // Filter current elements locally for quick response
        const filtered = this.currentElements.filter(element => 
            element.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            element.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            element.supertype?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.displayElements(filtered);
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const searchInput = document.getElementById('search-input');
        let searchTimeout;
        
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchElements(e.target.value);
            }, 300);
        });
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        } catch {
            return dateString;
        }
    }
}