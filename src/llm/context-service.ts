/**
 * Context Service for AI Chat
 * Handles token estimation, context preparation, and preferences management
 */

import { ONLYWORLDS } from '../compatibility.js';
import { apiService } from '../api.js';

export interface ContextPreferences {
    selectedElementLevel: 'minimal' | 'full';
    enabledCategories: Record<string, boolean>;
    maxTokens: number;
    autoSelect: boolean;
    // New widget-based preferences
    worldComplete: boolean;
    worldFull: boolean;
}

export interface ElementData {
    id: string;
    name: string;
    type: string;
    data: any;
    linkedElements?: ElementData[];
}

export interface ContextData {
    world: {
        name: string;
        elementCounts: Record<string, number>;
        version?: string;
    };
    selectedElement?: {
        level: 'minimal' | 'full';
        data: ElementData;
    };
    categories: Array<{
        type: string;
        count: number;
        elements: ElementData[];
    }>;
}

export class ContextService {
    private static readonly STORAGE_KEY = 'ow_context_preferences';
    private static readonly DEFAULT_PREFERENCES: ContextPreferences = {
        selectedElementLevel: 'minimal',
        enabledCategories: {},
        maxTokens: 50000,
        autoSelect: true,
        worldComplete: false,
        worldFull: false
    };

    private tokenCache = new Map<string, { tokens: number; timestamp: number }>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    private elementCache = new Map<string, any[]>();

    /**
     * Estimate tokens for text content (rough estimate: ~4 chars per token)
     */
    estimateTokens(text: string): number {
        if (!text) return 0;

        const cacheKey = this.hashString(text);
        const cached = this.tokenCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.tokens;
        }

        // Rough estimation: ~4 characters per token
        // This accounts for whitespace, punctuation, and typical text patterns
        const tokens = Math.ceil(text.length / 4);

        this.tokenCache.set(cacheKey, {
            tokens,
            timestamp: Date.now()
        });

