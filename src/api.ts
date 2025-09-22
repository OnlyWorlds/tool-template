/**
 * API Service Module (TypeScript + @onlyworlds/sdk)
 * Handles all CRUD operations with the OnlyWorlds API using the official SDK
 *
 * Converted from manual fetch calls to SDK-based operations while maintaining
 * the same interface for UI compatibility.
 */

import { OnlyWorldsClient } from '@onlyworlds/sdk';
import { authManager } from './auth.js';

// Dynamic element types - extracted from SDK at runtime
let _cachedElementTypes: string[] | null = null;

type ElementType = string;

// Basic element interface (all elements share these fields)
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

// Generic element interface with flexible additional fields
interface Element extends BaseElement {
    [key: string]: any;
}

export default class OnlyWorldsAPI {
    private cache = new Map<string, Element>();
    private worldId: string | null = null;

    /**
     * Get the SDK client from auth manager
     */
    private getClient(): OnlyWorldsClient {
        return authManager.getClient();
    }

    /**
     * Dynamically extract available element types from the SDK client
     */
    getElementTypes(): string[] {
        if (_cachedElementTypes) {
            return _cachedElementTypes;
        }

        try {
            const client = this.getClient();

            // Extract resource names from the SDK client object
            const resourceNames = Object.keys(client).filter(key => {
                // Filter out non-resource properties (methods, private props, etc.)
                const value = (client as any)[key];
                return value && typeof value === 'object' &&
                       typeof value.list === 'function' &&
                       typeof value.get === 'function' &&
                       typeof value.create === 'function';
            });

            // Convert plural resource names back to singular element types
            const elementTypes = resourceNames.map(resourceName => {
                // Handle irregular plurals
                const irregularSingulars: Record<string, string> = {
                    'abilities': 'ability',
                    'families': 'family',
                    'phenomena': 'phenomenon',
                    'species': 'species' // same for both
                };

                if (irregularSingulars[resourceName]) {
                    return irregularSingulars[resourceName];
                }

                // Regular depluralization - remove 's' if it ends with 's'
                return resourceName.endsWith('s') && resourceName.length > 1
                    ? resourceName.slice(0, -1)
                    : resourceName;
            });

            _cachedElementTypes = elementTypes.sort();
            return _cachedElementTypes;

        } catch (error) {
            console.warn('Could not extract element types from SDK, using fallback:', error);

            // Fallback to hardcoded list if SDK introspection fails
            const fallbackTypes = [
                'ability', 'character', 'collective', 'construct', 'creature', 'event',
                'family', 'institution', 'language', 'law', 'location', 'map', 'marker',
                'narrative', 'object', 'phenomenon', 'pin', 'relation', 'species',
                'title', 'trait', 'zone'
            ];

            _cachedElementTypes = fallbackTypes;
            return _cachedElementTypes;
        }
    }

    /**
     * Convert singular element type to proper plural resource name
     */
    private getResourceName(elementType: string): string {
        // Handle irregular plurals
        const irregularPlurals: Record<string, string> = {
            'ability': 'abilities',
            'family': 'families',
            'phenomenon': 'phenomena',
            'species': 'species' // species is both singular and plural
        };

        if (irregularPlurals[elementType]) {
            return irregularPlurals[elementType];
        }

        // Regular pluralization - just add 's'
        return elementType + 's';
    }

