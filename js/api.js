/**
 * API Service Module
 * Handles all CRUD operations with the OnlyWorlds API
 */

class OnlyWorldsAPI {
    constructor(authManager) {
        this.auth = authManager;
        this.cache = new Map(); // Simple cache for elements
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
            
            // Cache the elements
            data.forEach(element => {
                const cacheKey = `${elementType}_${element.id}`;
                this.cache.set(cacheKey, element);
            });
            
            return data;
            
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
            // Use the API key as the world identifier
            elementData.world = this.auth.apiKey;
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
        
        try {
            // Get the current element first to preserve all fields
            const currentElement = await this.getElement(elementType, elementId);
            
            // Merge updates with current data
            const updatedElement = { ...currentElement, ...updates };
            
            const url = `${ONLYWORLDS.API_BASE}/${elementType}/${elementId}/`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: this.auth.getHeaders(),
                body: JSON.stringify(updatedElement)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update ${elementType}: ${errorText}`);
            }
            
            const result = await response.json();
            
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
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
    }
}

// Create global instance
window.apiService = new OnlyWorldsAPI(window.authManager);