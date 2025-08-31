/**
 * Type Management Service
 * Fetches and caches supertype/subtype hierarchies from the OnlyWorlds API
 */

import { ONLYWORLDS } from './constants.js';

class TypeManagementService {
    constructor() {
        this.apiCache = {};
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Fetch typing data from the API
     * @param {string} category - Element category to fetch types for
     * @returns {Promise<Object|null>} Type hierarchy or null if failed
     */
    async fetchTypingData(category) {
        const cached = this.apiCache[category.toLowerCase()];
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }

        try {
            const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
            const response = await fetch(`https://www.onlyworlds.com/api/worldapi/typing/${formattedCategory}/`);
            
            if (!response.ok) {
                console.warn(`Failed to fetch typing data for ${formattedCategory}: ${response.status}`);
                return null;
            }

            const data = await response.json();
            
            this.apiCache[category.toLowerCase()] = {
                data: { supertypes: data.supertypes || {} },
                timestamp: Date.now()
            };

            return { supertypes: data.supertypes || {} };
        } catch (error) {
            console.error(`Error fetching typing data for ${category}:`, error);
            return null;
        }
    }

    /**
     * Get available supertypes for a category
     * @param {string} category - Element category
     * @returns {Promise<Array<string>>} Array of available supertypes
     */
    async getSupertypes(category) {
        const hierarchy = await this.fetchTypingData(category);
        if (!hierarchy) return [];
        
        return Object.keys(hierarchy.supertypes);
    }

    /**
     * Get available subtypes for a given supertype in a category
     * @param {string} category - Element category
     * @param {string} supertype - Selected supertype
     * @returns {Promise<Array<string>>} Array of available subtypes
     */
    async getSubtypes(category, supertype) {
        if (!supertype) return [];
        
        const hierarchy = await this.fetchTypingData(category);
        if (!hierarchy) return [];
        
        return hierarchy.supertypes[supertype] || [];
    }
}

export default new TypeManagementService();