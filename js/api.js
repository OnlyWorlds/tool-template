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
        this.cache = new Map(); // Simple cache for elements
        this.worldId = null; // Cache the world ID once found
    }
    
    /**
     * Generate a UUIDv7 (time-ordered UUID)
     * @returns {string} A UUID string
     */
    generateId() {
        // Generate timestamp in milliseconds
        const timestamp = Date.now();
        
        // Convert timestamp to hex (12 hex chars for 48 bits)
        const timestampHex = timestamp.toString(16).padStart(12, '0');
        
        // Generate random bytes
        const randomBytes = new Uint8Array(10);
        crypto.getRandomValues(randomBytes);
        
        // Convert random bytes to hex
        const randomHex = Array.from(randomBytes, byte => 
            byte.toString(16).padStart(2, '0')
        ).join('');
        
        // Format as UUID v7: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
        const uuid = [
            timestampHex.substring(0, 8),                    // time_high
            timestampHex.substring(8, 12),                   // time_mid
            '7' + randomHex.substring(0, 3),                 // time_low with version 7
            ((parseInt(randomHex.substring(3, 5), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + randomHex.substring(5, 7), // variant bits
            randomHex.substring(7, 19)                       // random
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
        
        // Validate element type
        if (!ONLYWORLDS.ELEMENT_TYPES.includes(elementType)) {
            throw new Error(`Invalid element type: ${elementType}`);
        }
        
        // Build query parameters
        const params = new URLSearchParams();
        // The API key itself acts as the world identifier
        const worldId = this.auth.apiKey;
        
        if (worldId) {
            params.append('world', worldId);
        }
        
        // Add any additional filters
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
            
            // Ensure all elements have world field populated
            const processedData = [];
            let worldFieldIssues = 0;
            
            for (const element of data) {
                // Cache world ID from first element that has it
                if (!this.worldId && element.world) {
                    this.worldId = typeof element.world === 'string' 
                        ? element.world 
                        : element.world.id;
                }
                
                // Ensure world field is present and in correct format
                if (!element.world) {
                    worldFieldIssues++;
                    try {
                        const worldId = await this.getWorldId();
                        if (worldId) {
                            element.world = worldId;
                        }
                    } catch (error) {
                        console.error('❌ [API] Failed to get world ID for element:', element.id, error);
                    }
                } else if (typeof element.world === 'object' && element.world.id) {
                    // Convert world object to ID string
                    element.world = element.world.id;
                }
                processedData.push(element);
            }
            
            // Silent fix for world field issues
            
            // Cache the processed elements
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
        
        // Check cache first
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
            
            // Check if world field is present
            if (!element.world) {
                // World field missing in response
            }
            
            // Link fields are returned as objects from API
            
            // Cache the element
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
        
        // Ensure required fields
        if (!elementData.name) {
            throw new Error('Element name is required');
        }
        
        // Add world ID if not present
        if (!elementData.world) {
            // Get world ID from cache or existing elements
            const worldId = await this.getWorldId();
            if (worldId) {
                elementData.world = worldId;
            } else {
                throw new Error('Cannot create element without world ID');
            }
        }
        
        // Generate ID if not present
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
            
            // Cache the new element
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
        
        // Update element with given fields
        
        try {
            // Get the current element first to preserve all fields
            const currentElement = await this.getElement(elementType, elementId);
            
            // Extract world ID if it's missing or an object
            if (!currentElement.world || typeof currentElement.world === 'object') {
                // Try to get world from the API response or use a fallback
                if (currentElement.world && currentElement.world.id) {
                    currentElement.world = currentElement.world.id;
                } else {
                    // Use the helper method to find world ID
                    const worldId = await this.getWorldId();
                    if (worldId) {
                        currentElement.world = worldId;
                    }
                }
            }
            
            // Current element fetched
            
            // Merge updates with current data
            const updatedElement = { ...currentElement, ...updates };
            
            // Merge updates with current data
            
            // Clean link fields - convert objects to IDs for API
            const cleanedElement = this.cleanLinkFields(updatedElement);
            
            // CRITICAL: Ensure world field is present and correct
            if (!cleanedElement.world && currentElement.world) {
                console.warn('⚠️ [API] World field missing after cleaning! Restoring from current element...');
                cleanedElement.world = typeof currentElement.world === 'string' 
                    ? currentElement.world 
                    : currentElement.world.id;
            } else if (!cleanedElement.world) {
                console.error('❌ [API] No world field available! Attempting to get from cache or API...');
                const worldId = await this.getWorldId();
                if (worldId) {
                    console.log('🔄 [API] Using fallback world ID:', worldId);
                    cleanedElement.world = worldId;
                } else {
                    console.error('❌ [API] Failed to get world ID! Relationship updates will fail.');
                }
            }
            
            // Log world field status
            console.log('🌍 [API] World field check:', {
                currentWorld: currentElement.world,
                cleanedWorld: cleanedElement.world,
                worldIsObject: typeof cleanedElement.world === 'object'
            });
            
            console.log('🧹 [API] After cleaning:', {
                changedFields: Object.keys(cleanedElement).filter(key => 
                    JSON.stringify(cleanedElement[key]) !== JSON.stringify(updatedElement[key])
                ),
                cleanedValues: Object.keys(updates).reduce((acc, key) => {
                    acc[key] = cleanedElement[key];
                    return acc;
                }, {})
            });
            
            // Check if we're dealing with link fields
            const linkFieldsInUpdate = Object.keys(updates).filter(key => 
                isRelationshipField && isRelationshipField(key)
            );
            
            if (linkFieldsInUpdate.length > 0) {
                console.log('🔗 [API] Update contains link fields:', {
                    fields: linkFieldsInUpdate,
                    beforeClean: linkFieldsInUpdate.reduce((acc, key) => {
                        acc[key] = updatedElement[key];
                        return acc;
                    }, {}),
                    afterClean: linkFieldsInUpdate.reduce((acc, key) => {
                        acc[key] = cleanedElement[key];
                        return acc;
                    }, {})
                });
            }
            
            const url = `${ONLYWORLDS.API_BASE}/${elementType}/${elementId}/`;
            const requestBody = JSON.stringify(cleanedElement);
            
            // Send PUT request to API
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: this.auth.getHeaders(),
                body: requestBody
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                // API returned error
                throw new Error(`Failed to update ${elementType}: ${errorText}`);
            }
            
            const result = await response.json();
            
            // Check if the updated fields match what we sent
            // Need to account for field name transformations (_id/_ids suffixes)
            const mismatchedFields = Object.keys(updates).filter(key => {
                // For relationship fields, the API expects field_id/field_ids but returns field
                const isRelField = isRelationshipField && isRelationshipField(key);
                
                if (isRelField) {
                    // We sent field_id or field_ids, but server returns just field
                    const fieldType = getFieldType ? getFieldType(key) : null;
                    const apiFieldName = fieldType && fieldType.type === 'array<uuid>' 
                        ? (key.endsWith('_ids') ? key : `${key}_ids`)
                        : (key.endsWith('_id') ? key : `${key}_id`);
                    
                    const sentValue = cleanedElement[apiFieldName];
                    const received = result[key]; // Server returns original field name
                    
                    // For relationship fields, compare the IDs only (server returns objects)
                    // Convert received objects to ID arrays for comparison
                    let receivedIds;
                    if (Array.isArray(received)) {
                        receivedIds = received.map(item => 
                            typeof item === 'object' && item.id ? item.id : item
                        );
                    } else if (received && typeof received === 'object' && received.id) {
                        receivedIds = received.id;
                    } else {
                        receivedIds = received;
                    }
                    
                    return JSON.stringify(sentValue) !== JSON.stringify(receivedIds);
                } else {
                    // Non-relationship fields use same name
                    const sentValue = cleanedElement[key];
                    const received = result[key];
                    return JSON.stringify(sentValue) !== JSON.stringify(received);
                }
            });
            
            if (mismatchedFields.length > 0) {
                console.error('❌ [API] MISMATCH - Server didn\'t save these fields:', {
                    fields: mismatchedFields,
                    sent: mismatchedFields.reduce((acc, key) => {
                        // For relationship fields, get the value with the suffix
                        const isRelField = isRelationshipField && isRelationshipField(key);
                        if (isRelField) {
                            const fieldType = getFieldType ? getFieldType(key) : null;
                            const apiFieldName = fieldType && fieldType.type === 'array<uuid>' 
                                ? (key.endsWith('_ids') ? key : `${key}_ids`)
                                : (key.endsWith('_id') ? key : `${key}_id`);
                            acc[key] = cleanedElement[apiFieldName];
                        } else {
                            acc[key] = cleanedElement[key];
                        }
                        return acc;
                    }, {}),
                    received: mismatchedFields.reduce((acc, key) => {
                        acc[key] = result[key];
                        return acc;
                    }, {}),
                    worldInRequest: cleanedElement.world,
                    worldInResponse: result.world,
                    responseStatus: response.status
                });
                
                // Enhanced diagnostics for relationship field failures
                const relationshipFailures = mismatchedFields.filter(field => 
                    isRelationshipField && isRelationshipField(field)
                );
                
                if (relationshipFailures.length > 0) {
                    console.error('Failed to update relationship fields:', relationshipFailures);
                    
                    // Check world field consistency
                    if (!cleanedElement.world) {
                        console.error('World field missing from request');
                    } else if (result.world && cleanedElement.world !== result.world) {
                        console.error('World field mismatch', {
                            sent: cleanedElement.world,
                            received: result.world
                        });
                    }
                }
            }
            
            // Update cache
            const cacheKey = `${elementType}_${elementId}`;
            this.cache.set(cacheKey, result);
            
            // Cache updated
            
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
                        // Guess the element type from field name (e.g., location_id -> location)
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
        
        // Fields that should not be sent in PUT requests (read-only metadata)
        const skipFields = ['created_at', 'updated_at'];
        
        for (const [fieldName, value] of Object.entries(element)) {
            // Skip read-only fields
            if (skipFields.includes(fieldName)) {
                continue;
            }
            
            // CRITICAL: Special handling for world field - ensure it's always preserved correctly
            if (fieldName === 'world') {
                if (typeof value === 'object' && value !== null && value.id) {
                    cleaned[fieldName] = value.id;
                } else if (typeof value === 'string' && value) {
                    cleaned[fieldName] = value;
                } else if (!value) {
                    console.warn('⚠️ [API] World field is null/undefined! This will cause relationship updates to fail.');
                    cleaned[fieldName] = null;
                } else {
                    console.warn('⚠️ [API] World field has unexpected type:', typeof value, value);
                    cleaned[fieldName] = value;
                }
                continue;
            }
            
            // Check if this might be a link field BEFORE handling null values
            // Use the global function if available, or detect by field name/type
            const isLinkField = (isRelationshipField && isRelationshipField(fieldName)) ||
                               (getFieldType && ['uuid', 'array<uuid>'].includes(getFieldType(fieldName)?.type)) ||
                               (typeof value === 'object' && value !== null && value.id) ||
                               (Array.isArray(value) && value.length > 0 && 
                                typeof value[0] === 'object' && value[0] !== null && value[0].id);
            
            // Handle null/undefined values for link fields differently
            if ((value === null || value === undefined) && isLinkField) {
                // For null relationship fields, we still need to add the suffix
                const fieldType = getFieldType ? getFieldType(fieldName) : null;
                if (fieldType && fieldType.type === 'array<uuid>') {
                    const apiFieldName = fieldName.endsWith('_ids') ? fieldName : `${fieldName}_ids`;
                    cleaned[apiFieldName] = [];  // Empty array for multi-link fields
                } else {
                    const apiFieldName = fieldName.endsWith('_id') ? fieldName : `${fieldName}_id`;
                    cleaned[apiFieldName] = null;  // Null for single-link fields
                }
                continue;
            }
            
            // Skip other null/undefined values
            if (value === null || value === undefined) {
                cleaned[fieldName] = value;
                continue;
            }
            
            if (isLinkField) {
                if (Array.isArray(value)) {
                    // For array fields, extract IDs from objects and add _ids suffix
                    const originalValue = JSON.stringify(value);
                    const cleanedIds = value.map(item => {
                        if (typeof item === 'object' && item !== null && item.id) {
                            return item.id;
                        }
                        return item;
                    }).filter(id => id); // Remove null/undefined
                    
                    // Add _ids suffix for multi-link fields (actual API requirement)
                    const apiFieldName = fieldName.endsWith('_ids') ? fieldName : `${fieldName}_ids`;
                    cleaned[apiFieldName] = cleanedIds;
                } else if (typeof value === 'object' && value !== null && value.id) {
                    // For single link fields, extract ID from object and add _id suffix
                    const cleanedId = value.id;
                    // Add _id suffix for single-link fields (actual API requirement)  
                    const apiFieldName = fieldName.endsWith('_id') ? fieldName : `${fieldName}_id`;
                    cleaned[apiFieldName] = cleanedId;
                } else if (typeof value === 'string' && value) {
                    // Already an ID string, but still need to add suffix
                    if (getFieldType && getFieldType(fieldName).type === 'array<uuid>') {
                        // Multi-link field
                        const apiFieldName = fieldName.endsWith('_ids') ? fieldName : `${fieldName}_ids`;
                        cleaned[apiFieldName] = [value]; // Wrap single ID in array for consistency
                    } else {
                        // Single-link field
                        const apiFieldName = fieldName.endsWith('_id') ? fieldName : `${fieldName}_id`;
                        cleaned[apiFieldName] = value;
                    }
                } else if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
                    // Array of ID strings
                    const apiFieldName = fieldName.endsWith('_ids') ? fieldName : `${fieldName}_ids`;
                    cleaned[apiFieldName] = value.filter(id => id); // Remove null/undefined
                } else {
                    // Keep as-is for edge cases
                    cleaned[fieldName] = value;
                }
            } else {
                // Not a link field, keep as is
                cleaned[fieldName] = value;
            }
        }
        
        // Field conversions complete
        
        return cleaned;
    }
    
    /**
     * Get the world ID from cache or fetch it
     */
    async getWorldId() {
        // Return cached world ID if we already have it
        if (this.worldId) {
            return this.worldId;
        }
        
        // Try to find world ID from any cached element
        for (const [key, value] of this.cache.entries()) {
            if (value && value.world) {
                if (typeof value.world === 'string') {
                    this.worldId = value.world; // Cache it
                    return this.worldId;
                } else if (value.world.id) {
                    this.worldId = value.world.id; // Cache it
                    return this.worldId;
                }
            }
        }
        
        // Try different world endpoints to find the correct one
        const worldEndpoints = [
            // Note: /world/ endpoint doesn't exist in the API, removed to prevent 404s
            `${ONLYWORLDS.API_BASE}/world/`,  // Full worldapi path
            'https://www.onlyworlds.com/api/world/',  // Alternative path
        ];
        
        for (const endpoint of worldEndpoints) {
            try {
                const response = await fetch(endpoint, {
                    headers: this.auth.getHeaders()
                });
                
                if (response.ok) {
                    const worlds = await response.json();
                    if (worlds && worlds.length > 0) {
                        this.worldId = worlds[0].id; // Cache it
                        return this.worldId;
                    } else if (worlds && worlds.id) {
                        // Single world object instead of array
                        this.worldId = worlds.id; // Cache it
                        return this.worldId;
                    }
                }
            } catch (error) {
                continue; // Try next endpoint silently
            }
        }
        
        // Try to get world from any element type to bootstrap
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
            console.error('❌ [API] Failed to bootstrap world from elements:', error);
        }
        
        // Last resort - this is probably wrong but better than nothing
        console.error('❌ [API] Could not find world ID! All methods failed. Updates will likely fail.');
        return null;
    }
    
    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
        this.worldId = null; // Clear cached world ID
    }
}

// Create and export singleton instance
export const apiService = new OnlyWorldsAPI(authManager);