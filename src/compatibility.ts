/**
 * Compatibility layer for legacy imports
 * Provides the same API as the old manual modules but uses SDK under the hood
 */

// Constants that were in constants.js
export const ONLYWORLDS = {
    API_BASE: 'https://www.onlyworlds.com/api/worldapi',
    // Static fallback types - will be replaced by dynamic loading where needed
    ELEMENT_TYPES: [
        'ability', 'character', 'collective', 'construct', 'creature', 'event',
        'family', 'institution', 'language', 'law', 'location', 'map', 'marker',
        'narrative', 'object', 'phenomenon', 'pin', 'relation', 'species',
        'title', 'trait', 'zone'
    ],

    // Human-readable names for element types (plural)
    ELEMENT_LABELS: {
        ability: 'Abilities',
        character: 'Characters',
        collective: 'Collectives',
        construct: 'Constructs',
        creature: 'Creatures',
        event: 'Events',
        family: 'Families',
        institution: 'Institutions',
        language: 'Languages',
        law: 'Laws',
        location: 'Locations',
        map: 'Maps',
        marker: 'Markers',
        narrative: 'Narratives',
        object: 'Objects',
        phenomenon: 'Phenomena',
        pin: 'Pins',
        relation: 'Relations',
        species: 'Species',
        title: 'Titles',
        trait: 'Traits',
        zone: 'Zones'
    } as Record<string, string>,

    // Singular names
    ELEMENT_SINGULAR: {
        ability: 'Ability',
        character: 'Character',
        collective: 'Collective',
        construct: 'Construct',
        creature: 'Creature',
        event: 'Event',
        family: 'Family',
        institution: 'Institution',
        language: 'Language',
        law: 'Law',
        location: 'Location',
        map: 'Map',
        marker: 'Marker',
        narrative: 'Narrative',
        object: 'Object',
        phenomenon: 'Phenomenon',
        pin: 'Pin',
        relation: 'Relation',
        species: 'Species',
        title: 'Title',
        trait: 'Trait',
        zone: 'Zone'
    } as Record<string, string>,

    // Material Icon names for each element type
    ELEMENT_ICONS: {
        ability: 'auto_fix_normal',
        character: 'person',
        collective: 'groups',
        construct: 'api',
        creature: 'bug_report',
        event: 'event',
        family: 'supervisor_account',
        institution: 'business',
        language: 'translate',
        law: 'gavel',
        location: 'castle',
        map: 'map',
        marker: 'place',
        narrative: 'menu_book',
        object: 'hub',
        phenomenon: 'thunderstorm',
        pin: 'push_pin',
        relation: 'link',
        species: 'child_care',
        title: 'military_tech',
        trait: 'ac_unit',
        zone: 'architecture'
    } as Record<string, string>
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
    // Basic type detection for compatibility
    if (fieldName.includes('date') || fieldName === 'created_at' || fieldName === 'updated_at') {
        return { type: 'date' };
    }

    // Numeric fields
    const numericFields = [
        'duration', 'potency', 'range', 'weight', 'height', 'amount', 'count',
        'charisma', 'coercion', 'competence', 'compassion', 'creativity', 'courage',
        'level', 'hit_points', 'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA',
        'challenge_rating', 'armor_class', 'speed', 'aggression', 'elevation',
        'hierarchy', 'width', 'depth', 'x', 'y', 'z', 'order', 'intensity'
    ];

    if (numericFields.includes(fieldName)) {
        return { type: 'number' };
    }

    // Long text fields
    const longTextFields = ['background', 'motivations', 'story'];
    if (longTextFields.includes(fieldName)) {
        return { type: 'longtext' };
    }

    // Relationship fields
    if (fieldName === 'world') {
        return { type: 'uuid', related_to: 'World' };
    }

    // Array relationships (plural names ending with 's')
    const arrayRelationshipFields = [
        'effects', 'talents', 'requisites', 'instruments', 'systems', 'materials',
        'technology', 'abilities', 'consumes', 'affinities', 'species', 'traits',
        'languages', 'objects', 'institutions', 'family', 'friends', 'rivals',
        'equipment', 'symbolism', 'characters', 'creatures', 'phenomena',
        'locations', 'collectives', 'zones', 'constructs', 'relations', 'titles',
        'events', 'narratives', 'actions', 'triggers', 'families', 'traditions'
    ];

    if (arrayRelationshipFields.includes(fieldName)) {
        return { type: 'array<uuid>' };
    }

    // Single relationships
    const singleRelationshipFields = [
        'tradition', 'source', 'locus', 'parent_object', 'location', 'language',
        'birthplace', 'operator', 'founder', 'custodian', 'zone', 'parent_institution',
        'classification', 'parent_law', 'author', 'parent_location', 'primary_power',
        'governing_title', 'rival', 'partner', 'system', 'actor', 'parent_species',
        'parent_map', 'map', 'element_id', 'parent_narrative', 'protagonist',
        'antagonist', 'narrator', 'conservator', 'issuer', 'body', 'superior_title',
        'anti_trait'
    ];

    if (singleRelationshipFields.includes(fieldName)) {
        // Map field names to their target element types
        const fieldToTypeMapping: Record<string, string | null> = {
            'tradition': 'collective',
            'source': 'object',
            'locus': 'location',
            'parent_object': 'object',
            'location': 'location',
            'language': 'language',
            'birthplace': 'location',
            'operator': 'character',
            'founder': 'character',
            'custodian': 'character',
            'zone': 'zone',
            'parent_institution': 'institution',
            'classification': 'collective',
            'parent_law': 'law',
            'author': 'character',
            'parent_location': 'location',
            'primary_power': 'ability',
            'governing_title': 'title',
            'rival': 'character',
            'partner': 'character',
            'system': 'construct',
            'actor': 'character',
            'parent_species': 'species',
            'parent_map': 'map',
            'map': 'map',
            'element_id': null, // Generic UUID field
            'parent_narrative': 'narrative',
            'protagonist': 'character',
            'antagonist': 'character',
            'narrator': 'character',
            'conservator': 'character',
            'issuer': 'character',
            'body': 'character',
            'superior_title': 'title',
            'anti_trait': 'trait'
        };

        const targetType = fieldToTypeMapping[fieldName];
        return { type: 'uuid', related_to: targetType || undefined };
    }

    // Default to string
    return { type: 'string' };
}

export function getFieldTypeString(fieldName: string): string {
    return getFieldType(fieldName).type;
}

export function getRelationshipTarget(fieldName: string): string | null {
    const fieldInfo = getFieldType(fieldName);
    return fieldInfo.related_to || null;
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
 * Guess element type from field name (improved version)
 */
function guessElementTypeFromField(fieldName: string): string | null {
    // Use the existing relationship mapping first
    const target = getRelationshipTarget(fieldName);
    if (target) {
        return target.toLowerCase();
    }

    // Extract potential type from field name
    let cleanName = fieldName.replace(/_ids?$/, '').replace(/s$/, '');

    // Check if it matches any known element types (using static list for now)
    if (ONLYWORLDS.ELEMENT_TYPES.includes(cleanName)) {
        return cleanName;
    }

    return null;
}