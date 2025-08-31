/**
 * Enhanced Relationship Editor for UUID Fields
 * Provides inline editing with dropdown selector
 */

import { ONLYWORLDS } from './constants.js';
import { getFieldType, getRelationshipTarget } from './field-types.js';

export default class RelationshipEditor {
    constructor(api, inlineEditor) {
        this.api = api;
        this.inlineEditor = inlineEditor;
        this.elementCache = new Map();
    }
    
    /**
     * Create relationship field UI
     */
    async createRelationshipField(container, fieldName, value, fieldType, currentElement) {
        container.innerHTML = '';
        container.className = 'relationship-field';
        
        const targetType = this.guessElementType(fieldName);
        
        // Check if this is a generic UUID field with no specific target
        const isGenericUuid = !targetType && (fieldName === 'element_id' || getRelationshipTarget(fieldName) === null);
        
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'relationship-tags';
        container.appendChild(tagsContainer);
        
        // Display existing relationships
        if (fieldType === 'array<uuid>') {
            const values = Array.isArray(value) ? value : [];
            for (const item of values) {
                const id = typeof item === 'object' && item !== null ? item.id : item;
                if (!id) continue;
                
                const tag = await this.createElementTag(id, targetType, async () => {
                    const index = values.findIndex(v => 
                        (typeof v === 'object' && v !== null ? v.id : v) === id
                    );
                    if (index > -1) {
                        values.splice(index, 1);
                        currentElement[fieldName] = values;
                        
                        await this.inlineEditor.saveField(fieldName, values);
                        
                        await this.createRelationshipField(
                            container, 
                            fieldName, 
                            values,
                            fieldType, 
                            currentElement
                        );
                    }
                });
                tagsContainer.appendChild(tag);
            }
        } else if (value) {
            const id = typeof value === 'object' && value !== null ? value.id : value;
            if (!id) return;
            
            const tag = await this.createElementTag(id, targetType, async () => {
                currentElement[fieldName] = null;
                
                await this.inlineEditor.saveField(fieldName, null);
                
                await this.createRelationshipField(
                    container, 
                    fieldName, 
                    null,
                    fieldType, 
                    currentElement
                );
            });
            tagsContainer.appendChild(tag);
        }
        
        // Add button (only for valid target types and when appropriate)
        if (!isGenericUuid && targetType && (fieldType === 'array<uuid>' || !value)) {
            const addBtn = document.createElement('button');
            addBtn.className = 'btn-add-relationship';
            addBtn.innerHTML = '<span class="material-icons-outlined">add</span>';
            addBtn.title = `Add ${targetType}`;
            addBtn.onclick = (e) => {
                e.stopPropagation();
                this.showSelector(container, fieldName, fieldType, targetType, currentElement);
            };
            container.appendChild(addBtn);
        }
        
        // For generic UUID fields, show a note
        if (isGenericUuid) {
            const note = document.createElement('span');
            note.className = 'generic-uuid-note';
            note.textContent = '(Generic UUID - edit as text)';
            note.style.fontSize = '0.85em';
            note.style.color = '#666';
            note.style.marginLeft = '8px';
            container.appendChild(note);
        }
        
        container.dataset.fieldName = fieldName;
        container.dataset.fieldType = fieldType;
        container.dataset.targetType = targetType;
    }
    
