/**
 * URL Router Module (TypeScript)
 * Handles hash-based deep linking for OnlyWorlds elements
 *
 * URL Format: #/elementType/elementId
 * Examples:
 *   #/character/abc123-uuid-here
 *   #/location/def456-uuid-here
 */

import { apiService } from './api.js';

export interface Route {
    elementType: string;
    elementId: string;
}

export interface RouteChangeEvent {
    route: Route | null;
    isValid: boolean;
}

export type RouteChangeCallback = (event: RouteChangeEvent) => void;

class Router {
    private callbacks: RouteChangeCallback[] = [];
    private currentRoute: Route | null = null;
    private isListenerAttached: boolean = false;

    init(): void {
        if (!this.isListenerAttached) {
            window.addEventListener('hashchange', this.handleHashChange.bind(this));
            this.isListenerAttached = true;
        }

        // Parse initial route
        this.handleHashChange();
    }

    parseCurrentRoute(): Route | null {
        const hash = window.location.hash;
        return this.parseHash(hash);
    }

    /**
     * Parse a hash string into route components
     * Validates element type exists and UUID format is correct
     */
    parseHash(hash: string): Route | null {
        // Clean and validate hash format
        if (!hash || !hash.startsWith('#/')) {
            return null;
        }

        // Remove # and split by /
        const parts = hash.slice(1).split('/');

        // Expect exactly 3 parts: ['', 'elementType', 'elementId']
        if (parts.length !== 3 || !parts[1] || !parts[2]) {
            return null;
        }

        const [, elementType, elementId] = parts;

        // Validate element type exists in API
        const availableTypes = apiService.getElementTypes();
        if (!availableTypes.includes(elementType)) {
            console.warn(`Invalid element type in URL: ${elementType}. Available: ${availableTypes.join(', ')}`);
            return null;
        }

        // Validate UUID format (basic check)
        if (!this.isValidUUID(elementId)) {
            console.warn(`Invalid UUID format in URL: ${elementId}`);
            return null;
        }

        return { elementType, elementId };
    }

    navigateToElement(elementType: string, elementId: string): void {
        const newHash = `#/${elementType}/${elementId}`;

        // Avoid triggering hashchange if we're already on this route
        if (window.location.hash === newHash) {
            return;
        }

        // Update URL without triggering page reload
        window.location.hash = newHash;
    }

    navigateToRoot(): void {
        // Clear hash without triggering hashchange if already empty
        if (window.location.hash === '' || window.location.hash === '#') {
            return;
        }

        window.location.hash = '';
    }

    getCurrentRoute(): Route | null {
        return this.currentRoute;
    }

    onRouteChange(callback: RouteChangeCallback): void {
        this.callbacks.push(callback);
    }

    offRouteChange(callback: RouteChangeCallback): void {
        this.callbacks = this.callbacks.filter(cb => cb !== callback);
    }

    private handleHashChange(): void {
        const newRoute = this.parseCurrentRoute();
        const isValid = newRoute !== null;

        // Only notify if route actually changed
        if (!this.routesEqual(this.currentRoute, newRoute)) {
            this.currentRoute = newRoute;

            const event: RouteChangeEvent = {
                route: newRoute,
                isValid
            };

            // Notify all callbacks
            this.callbacks.forEach(callback => {
                try {
                    callback(event);
                } catch (error) {
                    console.error('Error in route change callback:', error);
                }
            });
        }
    }

    private routesEqual(route1: Route | null, route2: Route | null): boolean {
        if (route1 === null && route2 === null) return true;
        if (route1 === null || route2 === null) return false;
        return route1.elementType === route2.elementType && route1.elementId === route2.elementId;
    }

    /**
     * Basic UUID validation using regex
     * Supports UUIDv1-8 with proper variant bits
     */
    private isValidUUID(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    destroy(): void {
        if (this.isListenerAttached) {
            window.removeEventListener('hashchange', this.handleHashChange.bind(this));
            this.isListenerAttached = false;
        }
        this.callbacks = [];
        this.currentRoute = null;
    }
}

// Create and export singleton instance
export const router = new Router();