        return tokens;
    }

    /**
     * Estimate tokens for an entire context data structure
     */
    estimateContextTokens(context: ContextData): number {
        let totalTokens = 0;

        // World info (always included, minimal)
        const worldText = `World: ${context.world.name}\nElement counts: ${JSON.stringify(context.world.elementCounts)}`;
        totalTokens += this.estimateTokens(worldText);

        // Selected element
        if (context.selectedElement) {
            const elementData = this.serializeElement(context.selectedElement.data, context.selectedElement.level);
            totalTokens += this.estimateTokens(elementData);
        }

        // Category data
        for (const category of context.categories) {
            const categoryText = this.serializeCategoryElements(category.elements);
            totalTokens += this.estimateTokens(categoryText);
        }

        return totalTokens;
    }

    /**
     * Get element counts for all categories (optimized with parallel API calls and progressive loading)
     */
    async getElementCounts(onProgress?: (elementType: string, count: number, totalProgress: number) => void): Promise<Record<string, number>> {
        const counts: Record<string, number> = {};
        let completedCount = 0;
        const totalElements = ONLYWORLDS.ELEMENT_TYPES.length;

        // Make all API calls in parallel for much better performance
        const countPromises = ONLYWORLDS.ELEMENT_TYPES.map(async (elementType) => {
            try {
                const result = await apiService.getElements(elementType);
                const count = result.success ? result.data.length : 0;

                // Update counts immediately as each request completes
                counts[elementType] = count;
                completedCount++;

                // Call progress callback if provided
                if (onProgress) {
                    onProgress(elementType, count, Math.round((completedCount / totalElements) * 100));
                }

                return {
                    elementType,
                    count
                };
            } catch (error) {
                console.warn(`Failed to get count for ${elementType}:`, error);
                const count = 0;

                counts[elementType] = count;
                completedCount++;

                if (onProgress) {
                    onProgress(elementType, count, Math.round((completedCount / totalElements) * 100));
                }

                return {
                    elementType,
                    count
                };
            }
        });

        // Wait for all API calls to complete
        await Promise.all(countPromises);

        return counts;
    }

    /**
     * Estimate tokens for a category based on element count
     */
    async estimateCategoryTokens(elementType: string): Promise<number> {
        try {
            // Check cache first
            const cached = this.elementCache.get(elementType);
            if (cached) {
                const categoryText = this.serializeCategoryElements(cached.map(el => ({
                    id: el.id,
                    name: el.name,
                    type: elementType,
                    data: el
                })));
                return this.estimateTokens(categoryText);
            }

            // Fetch elements if not cached
            const result = await apiService.getElements(elementType);
            if (result.success) {
                this.elementCache.set(elementType, result.data);

                const elements = result.data.map((el: any) => ({
                    id: el.id,
                    name: el.name,
                    type: elementType,
                    data: el
                }));

                const categoryText = this.serializeCategoryElements(elements);
                return this.estimateTokens(categoryText);
            }

            return 0;
        } catch (error) {
            console.warn(`Failed to estimate tokens for ${elementType}:`, error);
            return 0;
        }
    }

    /**
     * Load user preferences from localStorage
     */
    loadPreferences(): ContextPreferences {
        try {
            const stored = localStorage.getItem(ContextService.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...ContextService.DEFAULT_PREFERENCES, ...parsed };
            }
        } catch (error) {
            console.warn('Failed to load context preferences:', error);
        }

        return { ...ContextService.DEFAULT_PREFERENCES };
    }

    /**
     * Save user preferences to localStorage
     */
    savePreferences(preferences: ContextPreferences): void {
        try {
            localStorage.setItem(ContextService.STORAGE_KEY, JSON.stringify(preferences));
        } catch (error) {
            console.warn('Failed to save context preferences:', error);
        }
    }

    /**
     * Build context data based on current selections and preferences
     */
    async buildContextData(
        currentElement: any,
        preferences: ContextPreferences,
        worldData: any
    ): Promise<ContextData> {
        const elementCounts = await this.getElementCounts();

        const context: ContextData = {
            world: {
                name: worldData?.name || 'Unnamed World',
                elementCounts,
                version: worldData?.version
            },
            categories: []
        };

        // Add selected element if available and preferences allow
        if (currentElement && preferences.autoSelect) {
            let elementData: ElementData = {
                id: currentElement.id,
                name: currentElement.name,
                type: currentElement.element_type || 'unknown',
                data: currentElement
            };

            // Add linked elements for full level
            if (preferences.selectedElementLevel === 'full') {
                elementData.linkedElements = await this.getLinkedElements(currentElement);
            }

            context.selectedElement = {
                level: preferences.selectedElementLevel,
                data: elementData
            };
        }

        // Add enabled categories
        for (const [elementType, enabled] of Object.entries(preferences.enabledCategories)) {
            if (enabled && elementCounts[elementType] > 0) {
                try {
                    const result = await apiService.getElements(elementType);
                    if (result.success) {
                        const elements = result.data.map((el: any) => ({
                            id: el.id,
                            name: el.name,
                            type: elementType,
                            data: el
                        }));

                        context.categories.push({
                            type: elementType,
                            count: result.data.length,
                            elements
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to load elements for ${elementType}:`, error);
                }
            }
        }

        return context;
    }

    /**
     * Get linked elements for an element (for full context level)
     */
    private async getLinkedElements(element: any): Promise<ElementData[]> {
        const linked: ElementData[] = [];

        // This is a simplified implementation
        // In a full implementation, you'd traverse all UUID fields and fetch related elements
        for (const [key, value] of Object.entries(element)) {
            if (this.isUUID(value as string)) {
                // Try to find this element in any category
                for (const elementType of ONLYWORLDS.ELEMENT_TYPES) {
                    try {
                        const result = await apiService.getElement(elementType, value as string);
                        if (result && result.success && result.data) {
                            linked.push({
                                id: result.data.id,
                                name: result.data.name,
                                type: elementType,
                                data: result.data
                            });
                            break;
                        }
                    } catch (error) {
                        // Continue to next type
                    }
                }
            }
        }

        return linked;
    }

    /**
     * Serialize element data for context
     */
    private serializeElement(element: ElementData, level: 'minimal' | 'full'): string {
        if (level === 'minimal') {
            return `${element.type}: ${element.name}\n${JSON.stringify({
                id: element.id,
                name: element.data.name,
                description: element.data.description,
                supertype: element.data.supertype,
                subtype: element.data.subtype
            }, null, 2)}`;
        } else {
            let result = `${element.type}: ${element.name}\n${JSON.stringify(element.data, null, 2)}`;

            if (element.linkedElements && element.linkedElements.length > 0) {
                result += '\n\nLinked Elements:\n';
                for (const linked of element.linkedElements) {
                    result += `- ${linked.type}: ${linked.name}\n`;
                }
            }

            return result;
        }
    }

    /**
     * Serialize category elements for context
     */
    private serializeCategoryElements(elements: ElementData[]): string {
        if (elements.length === 0) return '';

        const type = elements[0].type;
        let result = `${type} Elements (${elements.length}):\n`;

        for (const element of elements) {
            result += `- ${element.name}: ${element.data.description || 'No description'}\n`;
        }

        return result;
    }

    /**
     * Check if a string is a UUID
     */
    private isUUID(value: string): boolean {
        if (typeof value !== 'string') return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value);
    }

    /**
     * Simple hash function for cache keys
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Clear all caches
     */
    clearCache(): void {
        this.tokenCache.clear();
        this.elementCache.clear();
    }

    /**
     * Get warning level for token count
     */
    getTokenWarningLevel(tokens: number): 'none' | 'yellow' | 'red' {
        if (tokens >= 50000) return 'red';
        if (tokens >= 10000) return 'yellow';
        return 'none';
    }
}

// Export singleton instance
export const contextService = new ContextService();