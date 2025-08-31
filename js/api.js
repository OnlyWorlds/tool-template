/**
 * API Service Module
 * Handles all CRUD operations with the OnlyWorlds API
 */

import { ONLYWORLDS } from './constants.js';
import { authManager } from './auth.js';
import { getFieldType, isRelationshipField } from './field-types.js';

export default class OnlyWorldsAPI {
    constructor(authManager) {
        this.auth = authManager;
        this.cache = new Map();
        this.worldId = null;
    }
    
    /**
     * Generate a UUIDv7 (time-ordered UUID)
     * @returns {string} A UUID string
     */
    generateId() {
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
     * @param {string} elementType - Type of element (e.g., 'character', 'location')
     * @param {Object} filters - Optional filters (e.g., { supertype: 'protagonist' })
     * @returns {Promise<Array>} Array of elements
     */
    async getElements(elementType, filters = {}) {
        if (!this.auth.checkAuth()) {
            throw new Error('Not authenticated');
        }
        
        if (!ONLYWORLDS.ELEMENT_TYPES.includes(elementType)) {
            throw new Error(`Invalid element type: ${elementType}`);
        }
        
        const params = new URLSearchParams();
        const worldId = this.auth.apiKey;
        
        if (worldId) {
            params.append('world', worldId);
        }
        
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                params.append(key, value);
            }
        });
        
        try {
            const url = `${ONLYWORLDS.API_BASE}/${elementType}/?${params}`;
            const response = await fetch(url, {
                headers: this.auth.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch ${elementType}s: ${response.statusText}`);
            }
            
            const data = await response.json();
            const processedData = [];
            
            for (const element of data) {
                // Cache world ID from first element that has it
                if (!this.worldId && element.world) {
                    this.worldId = typeof element.world === 'string' 
                        ? element.world 
                        : element.world.id;
                }
                
                // Ensure world field is present and in correct format
                if (!element.world) {
                    try {
                        const worldId = await this.getWorldId();
                        if (worldId) {
                            element.world = worldId;
                        }
                    } catch (error) {
                        console.error('Failed to get world ID for element:', element.id, error);
                    }
                } else if (typeof element.world === 'object' && element.world.id) {
                    element.world = element.world.id;
                }
                processedData.push(element);
            }
            
            processedData.forEach(element => {
                const cacheKey = `${elementType}_${element.id}`;
                this.cache.set(cacheKey, element);
            });
            
            return processedData;
            
        } catch (error) {
            console.error(`Error fetching ${elementType}s:`, error);
            throw error;
        }
    }
    
    /**
     * Fetch a single element by ID
     * @param {string} elementType - Type of element
     * @param {string} elementId - ID of the element
     * @returns {Promise<Object>} The element object
     */
    async getElement(elementType, elementId) {
        if (!this.auth.checkAuth()) {
            throw new Error('Not authenticated');
        }
        
        const cacheKey = `${elementType}_${elementId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const url = `${ONLYWORLDS.API_BASE}/${elementType}/${elementId}/`;
            const response = await fetch(url, {
                headers: this.auth.getHeaders()
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`${elementType} not found`);
                }
                throw new Error(`Failed to fetch ${elementType}: ${response.statusText}`);
            }
            
            const element = await response.json();
            this.cache.set(cacheKey, element);
            
            return element;
            
        } catch (error) {
            console.error(`Error fetching ${elementType} ${elementId}:`, error);
            throw error;
        }
    }
    
    /**
     * Create a new element
     * @param {string} elementType - Type of element to create
     * @param {Object} elementData - The element data
     * @returns {Promise<Object>} The created element
     */
    async createElement(elementType, elementData) {
        if (!this.auth.checkAuth()) {
            throw new Error('Not authenticated');
        }
        
        if (!elementData.name) {
            throw new Error('Element name is required');
        }
        
        if (!elementData.world) {
            const worldId = await this.getWorldId();
            if (worldId) {
                elementData.world = worldId;
            } else {
                throw new Error('Cannot create element without world ID');
            }
        }
        
        if (!elementData.id) {
            elementData.id = this.generateId();
        }
        
        try {
            const url = `${ONLYWORLDS.API_BASE}/${elementType}/`;
            const response = await fetch(url, {
                method: 'POST',
                headers: this.auth.getHeaders(),
                body: JSON.stringify(elementData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create ${elementType}: ${errorText}`);
            }
            
            const createdElement = await response.json();
            
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
     * @param {string} elementType - Type of element
     * @param {string} elementId - ID of the element to update
     * @param {Object} updates - The fields to update
     * @returns {Promise<Object>} The updated element
     */
    async updateElement(elementType, elementId, updates) {
        if (!this.auth.checkAuth()) {
            throw new Error('Not authenticated');
        }
        
        try {
            const currentElement = await this.getElement(elementType, elementId);
            
            // Extract world ID if it's missing or an object
            if (!currentElement.world || typeof currentElement.world === 'object') {
                if (currentElement.world && currentElement.world.id) {
                    currentElement.world = currentElement.world.id;
                } else {
                    const worldId = await this.getWorldId();
                    if (worldId) {
                        currentElement.world = worldId;
                    }
                }
            }
            
            const updatedElement = { ...currentElement, ...updates };
            const cleanedElement = this.cleanLinkFields(updatedElement);
            
            // Ensure world field is present
            if (!cleanedElement.world && currentElement.world) {
                cleanedElement.world = typeof currentElement.world === 'string' 
                    ? currentElement.world 
                    : currentElement.world.id;
            } else if (!cleanedElement.world) {
                const worldId = await this.getWorldId();
                if (worldId) {
                    cleanedElement.world = worldId;
                }
            }
            
            const url = `${ONLYWORLDS.API_BASE}/${elementType}/${elementId}/`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: this.auth.getHeaders(),
                body: JSON.stringify(cleanedElement)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update ${elementType}: ${errorText}`);
            }
            
            const result = await response.json();
            
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
     * @param {string} elementType - Type of element
     * @param {string} elementId - ID of the element to delete
     * @returns {Promise<boolean>} Success status
     */
    async deleteElement(elementType, elementId) {
        if (!this.auth.checkAuth()) {
            throw new Error('Not authenticated');
        }
        
        try {
            const url = `${ONLYWORLDS.API_BASE}/${elementType}/${elementId}/`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.auth.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete ${elementType}: ${response.statusText}`);
            }
            
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
     * @param {string} elementType - Type of element
     * @param {string} searchTerm - Search term
     * @returns {Promise<Array>} Matching elements
     */
    async searchElements(elementType, searchTerm) {
        if (!searchTerm || searchTerm.length < 2) {
            return [];
        }
        
        return this.getElements(elementType, {
            name__icontains: searchTerm
        });
    }
    
    /**
     * Resolve element references
     * Given an element with ID references, fetch the referenced elements
     * @param {Object} element - Element with potential references
     * @param {Array<string>} referenceFields - Fields that contain references
     * @returns {Promise<Object>} Element with resolved references
     */
    async resolveReferences(element, referenceFields = []) {
        const resolved = { ...element };
        
        for (const field of referenceFields) {
            if (element[field]) {
                // Handle single reference
                if (typeof element[field] === 'string') {
                    try {
                        const elementType = field.replace('_id', '');
                        if (ONLYWORLDS.ELEMENT_TYPES.includes(elementType)) {
                            resolved[`${field}_resolved`] = await this.getElement(elementType, element[field]);
                        }
                    } catch (error) {
                        console.warn(`Could not resolve ${field}:`, error);
                    }
                }
                // Handle array of references
                else if (Array.isArray(element[field])) {
                    resolved[`${field}_resolved`] = [];
                    for (const id of element[field]) {
                        try {
                            const elementType = field.replace('_ids', '').replace(/s$/, '');
                            if (ONLYWORLDS.ELEMENT_TYPES.includes(elementType)) {
                                const resolvedElement = await this.getElement(elementType, id);
                                resolved[`${field}_resolved`].push(resolvedElement);
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
     * Clean link fields before sending to API
     * Converts object references to just IDs
     * @param {Object} element - Element with potential object references
     * @returns {Object} Cleaned element with ID strings instead of objects
     */
    cleanLinkFields(element) {
        const cleaned = {};
        const skipFields = ['created_at', 'updated_at'];
        
        for (const [fieldName, value] of Object.entries(element)) {
            if (skipFields.includes(fieldName)) {
                continue;
            }
            
            // Special handling for world field
            if (fieldName === 'world') {
                if (typeof value === 'object' && value !== null && value.id) {
                    cleaned[fieldName] = value.id;
                } else if (typeof value === 'string' && value) {
                    cleaned[fieldName] = value;
                } else {
                    cleaned[fieldName] = null;
                }
                continue;
            }
            
            const isLinkField = (isRelationshipField && isRelationshipField(fieldName)) ||
                               (getFieldType && ['uuid', 'array<uuid>'].includes(getFieldType(fieldName)?.type)) ||
                               (typeof value === 'object' && value !== null && value.id) ||
                               (Array.isArray(value) && value.length > 0 && 
                                typeof value[0] === 'object' && value[0] !== null && value[0].id);
            
            // Handle null/undefined values for link fields
            if ((value === null || value === undefined) && isLinkField) {
                const fieldType = getFieldType ? getFieldType(fieldName) : null;
                if (fieldType && fieldType.type === 'array<uuid>') {
                    const apiFieldName = fieldName.endsWith('_ids') ? fieldName : `${fieldName}_ids`;
                    cleaned[apiFieldName] = [];
                } else {
                    const apiFieldName = fieldName.endsWith('_id') ? fieldName : `${fieldName}_id`;
                    cleaned[apiFieldName] = null;
                }
                continue;
            }
            
            if (value === null || value === undefined) {
                cleaned[fieldName] = value;
                continue;
            }
            
            if (isLinkField) {
                if (Array.isArray(value)) {
                    const cleanedIds = value.map(item => {
                        if (typeof item === 'object' && item !== null && item.id) {
                            return item.id;
                        }
                        return item;
                    }).filter(id => id);
                    
                    const apiFieldName = fieldName.endsWith('_ids') ? fieldName : `${fieldName}_ids`;
                    cleaned[apiFieldName] = cleanedIds;
                } else if (typeof value === 'object' && value !== null && value.id) {
                    const apiFieldName = fieldName.endsWith('_id') ? fieldName : `${fieldName}_id`;
                    cleaned[apiFieldName] = value.id;
                } else if (typeof value === 'string' && value) {
                    if (getFieldType && getFieldType(fieldName).type === 'array<uuid>') {
                        const apiFieldName = fieldName.endsWith('_ids') ? fieldName : `${fieldName}_ids`;
                        cleaned[apiFieldName] = [value];
                    } else {
                        const apiFieldName = fieldName.endsWith('_id') ? fieldName : `${fieldName}_id`;
                        cleaned[apiFieldName] = value;
                    }
                } else if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
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
     * Get the world ID from cache or fetch it
     */
    async getWorldId() {
        if (this.worldId) {
            return this.worldId;
        }
        
        // Try to find world ID from any cached element
        for (const [key, value] of this.cache.entries()) {
            if (value && value.world) {
                if (typeof value.world === 'string') {
                    this.worldId = value.world;
                    return this.worldId;
                } else if (value.world.id) {
                    this.worldId = value.world.id;
                    return this.worldId;
                }
            }
        }
        
        // Try world endpoints
        const worldEndpoints = [
            `${ONLYWORLDS.API_BASE}/world/`,
            'https://www.onlyworlds.com/api/world/',
        ];
        
        for (const endpoint of worldEndpoints) {
            try {
                const response = await fetch(endpoint, {
                    headers: this.auth.getHeaders()
                });
                
                if (response.ok) {
                    const worlds = await response.json();
                    if (worlds && worlds.length > 0) {
                        this.worldId = worlds[0].id;
                        return this.worldId;
                    } else if (worlds && worlds.id) {
                        this.worldId = worlds.id;
                        return this.worldId;
                    }
                }
            } catch (error) {
                continue;
            }
        }
        
        // Try to get world from any element type
        try {
            for (const elementType of ONLYWORLDS.ELEMENT_TYPES) {
                const response = await fetch(`${ONLYWORLDS.API_BASE}/${elementType}/`, {
                    headers: this.auth.getHeaders()
                });
                
                if (response.ok) {
                    const elements = await response.json();
                    if (elements && elements.length > 0 && elements[0].world) {
                        this.worldId = typeof elements[0].world === 'string' 
                            ? elements[0].world 
                            : elements[0].world.id;
                        return this.worldId;
                    }
                }
            }
        } catch (error) {
            console.error('Failed to bootstrap world from elements:', error);
        }
        
        console.error('Could not find world ID');
        return null;
    }
    
    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
        this.worldId = null;
    }
}

// Create and export singleton instance
export const apiService = new OnlyWorldsAPI(authManager);