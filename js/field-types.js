/**
 * Field Types for OnlyWorlds Elements
 * 
 * Single source of truth for all field type definitions.
 * Based on authoritative OnlyWorlds schema from MCP server.
 * 
 * Philosophy: Everything defaults to 'string' for safety.
 * Only explicitly define non-string fields here.
 */

// Field type definitions with relationship targets
const FIELD_TYPES = {
    // Base fields (shared by all elements)
    'created_at': { type: 'date' },
    'updated_at': { type: 'date' },
    'world': { type: 'uuid', related_to: 'World' },
    
    // Numbers - explicit numeric fields
    'duration': { type: 'number' },
    'potency': { type: 'number' },
    'range': { type: 'number' },
    'weight': { type: 'number' },
    'height': { type: 'number' },
    'amount': { type: 'number' },
    'count': { type: 'number' },
    'formation_date': { type: 'number' },
    'start_date': { type: 'number' },
    'end_date': { type: 'number' },
    'birth_date': { type: 'number' },
    'founding_date': { type: 'number' },
    'grant_date': { type: 'number' },
    'revoke_date': { type: 'number' },
    'date': { type: 'number' },
    'life_span': { type: 'number' },
    'aggression': { type: 'number' },
    'elevation': { type: 'number' },
    'hierarchy': { type: 'number' },
    'width': { type: 'number' },
    'depth': { type: 'number' },
    'x': { type: 'number' },
    'y': { type: 'number' },
    'z': { type: 'number' },
    'order': { type: 'number' },
    'intensity': { type: 'number' },
    
    // Character stats
    'charisma': { type: 'number' },
    'coercion': { type: 'number' },
    'competence': { type: 'number' },
    'compassion': { type: 'number' },
    'creativity': { type: 'number' },
    'courage': { type: 'number' },
    'level': { type: 'number' },
    'hit_points': { type: 'number' },
    'STR': { type: 'number' },
    'DEX': { type: 'number' },
    'CON': { type: 'number' },
    'INT': { type: 'number' },
    'WIS': { type: 'number' },
    'CHA': { type: 'number' },
    'challenge_rating': { type: 'number' },
    'armor_class': { type: 'number' },
    'speed': { type: 'number' },
    
    // Long text fields (better UX with textarea)
    'physicality': { type: 'string' },
    'background': { type: 'longtext' },
    'motivations': { type: 'longtext' },
    'story': { type: 'longtext' },
    
    // Single relationships (uuid fields)
    'tradition': { type: 'uuid', related_to: 'Construct' },
    'source': { type: 'uuid', related_to: 'Phenomenon' },
    'locus': { type: 'uuid', related_to: 'Location' },
    'parent_object': { type: 'uuid', related_to: 'Object' },
    'location': { type: 'uuid', related_to: 'Location' },
    'language': { type: 'uuid', related_to: 'Language' },
    'birthplace': { type: 'uuid', related_to: 'Location' },
    'operator': { type: 'uuid', related_to: 'Institution' },
    'founder': { type: 'uuid', related_to: 'Character' },
    'custodian': { type: 'uuid', related_to: 'Institution' },
    'zone': { type: 'uuid', related_to: 'Zone' },
    'parent_institution': { type: 'uuid', related_to: 'Institution' },
    'classification': { type: 'uuid', related_to: 'Construct' },
    'parent_law': { type: 'uuid', related_to: 'Law' },
    'author': { type: 'uuid', related_to: 'Institution' },
    'parent_location': { type: 'uuid', related_to: 'Location' },
    'primary_power': { type: 'uuid', related_to: 'Institution' },
    'governing_title': { type: 'uuid', related_to: 'Title' },
    'rival': { type: 'uuid', related_to: 'Location' },
    'partner': { type: 'uuid', related_to: 'Location' },
    'system': { type: 'uuid', related_to: 'Phenomenon' },
    'actor': { type: 'uuid', related_to: 'Character' },
    'parent_species': { type: 'uuid', related_to: 'Species' },
    'parent_map': { type: 'uuid', related_to: 'Map' },
    'map': { type: 'uuid', related_to: 'Map' },
    // Pin element special fields:
    // element_type: numeric ID (1-22) representing the type
    // element_id: generic UUID that can point to any element
    'element_type': { type: 'number' },
    'element_id': { type: 'uuid', related_to: null },
    'parent_narrative': { type: 'uuid', related_to: 'Narrative' },
    'protagonist': { type: 'uuid', related_to: 'Character' },
    'antagonist': { type: 'uuid', related_to: 'Character' },
    'narrator': { type: 'uuid', related_to: 'Character' },
    'conservator': { type: 'uuid', related_to: 'Institution' },
    'issuer': { type: 'uuid', related_to: 'Institution' },
    'body': { type: 'uuid', related_to: 'Institution' },
    'superior_title': { type: 'uuid', related_to: 'Title' },
    'anti_trait': { type: 'uuid', related_to: 'Trait' },
    
    // Multi relationships (array<uuid> fields)
    'effects': { type: 'array<uuid>', related_to: 'Phenomenon' },
    'talents': { type: 'array<uuid>', related_to: 'Trait' },
    'requisites': { type: 'array<uuid>', related_to: 'Construct' },
    'instruments': { type: 'array<uuid>', related_to: 'Object' },
    'systems': { type: 'array<uuid>', related_to: 'Construct' },
    'materials': { type: 'array<uuid>', related_to: 'Construct' },
    'technology': { type: 'array<uuid>', related_to: 'Construct' },
    'abilities': { type: 'array<uuid>', related_to: 'Ability' },
    'consumes': { type: 'array<uuid>', related_to: 'Construct' },
    'affinities': { type: 'array<uuid>', related_to: 'Trait' },
    'species': { type: 'array<uuid>', related_to: 'Species' },
    'traits': { type: 'array<uuid>', related_to: 'Trait' },
    'languages': { type: 'array<uuid>', related_to: 'Language' },
    'objects': { type: 'array<uuid>', related_to: 'Object' },
    'institutions': { type: 'array<uuid>', related_to: 'Institution' },
    'family': { type: 'array<uuid>', related_to: 'Family' },
    'friends': { type: 'array<uuid>', related_to: 'Character' },
    'rivals': { type: 'array<uuid>', related_to: 'Character' },
    'equipment': { type: 'array<uuid>', related_to: 'Construct' },
    'symbolism': { type: 'array<uuid>', related_to: 'Construct' },
    'characters': { type: 'array<uuid>', related_to: 'Character' },
    'creatures': { type: 'array<uuid>', related_to: 'Creature' },
    'phenomena': { type: 'array<uuid>', related_to: 'Phenomenon' },
    'locations': { type: 'array<uuid>', related_to: 'Location' },
    'collectives': { type: 'array<uuid>', related_to: 'Collective' },
    'zones': { type: 'array<uuid>', related_to: 'Zone' },
    'constructs': { type: 'array<uuid>', related_to: 'Construct' },
    'relations': { type: 'array<uuid>', related_to: 'Relation' },
    'titles': { type: 'array<uuid>', related_to: 'Title' },
    'events': { type: 'array<uuid>', related_to: 'Event' },
    'narratives': { type: 'array<uuid>', related_to: 'Narrative' },
    'actions': { type: 'array<uuid>', related_to: 'Ability' },
    'triggers': { type: 'array<uuid>', related_to: 'Event' },
    'families': { type: 'array<uuid>', related_to: 'Family' },
    'traditions': { type: 'array<uuid>', related_to: 'Construct' },
    'ancestors': { type: 'array<uuid>', related_to: 'Character' },
    'estates': { type: 'array<uuid>', related_to: 'Location' },
    'governs': { type: 'array<uuid>', related_to: 'Institution' },
    'heirlooms': { type: 'array<uuid>', related_to: 'Object' },
    'adversaries': { type: 'array<uuid>', related_to: 'Institution' },
    'allies': { type: 'array<uuid>', related_to: 'Institution' },
    'dialects': { type: 'array<uuid>', related_to: 'Language' },
    'spread': { type: 'array<uuid>', related_to: 'Location' },
    'penalties': { type: 'array<uuid>', related_to: 'Construct' },
    'prohibitions': { type: 'array<uuid>', related_to: 'Construct' },
    'adjudicators': { type: 'array<uuid>', related_to: 'Title' },
    'enforcers': { type: 'array<uuid>', related_to: 'Title' },
    'populations': { type: 'array<uuid>', related_to: 'Collective' },
    'secondary_powers': { type: 'array<uuid>', related_to: 'Institution' },
    'founders': { type: 'array<uuid>', related_to: 'Character' },
    'catalysts': { type: 'array<uuid>', related_to: 'Object' },
    'empowerments': { type: 'array<uuid>', related_to: 'Ability' },
    'wielders': { type: 'array<uuid>', related_to: 'Character' },
    'environments': { type: 'array<uuid>', related_to: 'Location' },
    'nourishment': { type: 'array<uuid>', related_to: 'Species' },
    'reproduction': { type: 'array<uuid>', related_to: 'Construct' },
    'adaptations': { type: 'array<uuid>', related_to: 'Ability' },
    'linked_zones': { type: 'array<uuid>', related_to: 'Zone' },
    'principles': { type: 'array<uuid>', related_to: 'Construct' },
    'holders': { type: 'array<uuid>', related_to: 'Character' },
    'symbols': { type: 'array<uuid>', related_to: 'Object' },
    'laws': { type: 'array<uuid>', related_to: 'Law' },
    'empowered_abilities': { type: 'array<uuid>', related_to: 'Ability' }
};

