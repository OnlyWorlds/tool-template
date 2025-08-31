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
        // Clear container
        container.innerHTML = '';
        container.className = 'relationship-field';
        
        // Determine target element type
        const targetType = this.guessElementType(fieldName);
        
        // Check if this is a generic UUID field (like Pin's element_id) with no specific target
        const isGenericUuid = !targetType && (fieldName === 'element_id' || getRelationshipTarget(fieldName) === null);
        
        // Create tags container
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'relationship-tags';
        container.appendChild(tagsContainer);
        
        // Display existing relationships
        if (fieldType === 'array<uuid>') {
            const values = Array.isArray(value) ? value : [];
            for (const item of values) {
                // Handle both ID strings and objects with id property
                const id = typeof item === 'object' && item !== null ? item.id : item;
                if (!id) continue; // Skip null/undefined values
                
                const tag = await this.createElementTag(id, targetType, async () => {
                    // Remove from array (find by ID)
                    const index = values.findIndex(v => 
                        (typeof v === 'object' && v !== null ? v.id : v) === id
                    );
                    if (index > -1) {
                        values.splice(index, 1);
                        currentElement[fieldName] = values;
                        
                        // Remove from array
                        
                        await this.inlineEditor.saveField(fieldName, values);
                        
                        // Refresh display to update tags
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
            // Handle both ID strings and objects with id property
            const id = typeof value === 'object' && value !== null ? value.id : value;
            if (!id) return; // Skip if no valid ID
            
            const tag = await this.createElementTag(id, targetType, async () => {
                // Clear single value
                currentElement[fieldName] = null;
                
                // Clear single value
                
                await this.inlineEditor.saveField(fieldName, null);
                
                // Refresh display to show add button
                await this.createRelationshipField(
                    container, 
                    fieldName, 
                    null,  // Pass null since field is now empty
                    fieldType, 
                    currentElement
                );
            });
            tagsContainer.appendChild(tag);
        }
        
        // Add button (only show if we have a valid target type and single value field is empty or always for arrays)
        // Don't show add button for generic UUID fields like Pin's element_id
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
        
        // For generic UUID fields, show a note that it should be edited directly
        if (isGenericUuid) {
            const note = document.createElement('span');
            note.className = 'generic-uuid-note';
            note.textContent = '(Generic UUID - edit as text)';
            note.style.fontSize = '0.85em';
            note.style.color = '#666';
            note.style.marginLeft = '8px';
            container.appendChild(note);
        }
        
        // Store metadata
        container.dataset.fieldName = fieldName;
        container.dataset.fieldType = fieldType;
        container.dataset.targetType = targetType;
    }
    
    /**
     * Create element tag display
     */
    async createElementTag(elementId, targetType, onRemove) {
        // Ensure we have a string ID
        const id = typeof elementId === 'object' && elementId !== null ? elementId.id : elementId;
        if (!id || typeof id !== 'string') {
            console.warn('Invalid element ID:', elementId);
            return document.createElement('div'); // Return empty div
        }
        
        const tag = document.createElement('div');
        tag.className = 'element-tag';
        tag.dataset.elementId = id;
        
        // Get element details
        let elementName = '...';
        let isValid = true;
        
        try {
            // Check cache first
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
        
        // Element name (clickable to view)
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
        
        // Remove button
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
        // Remove any existing selector
        const existingSelector = document.querySelector('.relationship-selector');
        if (existingSelector) {
            existingSelector.remove();
        }
        
        // Create selector dropdown
        const selector = document.createElement('div');
        selector.className = 'relationship-selector';
        
        // Create search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '';
        searchInput.className = 'selector-search';
        selector.appendChild(searchInput);
        
        // Create results container
        const results = document.createElement('div');
        results.className = 'selector-results';
        selector.appendChild(results);
        
        // Position below the add button
        const rect = container.getBoundingClientRect();
        selector.style.position = 'absolute';
        selector.style.top = `${rect.bottom + 5}px`;
        selector.style.left = `${rect.left}px`;
        selector.style.zIndex = '1000';
        
        document.body.appendChild(selector);
        searchInput.focus();
        
        // Load and display elements
        const loadElements = async (searchTerm = '') => {
            results.innerHTML = '<div class="selector-loading">Loading...</div>';
            
            try {
                let elements = await this.api.getElements(targetType);
                
                // Filter by search term
                if (searchTerm) {
                    elements = elements.filter(el => 
                        el.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        el.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        el.description?.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }
                
                // Limit display
                elements = elements.slice(0, 50);
                
                results.innerHTML = '';
                
                if (elements.length === 0) {
                    results.innerHTML = '<div class="selector-empty">No elements found</div>';
                    return;
                }
                
                // Get current values for highlighting
                const currentValues = fieldType === 'array<uuid>'
                    ? (currentElement[fieldName] || [])
                    : (currentElement[fieldName] ? [currentElement[fieldName]] : []);
                
                elements.forEach(element => {
                    const item = document.createElement('div');
                    item.className = 'selector-item';
                    
                    // Check if already selected
                    const isSelected = currentValues.includes(element.id);
                    if (isSelected) {
                        item.classList.add('selected');
                    }
                    
                    // Add icon
                    const icon = document.createElement('span');
                    icon.className = 'material-icons-outlined selector-icon';
                    icon.textContent = ONLYWORLDS.ELEMENT_ICONS[targetType] || 'category';
                    item.appendChild(icon);
                    
                    // Add name
                    const name = document.createElement('span');
                    name.className = 'selector-name';
                    name.textContent = element.name || element.title || 'Unnamed';
                    item.appendChild(name);
                    
                    // Add description preview
                    if (element.description) {
                        const desc = document.createElement('span');
                        desc.className = 'selector-desc';
                        desc.textContent = element.description.substring(0, 50) + '...';
                        item.appendChild(desc);
                    }
                    
                    // Click handler
                    item.onclick = async () => {
                        if (fieldType === 'array<uuid>') {
                            // Add to array if not already there
                            if (!isSelected) {
                                const values = currentElement[fieldName] || [];
                                values.push(element.id);
                                currentElement[fieldName] = values;
                                
                                // Add to array
                                
                                // Critical world validation - prevent cross-world references
                                let currentWorld = typeof currentElement.world === 'string' 
                                    ? currentElement.world 
                                    : currentElement.world?.id;
                                const targetWorld = typeof element.world === 'string' 
                                    ? element.world 
                                    : element.world?.id;
                                
                                // If current element doesn't have world field, try to get it
                                if (!currentWorld) {
                                    try {
                                        // Get the world from the API's getWorldId method
                                        currentWorld = await this.inlineEditor.api.getWorldId();
                                        if (currentWorld) {
                                            // Update the current element with world info for future use
                                            currentElement.world = currentWorld;
                                        } else {
                                            console.error('❌ [RelEditor] Could not retrieve world ID for validation');
                                        }
                                    } catch (error) {
                                        console.error('❌ [RelEditor] Error retrieving world ID:', error);
                                    }
                                }
                                
                                if (!currentWorld) {
                                    console.error('❌ [RelEditor] Current element missing world field and could not retrieve!', {
                                        currentElement: currentElement.id,
                                        currentWorld: currentElement.world
                                    });
                                    alert(`Warning: Current element is missing world information and could not be retrieved. Relationship update may fail.`);
                                } else if (!targetWorld) {
                                    console.error('❌ [RelEditor] Target element missing world field!', {
                                        targetElement: element.id,
                                        targetWorld: element.world
                                    });
                                    alert(`Warning: Target element "${element.name}" is missing world information. Relationship update may fail.`);
                                } else if (currentWorld !== targetWorld) {
                                    console.error('❌ [RelEditor] Cross-world reference detected!', {
                                        currentElement: currentElement.id,
                                        currentWorld,
                                        targetElement: element.id,
                                        targetWorld
                                    });
                                    if (!confirm(`Warning: You're linking elements from different worlds!\n\nCurrent: ${currentElement.name} (world: ${currentWorld})\nTarget: ${element.name} (world: ${targetWorld})\n\nThis will likely fail. Continue anyway?`)) {
                                        return; // User cancelled
                                    }
                                } else {
                                    // World validation passed
                                }
                                
                                await this.inlineEditor.saveField(fieldName, values);
                                
                                // Refresh display
                                await this.createRelationshipField(
                                    container, 
                                    fieldName, 
                                    values, 
                                    fieldType, 
                                    currentElement
                                );
                            }
                        } else {
                            // Replace single value
                            // Replace single value
                            
                            // Critical world validation - prevent cross-world references
                            let currentWorld = typeof currentElement.world === 'string' 
                                ? currentElement.world 
                                : currentElement.world?.id;
                            const targetWorld = typeof element.world === 'string' 
                                ? element.world 
                                : element.world?.id;
                            
                            // If current element doesn't have world field, try to get it
                            if (!currentWorld) {
                                try {
                                    // Get the world from the API's getWorldId method
                                    currentWorld = await this.inlineEditor.api.getWorldId();
                                    if (currentWorld) {
                                        // Update the current element with world info for future use
                                        currentElement.world = currentWorld;
                                    } else {
                                        console.error('❌ [RelEditor] Could not retrieve world ID for validation');
                                    }
                                } catch (error) {
                                    console.error('❌ [RelEditor] Error retrieving world ID:', error);
                                }
                            }
                            
                            if (!currentWorld) {
                                console.error('❌ [RelEditor] Current element missing world field and could not retrieve!', {
                                    currentElement: currentElement.id,
                                    currentWorld: currentElement.world
                                });
                                alert(`Warning: Current element is missing world information and could not be retrieved. Relationship update may fail.`);
                            } else if (!targetWorld) {
                                console.error('❌ [RelEditor] Target element missing world field!', {
                                    targetElement: element.id,
                                    targetWorld: element.world
                                });
                                alert(`Warning: Target element "${element.name}" is missing world information. Relationship update may fail.`);
                            } else if (currentWorld !== targetWorld) {
                                console.error('❌ [RelEditor] Cross-world reference detected!', {
                                    currentElement: currentElement.id,
                                    currentWorld,
                                    targetElement: element.id,
                                    targetWorld
                                });
                                if (!confirm(`Warning: You're linking elements from different worlds!\n\nCurrent: ${currentElement.name} (world: ${currentWorld})\nTarget: ${element.name} (world: ${targetWorld})\n\nThis will likely fail. Continue anyway?`)) {
                                    return; // User cancelled
                                }
                            } else {
                                // World validation passed
                            }
                            
                            currentElement[fieldName] = element.id;
                            await this.inlineEditor.saveField(fieldName, element.id);
                            
                            // Refresh display
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
        
        // Initial load
        loadElements();
        
        // Search on type
        let searchTimeout;
        searchInput.oninput = () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadElements(searchInput.value);
            }, 300);
        };
        
        // Close on escape or click outside
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
     * View element in detail
     */
    async viewElement(elementId, targetType) {
        // If the target type category is already selected, just select the element
        if (window.elementViewer && window.elementViewer.currentCategory === targetType) {
            // Find and click the element card
            const elementCard = document.querySelector(`[data-id="${elementId}"]`);
            if (elementCard) {
                elementCard.click();
                return;
            }
        }
        
        // Otherwise, load the category and then select the element
        if (window.elementViewer) {
            // First, select the category
            await window.elementViewer.selectCategory(targetType);
            
            // Wait a bit for the elements to load
            setTimeout(() => {
                const elementCard = document.querySelector(`[data-id="${elementId}"]`);
                if (elementCard) {
                    elementCard.click();
                } else {
                    // If element not in list, try to fetch and select it directly
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
        // Use the authoritative relationship target from field-types.js
        const target = getRelationshipTarget(fieldName);
        if (target) {
            return target.toLowerCase();
        }
        
        // Fallback to the old guessing logic for unknown fields
        // Remove _id or _ids suffix first
        let cleanName = fieldName.replace(/_ids?$/, '');
        
        // Direct matches (check before removing plural)
        if (ONLYWORLDS.ELEMENT_TYPES.includes(cleanName)) {
            return cleanName;
        }
        
        // Remove plural 's' at the end
        cleanName = cleanName.replace(/s$/, '');
        
        // Check again after removing plural
        if (ONLYWORLDS.ELEMENT_TYPES.includes(cleanName)) {
            return cleanName;
        }
        
        // Return best guess or fallback to 'character'
        return cleanName || 'character';
    }
}

// Export class for ES module use