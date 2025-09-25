/**
 * Handles API key and PIN validation for OnlyWorlds API
 * Now uses @onlyworlds/sdk for type safety and better API integration
 */

import { OnlyWorldsClient } from '@onlyworlds/sdk';

interface WorldMetadata {
    id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
}

export default class AuthManager {
    private apiKey: string | null = null;
    private apiPin: string | null = null;
    private currentWorld: WorldMetadata | null = null;
    private isAuthenticated: boolean = false;
    private client: OnlyWorldsClient | null = null;
    private readonly STORAGE_KEY = 'ow_auth_credentials';

    /**
     * Initialize authentication with API credentials
     * @param apiKey - The API key from OnlyWorlds
     * @param apiPin - The PIN for the API key
     * @returns Success status
     */
    async authenticate(apiKey: string, apiPin: string): Promise<boolean> {
        if (!apiKey || !apiPin) {
            throw new Error('API Key and PIN are required');
        }

        this.apiKey = apiKey;
        this.apiPin = apiPin;

        try {
            // Create SDK client with credentials
            this.client = new OnlyWorldsClient({
                apiKey,
                apiPin
            });

            // Test authentication by getting world data
            const worldData = await this.client.worlds.list();

            let worldMetadata: any;

            if (Array.isArray(worldData)) {
                if (worldData.length === 0) {
                    throw new Error('No worlds found. Create a world at onlyworlds.com first');
                }
                worldMetadata = worldData[0];
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

            // Save credentials for persistence across sessions
            this.saveCredentials(apiKey, apiPin);

            return true;

        } catch (error) {
            this.clearCredentials();
            throw error;
        }
    }

    /**
     * Get the SDK client instance
     * @returns OnlyWorlds SDK client
     */
    getClient(): OnlyWorldsClient {
        if (!this.client || !this.isAuthenticated) {
            throw new Error('Not authenticated. Please connect first.');
        }
        return this.client;
    }

    /**
     * Get headers for manual API requests
     * @returns Headers object with authentication
     */
    getHeaders(): Record<string, string> {
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
    clearCredentials(): void {
        this.apiKey = null;
        this.apiPin = null;
        this.currentWorld = null;
        this.isAuthenticated = false;
        this.client = null;
        this.clearStoredCredentials();
    }

    /**
     * Check if currently authenticated
     * @returns Authentication status
     */
    checkAuth(): boolean {
        return this.isAuthenticated && this.apiKey !== null && this.apiPin !== null;
    }

    /**
     * Get the current world
     * @returns Current world object
     */
    getCurrentWorld(): WorldMetadata | null {
        return this.currentWorld;
    }

    /**
     * Switch to a different world (using SDK)
     * @param worldId - ID of the world to switch to
     * @returns Success status
     */
    async switchWorld(worldId: string): Promise<boolean> {
        if (!this.checkAuth() || !this.client) {
            throw new Error('Not authenticated');
        }

        try {
            const worldData = await this.client.worlds.get(worldId);
            this.currentWorld = {
                id: worldData.id || 'unknown',
                name: worldData.name || 'Unnamed World',
                description: worldData.description || '',
                created_at: worldData.created_at || new Date().toISOString(),
                updated_at: worldData.updated_at || new Date().toISOString()
            };
            return true;

        } catch (error) {
            console.error('Error switching world:', error);
            throw error;
        }
    }

    /**
     * Save credentials to localStorage with basic encoding
     * @param apiKey - API key to save
     * @param apiPin - API PIN to save
     */
    private saveCredentials(apiKey: string, apiPin: string): void {
        try {
            const credentials = {
                apiKey: btoa(apiKey), // Basic encoding (not encryption, but better than plaintext)
                apiPin: btoa(apiPin),
                timestamp: Date.now()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(credentials));
        } catch (error) {
            console.warn('Could not save credentials to localStorage:', error);
        }
    }

    /**
     * Load credentials from localStorage
     * @returns Stored credentials or null if none found
     */
    private loadCredentials(): { apiKey: string; apiPin: string } | null {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return null;

            const credentials = JSON.parse(stored);

            // Optional: Check if credentials are too old (e.g., 30 days)
            const thirtyDays = 30 * 24 * 60 * 60 * 1000;
            if (Date.now() - credentials.timestamp > thirtyDays) {
                this.clearStoredCredentials();
                return null;
            }

            return {
                apiKey: atob(credentials.apiKey),
                apiPin: atob(credentials.apiPin)
            };
        } catch (error) {
            console.warn('Could not load credentials from localStorage:', error);
            this.clearStoredCredentials();
            return null;
        }
    }

    /**
     * Clear stored credentials from localStorage
     */
    private clearStoredCredentials(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (error) {
            console.warn('Could not clear stored credentials:', error);
        }
    }

    /**
     * Attempt to authenticate using stored credentials
     * @returns Success status
     */
    async tryAutoAuthenticate(): Promise<boolean> {
        const storedCredentials = this.loadCredentials();
        if (!storedCredentials) {
            return false;
        }

        try {
            await this.authenticate(storedCredentials.apiKey, storedCredentials.apiPin);
            console.log('Auto-authentication successful');
            return true;
        } catch (error) {
            console.log('Auto-authentication failed, clearing stored credentials:', error);
            this.clearStoredCredentials();
            return false;
        }
    }

    /**
     * Check if stored credentials exist
     * @returns True if credentials are stored
     */
    hasStoredCredentials(): boolean {
        return this.loadCredentials() !== null;
    }
}

// Create and export singleton instance
export const authManager = new AuthManager();