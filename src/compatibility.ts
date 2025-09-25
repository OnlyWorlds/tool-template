/**
 * Compatibility layer for SDK integration
 * Provides unified API access to OnlyWorlds SDK functionality
 */

import { FIELD_SCHEMA, ELEMENT_LABELS, ELEMENT_MATERIAL_ICONS, getElementLabel } from '@onlyworlds/sdk';

// Constants that were in constants.js
export const ONLYWORLDS = {
    API_BASE: 'https://www.onlyworlds.com/api/worldapi',

    // Dynamic element types from SDK FIELD_SCHEMA
    get ELEMENT_TYPES() {
        return Object.keys(FIELD_SCHEMA).sort();
    },

    // Plural labels from SDK
    get ELEMENT_LABELS() {
        return ELEMENT_LABELS;
    },

    // Singular names - generated dynamically
    get ELEMENT_SINGULAR() {
        const singular: Record<string, string> = {};
        for (const type of Object.keys(FIELD_SCHEMA)) {
            singular[type] = type.charAt(0).toUpperCase() + type.slice(1);
        }
        return singular;
    },

    // Material Icon names for each element type - from SDK
    get ELEMENT_ICONS() {
        return ELEMENT_MATERIAL_ICONS;
    }
};

// Dynamic field type analysis cache
let _fieldTypeCache = new Map<string, { type: string; related_to?: string }>();

// Field type compatibility functions with dynamic introspection
export function getFieldType(fieldName: string, sampleValue?: any): { type: string; related_to?: string } {
    // Check cache first
    const cacheKey = `${fieldName}_${typeof sampleValue}`;
    if (_fieldTypeCache.has(cacheKey)) {
        return _fieldTypeCache.get(cacheKey)!;
    }

    let fieldType: { type: string; related_to?: string };

    // If we have a sample value, use it for better type detection
    if (sampleValue !== undefined && sampleValue !== null) {
        fieldType = inferTypeFromValue(fieldName, sampleValue);
    } else {
        fieldType = getStaticFieldType(fieldName);
    }

    // Cache the result
    _fieldTypeCache.set(cacheKey, fieldType);
    return fieldType;
}

/**
 * Infer field type from actual value
 */
function inferTypeFromValue(fieldName: string, value: any): { type: string; related_to?: string } {
    // Handle arrays
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return getStaticFieldType(fieldName); // Fall back to static analysis
        }

        const firstItem = value[0];
        if (typeof firstItem === 'string' && isUUID(firstItem)) {
            return { type: 'array<uuid>', related_to: guessElementTypeFromField(fieldName) || undefined };
        } else if (typeof firstItem === 'string') {
            return { type: 'array<string>' };
        } else if (typeof firstItem === 'number') {
            return { type: 'array<number>' };
        }
        return { type: 'array<string>' }; // default
    }

    // Handle objects
    if (typeof value === 'object' && value !== null) {
        if (value.id && typeof value.id === 'string') {
            return { type: 'uuid', related_to: guessElementTypeFromField(fieldName) || undefined };
        }
        return { type: 'object' };
    }

    // Handle primitives
    if (typeof value === 'boolean') {
        return { type: 'boolean' };
    }

    if (typeof value === 'number') {
        return { type: 'number' };
    }

    if (typeof value === 'string') {
        if (isUUID(value)) {
            return { type: 'uuid', related_to: guessElementTypeFromField(fieldName) || undefined };
        }
        if (isDateString(value)) {
            return { type: 'date' };
        }
        if (value.length > 200) {
            return { type: 'longtext' };
        }
        return { type: 'string' };
    }

    // Fallback to static analysis
    return getStaticFieldType(fieldName);
}

/**
 * Static field type detection (fallback)
 */