    /**
     * Create element tag display
     */
    async createElementTag(elementId, targetType, onRemove) {
        const id = typeof elementId === 'object' && elementId !== null ? elementId.id : elementId;
        if (!id || typeof id !== 'string') {
            console.warn('Invalid element ID:', elementId);
            return document.createElement('div');
        }
        
        const tag = document.createElement('div');
        tag.className = 'element-tag';
        tag.dataset.elementId = id;
        
        let elementName = '...';
        let isValid = true;
        
        try {
            const cacheKey = `${targetType}_${id}`;
            let element = this.elementCache.get(cacheKey);
            
            if (!element) {
                element = await this.api.getElement(targetType, id);
                this.elementCache.set(cacheKey, element);
            }
            
            elementName = element.name || element.title || 'Unnamed';
        } catch (error) {
            elementName = 'Not found';
            isValid = false;
            tag.classList.add('tag-invalid');
        }
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-icons-outlined tag-icon';
        iconSpan.textContent = ONLYWORLDS.ELEMENT_ICONS[targetType] || 'link';
        iconSpan.style.fontSize = '14px';
        iconSpan.style.marginRight = '4px';
        iconSpan.style.verticalAlign = 'middle';
        iconSpan.style.opacity = '0.7';
        tag.appendChild(iconSpan);
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'tag-name';
        nameSpan.textContent = elementName;
        if (isValid) {
            nameSpan.onclick = (e) => {
                e.stopPropagation();
                this.viewElement(id, targetType);
            };
        }
        tag.appendChild(nameSpan);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'tag-remove';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            onRemove();
        };
        tag.appendChild(removeBtn);
        