/**
 * Get field type and relationship info for a field
 * @param {string} fieldName - Name of the field
 * @returns {Object} Field type info with type and optional related_to
 */
function getFieldType(fieldName) {
    const fieldInfo = FIELD_TYPES[fieldName];
    if (fieldInfo) {
        return fieldInfo;
    }
    
    // Default to string type for unknown fields
    return { type: 'string' };
}

/**
 * Get just the type string for a field (for backward compatibility)
 * @param {string} fieldName - Name of the field
 * @returns {string} Field type string
 */
function getFieldTypeString(fieldName) {
    return getFieldType(fieldName).type;
}

/**
 * Get the target element type for relationship fields
 * @param {string} fieldName - Name of the field
 * @returns {string|null} Target element type or null if not a relationship
 */
function getRelationshipTarget(fieldName) {
    const fieldInfo = getFieldType(fieldName);
    return fieldInfo.related_to || null;
}

/**
 * Check if a field is a relationship field
 * @param {string} fieldName - Name of the field
 * @returns {boolean} True if field is a relationship
 */
function isRelationshipField(fieldName) {
    const fieldInfo = getFieldType(fieldName);
    return fieldInfo.type === 'uuid' || fieldInfo.type === 'array<uuid>';
}

export { getFieldType, getFieldTypeString, getRelationshipTarget, isRelationshipField };