/**
 * Handles API key and PIN validation for OnlyWorlds API
 */

import { ONLYWORLDS } from './constants.js';

export default class AuthManager {
    constructor() {
        this.apiKey = null;
        this.apiPin = null;
        this.currentWorld = null;
        this.isAuthenticated = false;
    }
    
    /**
     * Initialize authentication with API credentials
     * @param {string} apiKey - The API key from OnlyWorlds
     * @param {string} apiPin - The PIN for the API key
     * @returns {Promise<boolean>} - Success status
     */
    async authenticate(apiKey, apiPin) {
        if (!apiKey || !apiPin) {
            throw new Error('API Key and PIN are required');
        }
        
        this.apiKey = apiKey;
        this.apiPin = apiPin;
        
        try {
            const response = await fetch(`${ONLYWORLDS.API_BASE}/world/`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Invalid API Key or PIN');
                } else if (response.status === 403) {
                    throw new Error('Access forbidden. Check your credentials');
                } else {
                    throw new Error(`Authentication failed: ${response.statusText}`);
                }
            }
            
            const worldData = await response.json();
            let worldMetadata = null;
            
            if (Array.isArray(worldData)) {
                if (worldData.length === 0) {
                    throw new Error('No worlds found. Create a world at onlyworlds.com first');
                }
                worldMetadata = worldData.find(el => el.category === 'world') || worldData[0];
            } else {
                worldMetadata = worldData;
            }
            
            this.currentWorld = {
                id: worldMetadata.id || apiKey,
                name: worldMetadata.name || 'Unnamed World',
                description: worldMetadata.description || '',
                created_at: worldMetadata.created_at,
                updated_at: worldMetadata.updated_at
            };
            
            this.isAuthenticated = true;
            
            return true;
            
        } catch (error) {
            this.clearCredentials();
            throw error;
        }
    }
    
    /**
     * Get headers for API requests
     * @returns {Object} Headers object with authentication
     */
    getHeaders() {
        if (!this.apiKey || !this.apiPin) {
            throw new Error('Not authenticated. Please connect first.');
        }
        
        return {
            'API-Key': this.apiKey,
            'API-Pin': this.apiPin,
            'Content-Type': 'application/json'
        };
    }
    
    /**
     * Clear stored credentials and sign out
     */
    clearCredentials() {
        this.apiKey = null;
        this.apiPin = null;
        this.currentWorld = null;
        this.isAuthenticated = false;
    }
    
    /**
     * Check if currently authenticated
     * @returns {boolean} Authentication status
     */
    checkAuth() {
        return this.isAuthenticated && this.apiKey && this.apiPin;
    }
    
    /**
     * Get the current world
     * @returns {Object|null} Current world object
     */
    getCurrentWorld() {
        return this.currentWorld;
    }
    
    /**
     * Switch to a different world
     * @param {string} worldId - ID of the world to switch to
     * @returns {Promise<boolean>} Success status
     */
    async switchWorld(worldId) {
        if (!this.checkAuth()) {
            throw new Error('Not authenticated');
        }
        
        try {
            const response = await fetch(`${ONLYWORLDS.API_BASE}/world/${worldId}/`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch world: ${response.statusText}`);
            }
            
            this.currentWorld = await response.json();
            return true;
            
        } catch (error) {
            console.error('Error switching world:', error);
            throw error;
        }
    }
}

// Create and export singleton instance
export const authManager = new AuthManager();