        return tag;
    }
    
    /**
     * Show inline selector dropdown
     */
    async showSelector(container, fieldName, fieldType, targetType, currentElement) {
        const existingSelector = document.querySelector('.relationship-selector');
        if (existingSelector) {
            existingSelector.remove();
        }
        
        const selector = document.createElement('div');
        selector.className = 'relationship-selector';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '';
        searchInput.className = 'selector-search';
        selector.appendChild(searchInput);
        
        const results = document.createElement('div');
        results.className = 'selector-results';
        selector.appendChild(results);
        
        const rect = container.getBoundingClientRect();
        selector.style.position = 'absolute';
        selector.style.top = `${rect.bottom + 5}px`;
        selector.style.left = `${rect.left}px`;
        selector.style.zIndex = '1000';
        
        document.body.appendChild(selector);
        searchInput.focus();
        
        const loadElements = async (searchTerm = '') => {
            results.innerHTML = '<div class="selector-loading">Loading...</div>';
            
            try {
                let elements = await this.api.getElements(targetType);
                
                if (searchTerm) {
                    elements = elements.filter(el => 
                        el.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        el.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        el.description?.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }
                
                elements = elements.slice(0, 50);
                
                results.innerHTML = '';
                
                if (elements.length === 0) {
                    results.innerHTML = '<div class="selector-empty">No elements found</div>';
                    return;
                }
                
                const currentValues = fieldType === 'array<uuid>'
                    ? (currentElement[fieldName] || [])
                    : (currentElement[fieldName] ? [currentElement[fieldName]] : []);
                
                elements.forEach(element => {
                    const item = document.createElement('div');
                    item.className = 'selector-item';
                    
                    const isSelected = currentValues.includes(element.id);
                    if (isSelected) {
                        item.classList.add('selected');
                    }
                    
                    const icon = document.createElement('span');
                    icon.className = 'material-icons-outlined selector-icon';
                    icon.textContent = ONLYWORLDS.ELEMENT_ICONS[targetType] || 'category';
                    item.appendChild(icon);
                    
                    const name = document.createElement('span');
                    name.className = 'selector-name';
                    name.textContent = element.name || element.title || 'Unnamed';
                    item.appendChild(name);
                    
                    if (element.description) {
                        const desc = document.createElement('span');
                        desc.className = 'selector-desc';
                        desc.textContent = element.description.substring(0, 50) + '...';
                        item.appendChild(desc);
                    }
                    
                    item.onclick = async () => {
                        if (fieldType === 'array<uuid>') {
                            if (!isSelected) {
                                const values = currentElement[fieldName] || [];
                                values.push(element.id);
                                currentElement[fieldName] = values;
                                
                                if (!await this.validateWorldReference(currentElement, element, fieldName)) {
                                    return;
                                }
                                
                                await this.inlineEditor.saveField(fieldName, values);
                                
                                await this.createRelationshipField(
                                    container, 
                                    fieldName, 
                                    values, 
                                    fieldType, 
                                    currentElement
                                );
                            }
                        } else {
                            currentElement[fieldName] = element.id;
                            
                            if (!await this.validateWorldReference(currentElement, element, fieldName)) {
                                return;
                            }
                            
                            await this.inlineEditor.saveField(fieldName, element.id);
                            
                            await this.createRelationshipField(
                                container, 
                                fieldName, 
                                element.id, 
                                fieldType, 
                                currentElement
                            );
                        }
                        
                        selector.remove();
                    };
                    
                    results.appendChild(item);
                });
            } catch (error) {
                results.innerHTML = '<div class="selector-error">Error loading elements</div>';
                console.error('Error loading elements:', error);
            }
        };
        
        loadElements();
        
        let searchTimeout;
        searchInput.oninput = () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadElements(searchInput.value);
            }, 300);
        };
        
        const closeSelector = (e) => {
            if (e.key === 'Escape') {
                selector.remove();
                document.removeEventListener('keydown', handleKeydown);
                document.removeEventListener('click', handleClickOutside);
            }
        };
        
        const handleKeydown = (e) => closeSelector(e);
        
        const handleClickOutside = (e) => {
            if (!selector.contains(e.target) && !container.contains(e.target)) {
                selector.remove();
                document.removeEventListener('keydown', handleKeydown);
                document.removeEventListener('click', handleClickOutside);
            }
        };
        
        document.addEventListener('keydown', handleKeydown);
        setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 100);
    }
    
    /**
     * Validate world references to prevent cross-world links
     */
    async validateWorldReference(currentElement, targetElement, fieldName) {
        let currentWorld = typeof currentElement.world === 'string' 
            ? currentElement.world 
            : currentElement.world?.id;
        const targetWorld = typeof targetElement.world === 'string' 
            ? targetElement.world 
            : targetElement.world?.id;
        
        if (!currentWorld) {
            try {
                currentWorld = await this.inlineEditor.api.getWorldId();
                if (currentWorld) {
                    currentElement.world = currentWorld;
                }
            } catch (error) {
                console.error('Error retrieving world ID:', error);
            }
        }
        
        if (!currentWorld) {
            alert(`Warning: Current element is missing world information. Relationship update may fail.`);
            return false;
        } else if (!targetWorld) {
            alert(`Warning: Target element "${targetElement.name}" is missing world information. Relationship update may fail.`);
            return false;
        } else if (currentWorld !== targetWorld) {
            return confirm(`Warning: You're linking elements from different worlds!\n\nCurrent: ${currentElement.name} (world: ${currentWorld})\nTarget: ${targetElement.name} (world: ${targetWorld})\n\nThis will likely fail. Continue anyway?`);
        }
        
        return true;
    }
    
    /**
     * View element in detail
     */
    async viewElement(elementId, targetType) {
        if (window.elementViewer && window.elementViewer.currentCategory === targetType) {
            const elementCard = document.querySelector(`[data-id="${elementId}"]`);
            if (elementCard) {
                elementCard.click();
                return;
            }
        }
        
        if (window.elementViewer) {
            await window.elementViewer.selectCategory(targetType);
            
            setTimeout(() => {
                const elementCard = document.querySelector(`[data-id="${elementId}"]`);
                if (elementCard) {
                    elementCard.click();
                } else {
                    this.api.getElement(targetType, elementId).then(element => {
                        if (element) {
                            window.elementViewer.selectElement(element);
                        }
                    }).catch(error => {
                        console.error('Could not load linked element:', error);
                    });
                }
            }, 500);
        }
    }
    
    /**
     * Get exact element type from field name using authoritative schema
     */
    guessElementType(fieldName) {
        const target = getRelationshipTarget(fieldName);
        if (target) {
            return target.toLowerCase();
        }
        
        // Fallback to guessing logic for unknown fields
        let cleanName = fieldName.replace(/_ids?$/, '');
        
        if (ONLYWORLDS.ELEMENT_TYPES.includes(cleanName)) {
            return cleanName;
        }
        
        cleanName = cleanName.replace(/s$/, '');
        
        if (ONLYWORLDS.ELEMENT_TYPES.includes(cleanName)) {
            return cleanName;
        }
        
        return cleanName || 'character';
    }
}