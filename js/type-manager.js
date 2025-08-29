/**
 * Type Management Service
 * Fetches and caches supertype/subtype hierarchies from the OnlyWorlds API
 */

import { ONLYWORLDS } from './constants.js';

class TypeManagementService {
    constructor() {
        // Cache for API data to avoid frequent requests
        this.apiCache = {};
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Fetch typing data from the API
     * @param {string} category - Element category to fetch types for
     * @returns {Promise<Object|null>} Type hierarchy or null if failed
     */
    async fetchTypingData(category) {
        // Check cache first
        const cached = this.apiCache[category.toLowerCase()];
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }

        try {
            // Format category name to be capitalized (API requirement)
            const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
            const response = await fetch(`https://www.onlyworlds.com/api/worldapi/typing/${formattedCategory}/`);
            
            if (!response.ok) {
                console.warn(`Failed to fetch typing data for ${formattedCategory}: ${response.status}`);
                return null;
            }

            const data = await response.json();
            
            // Cache the data
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

    /**
     * Get default supertype for a category
     * @param {string} category - Element category
     * @returns {Promise<string|null>} Default supertype or null
     */
    async getDefaultSupertype(category) {
        const supertypes = await this.getSupertypes(category);
        
        // Common default mappings
        const defaults = {
            character: 'Protagonist',
            location: 'City',
            event: 'Battle',
            creature: 'Beast',
            object: 'Weapon',
            ability: 'Magic',
            collective: 'Guild',
            family: 'Noble House',
            institution: 'Government',
            species: 'Humanoid'
        };
        
        const defaultType = defaults[category.toLowerCase()];
        if (defaultType && supertypes.includes(defaultType)) {
            return defaultType;
        }
        
        // Return first available if no default
        return supertypes.length > 0 ? supertypes[0] : null;
    }

    /**
     * Get default subtype for a supertype
     * @param {string} category - Element category
     * @param {string} supertype - Selected supertype
     * @returns {Promise<string|null>} Default subtype or null
     */
    async getDefaultSubtype(category, supertype) {
        const subtypes = await this.getSubtypes(category, supertype);
        
        // Common default mappings
        const defaults = {
            'Protagonist': 'Hero',
            'City': 'Capital',
            'Battle': 'Major',
            'Beast': 'Predator',
            'Weapon': 'Sword',
            'Magic': 'Elemental',
            'Guild': 'Mercenary',
            'Noble House': 'Royal',
            'Government': 'Monarchy',
            'Humanoid': 'Human'
        };
        
        const defaultType = defaults[supertype];
        if (defaultType && subtypes.includes(defaultType)) {
            return defaultType;
        }
        
        // Return first available if no default
        return subtypes.length > 0 ? subtypes[0] : null;
    }
}

// Create and export singleton instance
export default new TypeManagementService();