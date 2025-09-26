/**
 * Local Storage API - Implements OnlyWorlds API interface using localStorage
 * Provides CRUD operations compatible with the main API service
 */

import { ONLYWORLDS } from '../compatibility.js';
import { ApiResult, ApiSuccess, ApiError } from '../types/api-result.js';

interface Element {
    id: string;
    name: string;
    description?: string;
    world: string;
    created_at: string;
    updated_at: string;
    [key: string]: any;
}

interface OnlyWorldsLocalData {
    World: {
        api_key: string;
        name: string;
        description: string;
        version: string;
        image_url?: string;
        total_elements: number;
        created_at: string;
        updated_at: string;
        id?: string;
    };
    [elementType: string]: any; // Element arrays like "Character", "Location", etc.
}

export class LocalStorageAPI {
    private readonly STORAGE_KEY = 'ow_local_world_data';
    private readonly STORAGE_META_KEY = 'ow_local_meta';

    /**
     * Generate a UUIDv7 (time-ordered UUID) - same logic as online API
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

    getElementTypes(): string[] {
        return ONLYWORLDS.ELEMENT_TYPES;
    }

    private getLocalData(): OnlyWorldsLocalData | null {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return null;

            return JSON.parse(stored);
        } catch (error) {
            console.error('Error loading local world data:', error);
            return null;
        }
    }

    private saveLocalData(data: OnlyWorldsLocalData): void {
        try {
            // Update total_elements count - JSON uses capitalized element types
            const elementCount = this.getElementTypes().reduce((count, type) => {
                const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
                const elements = data[capitalizedType];
                return count + (Array.isArray(elements) ? elements.length : 0);
            }, 0);

            data.World.total_elements = elementCount;
            data.World.updated_at = new Date().toISOString();

            // Save main data
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));

            // Save metadata
            const meta = {
                lastModified: new Date().toISOString(),
                worldName: data.World.name,
                elementCount
            };
            localStorage.setItem(this.STORAGE_META_KEY, JSON.stringify(meta));

        } catch (error) {
            console.error('Error saving local world data:', error);
            throw new Error('Failed to save to localStorage. Storage may be full.');
        }
    }

    async importFromJSON(jsonData: any): Promise<void> {
        // Strict validation as per user requirement
        if (!jsonData || typeof jsonData !== 'object') {
            throw new Error('Invalid JSON data: must be an object');
        }

        if (!jsonData.World || typeof jsonData.World !== 'object') {
            throw new Error('Invalid JSON data: missing "World" object');
        }

        const world = jsonData.World;
        if (!world.api_key || !world.name || !world.version) {
            throw new Error('Invalid JSON data: World must have api_key, name, and version');
        }

        // Validate element types
        const validElementTypes = this.getElementTypes();
        for (const key in jsonData) {
            if (key !== 'World' && !validElementTypes.includes(key.toLowerCase())) {
                console.warn(`Unknown element type: ${key} - skipping`);
                delete jsonData[key];
            }
        }

        // Import the data
        this.saveLocalData(jsonData);
        console.log(`Imported local world: ${world.name} (${world.total_elements || 0} elements)`);
    }

    exportToJSON(): OnlyWorldsLocalData {
        const data = this.getLocalData();
        if (!data) {
            throw new Error('No local world data to export');
        }

        return data;
    }

    clearLocalWorld(): void {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.STORAGE_META_KEY);
    }

    hasLocalWorld(): boolean {
        return this.getLocalData() !== null;
    }

    getCurrentWorld(): any {
        const data = this.getLocalData();
        if (!data) return null;

        return {
            id: data.World.api_key, // Use API key as ID for local mode
            name: data.World.name,
            description: data.World.description,
            created_at: data.World.created_at,
            updated_at: data.World.updated_at,
            api_key: data.World.api_key,
            version: data.World.version,
            total_elements: data.World.total_elements
        };
    }

    async getElements(elementType: string, filters: Record<string, any> = {}): Promise<ApiResult<Element[]>> {
        const data = this.getLocalData();
        if (!data) {
            return ApiError.notFound('No local world loaded');
        }

        const capitalizedType = elementType.charAt(0).toUpperCase() + elementType.slice(1);
        const elements = data[capitalizedType] || [];

        if (!Array.isArray(elements)) {
            return ApiSuccess([]);
        }

        // Apply filters
        let filteredElements = elements;

        if (Object.keys(filters).length > 0) {
            filteredElements = elements.filter((element: Element) => {
                return Object.entries(filters).every(([key, value]) => {
                    if (value === null || value === undefined) return true;

                    if (key === 'name__icontains') {
                        return element.name?.toLowerCase().includes(value.toLowerCase());
                    }

                    return element[key] === value;
                });
            });
        }

        return ApiSuccess(filteredElements);
    }

    async getElement(elementType: string, elementId: string): Promise<Element | null> {
        const result = await this.getElements(elementType);
        if (!result.success) {
            return null;
        }

        const element = result.data.find(el => el.id === elementId);
        return element || null;
    }

    async createElement(elementType: string, elementData: Partial<Element>): Promise<Element> {
        const data = this.getLocalData();
        if (!data) {
            throw new Error('No local world loaded');
        }

        if (!elementData.name) {
            throw new Error('Element name is required');
        }

        const capitalizedType = elementType.charAt(0).toUpperCase() + elementType.slice(1);

        // Ensure the element type array exists
        if (!data[capitalizedType]) {
            data[capitalizedType] = [];
        }

        // Create new element with required fields
        const newElement: Element = {
            id: elementData.id || this.generateId(),
            name: elementData.name,
            description: elementData.description || undefined,
            world: data.World.api_key,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...elementData
        };

        data[capitalizedType].push(newElement);
        this.saveLocalData(data);

        return newElement;
    }

    async updateElement(elementType: string, elementId: string, updates: Partial<Element>): Promise<Element> {
        const data = this.getLocalData();
        if (!data) {
            throw new Error('No local world loaded');
        }

        const capitalizedType = elementType.charAt(0).toUpperCase() + elementType.slice(1);
        const elements = data[capitalizedType] || [];

        const elementIndex = elements.findIndex((el: Element) => el.id === elementId);
        if (elementIndex === -1) {
            throw new Error(`Element ${elementType} ${elementId} not found`);
        }

        // Update the element
        const updatedElement = {
            ...elements[elementIndex],
            ...updates,
            updated_at: new Date().toISOString()
        };

        elements[elementIndex] = updatedElement;
        this.saveLocalData(data);

        return updatedElement;
    }

    async deleteElement(elementType: string, elementId: string): Promise<boolean> {
        const data = this.getLocalData();
        if (!data) {
            throw new Error('No local world loaded');
        }

        const capitalizedType = elementType.charAt(0).toUpperCase() + elementType.slice(1);
        const elements = data[capitalizedType] || [];

        const elementIndex = elements.findIndex((el: Element) => el.id === elementId);
        if (elementIndex === -1) {
            return false;
        }

        elements.splice(elementIndex, 1);
        this.saveLocalData(data);

        return true;
    }

    async searchElements(elementType: string, searchTerm: string): Promise<ApiResult<Element[]>> {
        if (!searchTerm || searchTerm.length < 2) {
            return ApiSuccess([]);
        }

        return this.getElements(elementType, {
            name__icontains: searchTerm
        });
    }

    getStorageInfo(): { used: number; available: number; percentage: number } {
        try {
            const data = this.getLocalData();
            const dataSize = data ? JSON.stringify(data).length : 0;

            // Rough localStorage limit estimation (5-10MB typical)
            const estimatedLimit = 5 * 1024 * 1024; // 5MB
            const percentage = (dataSize / estimatedLimit) * 100;

            return {
                used: dataSize,
                available: estimatedLimit - dataSize,
                percentage: Math.round(percentage * 100) / 100
            };
        } catch (error) {
            return { used: 0, available: 0, percentage: 0 };
        }
    }
}