function getStaticFieldType(fieldName: string): { type: string; related_to?: string } {
    // Basic type detection for compatibility - only for actual date fields
    if (fieldName === 'created_at' || fieldName === 'updated_at') {
        return { type: 'date' };
    }



    // Relationship fields
    if (fieldName === 'world') {
        return { type: 'uuid', related_to: 'World' };
    }

    // Use explicit FIELD_SCHEMA for perfect field type detection
    const fieldSchema = getFieldSchema(fieldName);
    if (fieldSchema) {
        switch (fieldSchema.type) {
            case 'single_link':
                return { type: 'uuid', related_to: fieldSchema.target };
            case 'multi_link':
                return { type: 'array<uuid>', related_to: fieldSchema.target };
            case 'text':
                return { type: 'string' };
            case 'integer':
                return { type: 'number' };
            default:
                return { type: 'string' };
        }
    }

    // Default to string
    return { type: 'string' };
}

export function getFieldTypeString(fieldName: string): string {
    return getFieldType(fieldName).type;
}

export function getRelationshipTarget(fieldName: string): string | null {
    // Use FIELD_SCHEMA to find relationship target - search across all element types
    for (const [elementType, schema] of Object.entries(FIELD_SCHEMA)) {
        const fieldSchema = (schema as any)[fieldName];
        if (fieldSchema && fieldSchema.target) {
            return fieldSchema.target;
        }
    }

    // Fallback to static analysis for backwards compatibility
    const fieldInfo = getFieldType(fieldName);
    return fieldInfo.related_to || null;
}

/**
 * Get field mapping for specific element type and field (more efficient when element type is known)
 */
export function getFieldMapping(elementType: string, fieldName: string): string | null {
    const schema = (FIELD_SCHEMA as any)[elementType.toLowerCase()];
    return schema?.[fieldName]?.target || null;
}

/**
 * Get field schema information from FIELD_SCHEMA (searches all element types)
 */
function getFieldSchema(fieldName: string): { type: string; target?: string } | null {
    // Search across all element types for this field
    for (const [elementType, schema] of Object.entries(FIELD_SCHEMA)) {
        const fieldSchema = (schema as any)[fieldName];
        if (fieldSchema) {
            return fieldSchema;
        }
    }
    return null;
}

/**
 * Get field schema for specific element type and field (more efficient when element type is known)
 */
export function getElementFieldSchema(elementType: string, fieldName: string): { type: string; target?: string } | null {
    const schema = (FIELD_SCHEMA as any)[elementType.toLowerCase()];
    return schema?.[fieldName] || null;
}

export function isRelationshipField(fieldName: string): boolean {
    const fieldInfo = getFieldType(fieldName);
    return fieldInfo.type === 'uuid' || fieldInfo.type === 'array<uuid>';
}

// Type manager compatibility
class TypeManagerCompat {
    private cache: { [key: string]: any } = {};
    private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    async fetchTypingData(category: string): Promise<any> {
        const cached = this.cache[category.toLowerCase()];
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

            this.cache[category.toLowerCase()] = {
                data: { supertypes: data.supertypes || {} },
                timestamp: Date.now()
            };

            return { supertypes: data.supertypes || {} };
        } catch (error) {
            console.error(`Error fetching typing data for ${category}:`, error);
            return null;
        }
    }

    async getSupertypes(category: string): Promise<string[]> {
        const hierarchy = await this.fetchTypingData(category);
        if (!hierarchy) return [];

        return Object.keys(hierarchy.supertypes);
    }

    async getSubtypes(category: string, supertype: string): Promise<string[]> {
        if (!supertype) return [];

        const hierarchy = await this.fetchTypingData(category);
        if (!hierarchy) return [];

        return hierarchy.supertypes[supertype] || [];
    }
}

export default new TypeManagerCompat();

/**
 * Helper function to detect UUIDs
 */
function isUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}

/**
 * Helper function to detect date strings
 */
function isDateString(value: string): boolean {
    // Check for ISO date format or other common date patterns
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;

    return isoDateRegex.test(value) || simpleDateRegex.test(value) || !isNaN(Date.parse(value));
}

/**
 * Get element type from field name using FIELD_SCHEMA
 */
function guessElementTypeFromField(fieldName: string): string | null {
    // Use FIELD_SCHEMA to find relationship target
    for (const [elementType, schema] of Object.entries(FIELD_SCHEMA)) {
        const fieldSchema = (schema as any)[fieldName];
        if (fieldSchema && fieldSchema.target) {
            return fieldSchema.target;
        }
    }

    return null;
}