    /**
     * Generate a UUIDv7 (time-ordered UUID)
     * @returns A UUID string
     */
    generateId(): string {
        const timestamp = Date.now();
        const timestampHex = timestamp.toString(16).padStart(12, '0');

        const randomBytes = new Uint8Array(10);
        crypto.getRandomValues(randomBytes);

        const randomHex = Array.from(randomBytes, byte =>
            byte.toString(16).padStart(2, '0')
        ).join('');

        // Format as UUID v7: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
        const uuid = [
            timestampHex.substring(0, 8),
            timestampHex.substring(8, 12),
            '7' + randomHex.substring(0, 3),
            ((parseInt(randomHex.substring(3, 5), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + randomHex.substring(5, 7),
            randomHex.substring(7, 19)
        ].join('-');

        return uuid;
    }

    /**
     * Fetch all elements of a specific type
     * @param elementType - Type of element (e.g., 'character', 'location')
     * @param filters - Optional filters (e.g., { supertype: 'protagonist' })
     * @returns Array of elements
     */
    async getElements(elementType: ElementType | string, filters: Record<string, any> = {}): Promise<Element[]> {
        if (!authManager.checkAuth()) {
            throw new Error('Not authenticated');
        }

        if (!this.getElementTypes().includes(elementType)) {
            throw new Error(`Invalid element type: ${elementType}. Available types: ${this.getElementTypes().join(', ')}`);
        }

        try {
            const client = this.getClient();
            // Convert singular element type to proper plural resource name
            const resourceName = this.getResourceName(elementType);
            const resource = (client as any)[resourceName];

            if (!resource) {
                throw new Error(`Resource ${resourceName} not available in SDK`);
            }

            // Use SDK to fetch elements
            let elements: Element[];

            if (Object.keys(filters).length > 0) {
                // SDK might support filtering, or we'll filter manually
                elements = await resource.list();

                // Apply filters manually for now
                elements = elements.filter((element: Element) => {
                    return Object.entries(filters).every(([key, value]) => {
                        if (value === null || value === undefined) return true;

                        if (key === 'name__icontains') {
                            return element.name?.toLowerCase().includes(value.toLowerCase());
                        }

                        return element[key] === value;
                    });
                });
            } else {
                elements = await resource.list();
            }

            // Process and cache elements
            const processedElements = elements.map((element: Element) => {
                // Cache world ID from first element that has it
                if (!this.worldId && element.world) {
                    this.worldId = typeof element.world === 'string'
                        ? element.world
                        : (element.world as any).id;
                }

                // Ensure world field is present and in correct format
                if (!element.world) {
                    const currentWorld = authManager.getCurrentWorld();
                    if (currentWorld) {
                        element.world = currentWorld.id;
                    }
                } else if (typeof element.world === 'object' && (element.world as any).id) {
                    element.world = (element.world as any).id;
                }

                // Cache the element
                const cacheKey = `${elementType}_${element.id}`;
                this.cache.set(cacheKey, element);

                return element;
            });

            return processedElements;

        } catch (error) {
            console.error(`Error fetching ${elementType}s:`, error);
            throw error;
        }
    }

    /**
     * Fetch a single element by ID
     * @param elementType - Type of element
     * @param elementId - ID of the element
     * @returns The element object
     */
    async getElement(elementType: ElementType | string, elementId: string): Promise<Element | null> {
        if (!authManager.checkAuth()) {
            throw new Error('Not authenticated');
        }

        const cacheKey = `${elementType}_${elementId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        try {
            const client = this.getClient();
            // Convert singular element type to proper plural resource name
            const resourceName = this.getResourceName(elementType);
            const resource = (client as any)[resourceName];

            if (!resource) {
                throw new Error(`Resource ${resourceName} not available in SDK`);
            }

            // Wrap SDK call in additional try-catch to handle 404s gracefully
            let element;
            try {
                element = await resource.get(elementId);
            } catch (sdkError) {
                // Check for 404 at SDK level
                const errorMessage = (sdkError as any)?.message || '';
                const errorStatus = (sdkError as any)?.status;
                const is404 = errorStatus === 404 ||
                             errorMessage.includes('404') ||
                             errorMessage.includes('not found') ||
                             errorMessage.includes('Not found');

                if (is404) {
                    // Return null to indicate element doesn't exist
                    return null;
                }
                throw sdkError; // Re-throw non-404 errors
            }

            this.cache.set(cacheKey, element);
            return element;

        } catch (error) {
            console.error(`Error fetching ${elementType} ${elementId}:`, error);
            throw error;
        }
    }

    /**
     * Create a new element
     * @param elementType - Type of element to create
     * @param elementData - The element data
     * @returns The created element
     */
    async createElement(elementType: ElementType | string, elementData: Partial<Element>): Promise<Element> {
        if (!authManager.checkAuth()) {
            throw new Error('Not authenticated');
        }

        if (!elementData.name) {
            throw new Error('Element name is required');
        }

        // Ensure world field is present
        if (!elementData.world) {
            const currentWorld = authManager.getCurrentWorld();
            if (currentWorld) {
                elementData.world = currentWorld.id;
            } else {
                throw new Error('Cannot create element without world ID');
            }
        }

        // Generate ID if not provided
        if (!elementData.id) {
            elementData.id = this.generateId();
        }

        try {
            const client = this.getClient();
            // Convert singular element type to proper plural resource name
            const resourceName = this.getResourceName(elementType);
            const resource = (client as any)[resourceName];

            if (!resource) {
                throw new Error(`Resource ${resourceName} not available in SDK`);
            }

            // Clean the data before sending
            const cleanedData = this.cleanElementData(elementData);
            const createdElement = await resource.create(cleanedData);

            // Cache the created element
            const cacheKey = `${elementType}_${createdElement.id}`;
            this.cache.set(cacheKey, createdElement);

            return createdElement;

        } catch (error) {
            console.error(`Error creating ${elementType}:`, error);
            throw error;
        }
    }

    /**
     * Update an existing element
     * @param elementType - Type of element
     * @param elementId - ID of the element to update
     * @param updates - The fields to update
     * @returns The updated element
     */
    async updateElement(elementType: ElementType | string, elementId: string, updates: Partial<Element>): Promise<Element> {
        if (!authManager.checkAuth()) {
            throw new Error('Not authenticated');
        }

        try {
            const client = this.getClient();
            // Convert singular element type to proper plural resource name
            const resourceName = this.getResourceName(elementType);
            const resource = (client as any)[resourceName];

            if (!resource) {
                throw new Error(`Resource ${resourceName} not available in SDK`);
            }

            // Get current element to merge with updates
            const currentElement = await this.getElement(elementType, elementId);

            if (!currentElement) {
                throw new Error(`Element ${elementType} ${elementId} not found`);
            }

            // Ensure world field is present
            if (!currentElement.world || typeof currentElement.world === 'object') {
                if (currentElement.world && (currentElement.world as any).id) {
                    currentElement.world = (currentElement.world as any).id;
                } else {
                    const currentWorld = authManager.getCurrentWorld();
                    if (currentWorld) {
                        currentElement.world = currentWorld.id;
                    }
                }
            }

            const updatedElement = { ...currentElement, ...updates };
            const cleanedElement = this.cleanElementData(updatedElement);

            const result = await resource.update(elementId, cleanedElement);

            // Update cache
            const cacheKey = `${elementType}_${elementId}`;
            this.cache.set(cacheKey, result);

            return result;

        } catch (error) {
            console.error(`Error updating ${elementType} ${elementId}:`, error);
            throw error;
        }
    }

    /**
     * Delete an element
     * @param elementType - Type of element
     * @param elementId - ID of the element to delete
     * @returns Success status
     */
    async deleteElement(elementType: ElementType | string, elementId: string): Promise<boolean> {
        if (!authManager.checkAuth()) {
            throw new Error('Not authenticated');
        }

        try {
            const client = this.getClient();
            // Convert singular element type to proper plural resource name
            const resourceName = this.getResourceName(elementType);
            const resource = (client as any)[resourceName];

            if (!resource) {
                throw new Error(`Resource ${resourceName} not available in SDK`);
            }

            await resource.delete(elementId);

            // Remove from cache
            const cacheKey = `${elementType}_${elementId}`;
            this.cache.delete(cacheKey);

            return true;

        } catch (error) {
            console.error(`Error deleting ${elementType} ${elementId}:`, error);
            throw error;
        }
    }

    /**
     * Search elements by name
     * @param elementType - Type of element
     * @param searchTerm - Search term
     * @returns Matching elements
     */
    async searchElements(elementType: ElementType | string, searchTerm: string): Promise<Element[]> {
        if (!searchTerm || searchTerm.length < 2) {
            return [];
        }

        return this.getElements(elementType, {
            name__icontains: searchTerm
        });
    }

    /**
     * Clean element data before sending to API
     * Converts object references to just IDs and handles special fields
     * @param element - Element with potential object references
     * @returns Cleaned element with ID strings instead of objects
     */
    private cleanElementData(element: Partial<Element>): any {
        const cleaned: any = {};
        const skipFields = ['created_at', 'updated_at'];

        for (const [fieldName, value] of Object.entries(element)) {
            if (skipFields.includes(fieldName)) {
                continue;
            }

            // Special handling for world field
            if (fieldName === 'world') {
                if (typeof value === 'object' && value !== null && (value as any).id) {
                    cleaned[fieldName] = (value as any).id;
                } else if (typeof value === 'string' && value) {
                    cleaned[fieldName] = value;
                } else {
                    cleaned[fieldName] = null;
                }
                continue;
            }

            // Handle relationship fields (objects with id or arrays of objects with id)
            if (this.isLinkField(fieldName, value)) {
                if (Array.isArray(value)) {
                    const cleanedIds = value.map(item => {
                        if (typeof item === 'object' && item !== null && (item as any).id) {
                            return (item as any).id;
                        }
                        return item;
                    }).filter(id => id);

                    const apiFieldName = fieldName.endsWith('_ids') ? fieldName : `${fieldName}_ids`;
                    cleaned[apiFieldName] = cleanedIds;
                } else if (typeof value === 'object' && value !== null && (value as any).id) {
                    const apiFieldName = fieldName.endsWith('_id') ? fieldName : `${fieldName}_id`;
                    cleaned[apiFieldName] = (value as any).id;
                } else if (typeof value === 'string' && value) {
                    // Single UUID string
                    const apiFieldName = fieldName.endsWith('_id') ? fieldName : `${fieldName}_id`;
                    cleaned[apiFieldName] = value;
                } else if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
                    // Array of UUID strings
                    const apiFieldName = fieldName.endsWith('_ids') ? fieldName : `${fieldName}_ids`;
                    cleaned[apiFieldName] = value.filter(id => id);
                } else {
                    cleaned[fieldName] = value;
                }
            } else {
                cleaned[fieldName] = value;
            }
        }

        return cleaned;
    }

    /**
     * Check if a field is a link/relationship field
     * @param fieldName - Name of the field
     * @param value - Value of the field
     * @returns True if field is a relationship
     */
    private isLinkField(fieldName: string, value: any): boolean {
        // Check if value looks like a relationship (object with id or array of objects with id)
        if (typeof value === 'object' && value !== null && (value as any).id) {
            return true;
        }

        if (Array.isArray(value) && value.length > 0 &&
            typeof value[0] === 'object' && value[0] !== null && (value[0] as any).id) {
            return true;
        }

        // Check field name patterns that suggest relationships
        const relationshipPatterns = [
            '_id', '_ids', 'location', 'character', 'ability', 'trait', 'species',
            'language', 'institution', 'family', 'world', 'map', 'zone'
        ];

        return relationshipPatterns.some(pattern => fieldName.includes(pattern));
    }

    /**
     * Get the world ID from cache or auth manager
     */
    async getWorldId(): Promise<string | null> {
        if (this.worldId) {
            return this.worldId;
        }

        const currentWorld = authManager.getCurrentWorld();
        if (currentWorld) {
            this.worldId = currentWorld.id;
            return this.worldId;
        }

        // Try to find world ID from any cached element
        for (const [key, value] of this.cache.entries()) {
            if (value && value.world) {
                if (typeof value.world === 'string') {
                    this.worldId = value.world;
                    return this.worldId;
                } else if ((value.world as any).id) {
                    this.worldId = (value.world as any).id;
                    return this.worldId;
                }
            }
        }

        console.error('Could not find world ID');
        return null;
    }

    /**
     * Clear the cache
     */
    clearCache(): void {
        this.cache.clear();
        this.worldId = null;
    }

    /**
     * Clean broken references from an element's fields
     * @param element - Element to clean
     * @param elementType - Type of the element
     * @returns Updated element with broken references removed
     */
    async cleanBrokenReferences(element: Element, elementType: string): Promise<Element> {
        const cleanedElement = { ...element };
        let hasChanges = false;

        for (const [fieldName, value] of Object.entries(element)) {
            if (!value) continue;

            // Handle single UUID fields
            if (typeof value === 'string' && this.isLinkField(fieldName, value)) {
                let targetType = this.guessTargetType(fieldName);

                // If we can't guess, try all element types to find which one works
                if (!targetType) {
                    targetType = await this.findElementTypeForId(value);
                }

                if (targetType) {
                    const referencedElement = await this.getElement(targetType, value);
                    if (referencedElement === null) {
                        console.warn(`Cleaning broken reference: ${fieldName} -> ${targetType} ${value}`);
                        cleanedElement[fieldName] = null;
                        hasChanges = true;
                    }
                } else {
                    // Can't determine type and element doesn't exist anywhere
                    console.warn(`Cleaning unresolvable reference: ${fieldName} -> ${value}`);
                    cleanedElement[fieldName] = null;
                    hasChanges = true;
                }
            }

            // Handle array of UUIDs
            if (Array.isArray(value) && value.length > 0) {
                const firstItem = value[0];
                if (typeof firstItem === 'string' && firstItem.match(/^[0-9a-f-]{36}$/i)) {
                    let targetType = this.guessTargetType(fieldName);

                    // If we can't guess, try to find type from the first valid element
                    if (!targetType && value.length > 0) {
                        for (const id of value) {
                            targetType = await this.findElementTypeForId(id);
                            if (targetType) break;
                        }
                    }

                    if (targetType) {
                        const cleanedArray = [];
                        for (const id of value) {
                            const referencedElement = await this.getElement(targetType, id);
                            if (referencedElement !== null) {
                                cleanedArray.push(id);
                            } else {
                                console.warn(`Removing broken reference from array: ${fieldName} -> ${targetType} ${id}`);
                                hasChanges = true;
                            }
                        }
                        cleanedElement[fieldName] = cleanedArray;
                    } else {
                        // Can't determine type for any element - clear the array
                        console.warn(`Clearing unresolvable array field: ${fieldName}`);
                        cleanedElement[fieldName] = [];
                        hasChanges = true;
                    }
                }
            }
        }

        // Save changes if any broken references were found
        if (hasChanges) {
            console.log(`Auto-cleaning broken references from ${elementType} ${element.id}`);
            return await this.updateElement(elementType, element.id, cleanedElement);
        }

        return element;
    }

    /**
     * Guess target element type from field name using dynamic analysis
     */
    private guessTargetType(fieldName: string): string | null {
        // Use the existing dynamic field type detection from compatibility layer
        try {
            const { getRelationshipTarget } = require('./compatibility.js');
            const target = getRelationshipTarget(fieldName);
            if (target) {
                return target.toLowerCase();
            }
        } catch (error) {
            // Fallback if compatibility layer not available
        }

        // Remove common suffixes for direct matching
        let cleanName = fieldName.replace(/_ids?$/, '').replace(/s$/, '');

        // Check if it's a direct element type
        if (this.getElementTypes().includes(cleanName)) {
            return cleanName;
        }

        return null; // Let the caller handle validation
    }

    /**
     * Dynamically find which element type contains an ID by trying all types
     */
    private async findElementTypeForId(id: string): Promise<string | null> {
        const elementTypes = this.getElementTypes();

        for (const elementType of elementTypes) {
            try {
                const element = await this.getElement(elementType, id);
                if (element !== null) {
                    console.log(`Dynamically discovered: ${id} is a ${elementType}`);
                    return elementType;
                }
            } catch (error) {
                // Continue trying other types
            }
        }

        return null; // Element not found in any type
    }

    /**
     * Legacy method: resolve element references (for backward compatibility)
     * @param element - Element with potential references
     * @param referenceFields - Fields that contain references
     * @returns Element with resolved references
     */
    async resolveReferences(element: Element, referenceFields: string[] = []): Promise<Element> {
        const resolved = { ...element };

        for (const field of referenceFields) {
            if (element[field]) {
                // Handle single reference
                if (typeof element[field] === 'string') {
                    try {
                        const elementType = field.replace('_id', '');
                        if (this.getElementTypes().includes(elementType)) {
                            (resolved as any)[`${field}_resolved`] = await this.getElement(elementType, element[field]);
                        }
                    } catch (error) {
                        console.warn(`Could not resolve ${field}:`, error);
                    }
                }
                // Handle array of references
                else if (Array.isArray(element[field])) {
                    (resolved as any)[`${field}_resolved`] = [];
                    for (const id of element[field]) {
                        try {
                            const elementType = field.replace('_ids', '').replace(/s$/, '');
                            if (this.getElementTypes().includes(elementType)) {
                                const resolvedElement = await this.getElement(elementType, id);
                                (resolved as any)[`${field}_resolved`].push(resolvedElement);
                            }
                        } catch (error) {
                            console.warn(`Could not resolve ${field} item ${id}:`, error);
                        }
                    }
                }
            }
        }

        return resolved;
    }

    /**
     * Legacy method: clean link fields (maintained for backward compatibility)
     * @param element - Element with potential object references
     * @returns Cleaned element
     */
    cleanLinkFields(element: Element): any {
        return this.cleanElementData(element);
    }
}

// Create and export singleton instance
export const apiService = new OnlyWorldsAPI();