/**
 * Enhanced Relationship Editor for UUID Fields (TypeScript)
 * Provides inline editing with dropdown selector
 */

import { ONLYWORLDS, getFieldType, getRelationshipTarget } from './compatibility.js';
import type OnlyWorldsAPI from './api.js';

interface Element {
    id: string;
    name?: string;
    title?: string;
    description?: string;
    world?: string | { id: string };
    [key: string]: any;
}

interface InlineEditor {
    api: OnlyWorldsAPI;
    saveField(fieldName: string, value: any): Promise<boolean>;
}

type FieldType = 'uuid' | 'array<uuid>';

export default class RelationshipEditor {
    private api: OnlyWorldsAPI;
    private inlineEditor: InlineEditor;
    private elementCache = new Map<string, Element>();

    constructor(api: OnlyWorldsAPI, inlineEditor: InlineEditor) {
        this.api = api;
        this.inlineEditor = inlineEditor;
    }

    async createRelationshipField(
        container: HTMLElement,
        fieldName: string,
        value: any,
        fieldType: FieldType,
        currentElement: Element
    ): Promise<void> {
        container.innerHTML = '';
        container.className = 'relationship-field';

        let targetType = this.guessElementType(fieldName);

        // If we can't guess the type, try to find it dynamically by checking if the element exists
        if (!targetType && value) {
            const sampleId = Array.isArray(value) ? value[0] : value;
            if (typeof sampleId === 'string') {
                targetType = await (this.api as any).findElementTypeForId?.(sampleId) || null;
            }
        }

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
        container.dataset.targetType = targetType || '';
    }

    private async createElementTag(
        elementId: string,
        targetType: string | null,
        onRemove: () => Promise<void>
    ): Promise<HTMLDivElement> {
        const id = typeof elementId === 'object' && elementId !== null ? (elementId as any).id : elementId;
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

            if (!element && targetType) {
                const fetchedElement = await this.api.getElement(targetType, id);
                if (fetchedElement !== null) {
                    element = fetchedElement;
                    this.elementCache.set(cacheKey, element);
                } else {
                    // Element doesn't exist - handle as broken reference
                    console.warn(`Auto-removing broken reference: ${targetType} ${id}`);
                    onRemove();
                    return document.createElement('div'); // Return empty div that gets removed
                }
            }

            // Check if element is still null/undefined (cached null or other issue)
            if (!element) {
                // Auto-remove this broken reference
                console.warn(`Auto-removing broken reference: ${targetType} ${id}`);
                onRemove();
                return document.createElement('div'); // Return empty div that gets removed
            }

            elementName = element?.name || element?.title || 'Unnamed';
        } catch (error) {
            console.error(`Error loading relationship element ${targetType} ${id}:`, error);
            elementName = 'Not found';
            isValid = false;
            tag.classList.add('tag-invalid');
        }

        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-icons-outlined tag-icon';
        iconSpan.textContent = (ONLYWORLDS.ELEMENT_ICONS as any)[targetType || ''] || 'link';
        iconSpan.style.fontSize = '14px';
        iconSpan.style.marginRight = '4px';
        iconSpan.style.verticalAlign = 'middle';
        iconSpan.style.opacity = '0.7';
        tag.appendChild(iconSpan);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'tag-name';
        nameSpan.textContent = elementName;
        if (isValid && targetType) {
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

    private async showSelector(
        container: HTMLElement,
        fieldName: string,
        fieldType: FieldType,
        targetType: string,
        currentElement: Element
    ): Promise<void> {
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

        const loadElements = async (searchTerm: string = ''): Promise<void> => {
            results.innerHTML = '<div class="selector-loading">Loading...</div>';

            try {
                const result = await this.api.getElements(targetType);

                if (!result.success) {
                    results.innerHTML = '<div class="selector-error">Error loading elements</div>';
                    return;
                }

                let elements = result.data;

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
                    icon.textContent = (ONLYWORLDS.ELEMENT_ICONS as any)[targetType] || 'category';
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

        let searchTimeout: number;
        searchInput.oninput = () => {
            clearTimeout(searchTimeout);
            searchTimeout = window.setTimeout(() => {
                loadElements(searchInput.value);
            }, 300);
        };

        const closeSelector = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                selector.remove();
                document.removeEventListener('keydown', handleKeydown);
                document.removeEventListener('click', handleClickOutside);
            }
        };

        const handleKeydown = (e: KeyboardEvent) => closeSelector(e);

        const handleClickOutside = (e: MouseEvent) => {
            if (!selector.contains(e.target as Node) && !container.contains(e.target as Node)) {
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
    private async validateWorldReference(
        currentElement: Element,
        targetElement: Element,
        fieldName: string
    ): Promise<boolean> {
        let currentWorld = typeof currentElement.world === 'string'
            ? currentElement.world
            : currentElement.world?.id;
        const targetWorld = typeof targetElement.world === 'string'
            ? targetElement.world
            : targetElement.world?.id;

        if (!currentWorld) {
            try {
                currentWorld = await (this.inlineEditor.api as any).getWorldId();
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

    private async viewElement(elementId: string, targetType: string): Promise<void> {
        const elementViewer = (window as any).elementViewer;

        if (elementViewer && elementViewer.currentCategory === targetType) {
            const elementCard = document.querySelector(`[data-id="${elementId}"]`) as HTMLElement;
            if (elementCard) {
                elementCard.click();
                return;
            }
        }

        if (elementViewer) {
            await elementViewer.selectCategory(targetType);

            setTimeout(() => {
                const elementCard = document.querySelector(`[data-id="${elementId}"]`) as HTMLElement;
                if (elementCard) {
                    elementCard.click();
                } else {
                    this.api.getElement(targetType, elementId).then(element => {
                        if (element) {
                            elementViewer.selectElement(element);
                        }
                    }).catch(error => {
                        console.error('Could not load linked element:', error);
                    });
                }
            }, 500);
        }
    }

    private guessElementType(fieldName: string): string | null {
        return getRelationshipTarget(fieldName);
    }
}