/**
 * OnlyWorlds Constants
 * Contains all element types and configuration for the OnlyWorlds API
 */

const ONLYWORLDS = {
    // API Base URL
    API_BASE: 'https://www.onlyworlds.com/api/worldapi',
    
    // All 22 OnlyWorlds element types
    ELEMENT_TYPES: [
        'ability',
        'character', 
        'collective',
        'construct',
        'creature',
        'event',
        'family',
        'institution',
        'language',
        'law',
        'location',
        'map',
        'marker',
        'narrative',
        'object',
        'phenomenon',
        'pin',
        'relation',
        'species',
        'title',
        'trait',
        'zone'
    ],
    
    // Base fields shared by all elements
    BASE_FIELDS: [
        'id',
        'created_at',
        'updated_at', 
        'name',
        'description',
        'supertype',
        'subtype',
        'image_url',
        'world'
    ],
    
    // Human-readable names for element types
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
    },
    
    // Material Icon names for each element type (matches OnlyWorlds spec)
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
    },
    
    // Emoji fallbacks for when Material Icons aren't loaded
    ELEMENT_EMOJI: {
        ability: '✨',
        character: '👤',
        collective: '👥',
        construct: '⚙️',
        creature: '🐾',
        event: '📅',
        family: '👨‍👩‍👧‍👦',
        institution: '🏛️',
        language: '💬',
        law: '⚖️',
        location: '🏰',
        map: '🗺️',
        marker: '📍',
        narrative: '📖',
        object: '📦',
        phenomenon: '⚡',
        pin: '📌',
        relation: '🔗',
        species: '🧬',
        title: '👑',
        trait: '❄️',
        zone: '🗺️'
    },
    
    // Common supertypes for different element types
    COMMON_SUPERTYPES: {
        character: ['protagonist', 'antagonist', 'supporting', 'minor', 'historical'],
        location: ['city', 'wilderness', 'building', 'landmark', 'region'],
        object: ['weapon', 'armor', 'tool', 'artifact', 'consumable'],
        event: ['battle', 'ceremony', 'disaster', 'discovery', 'political'],
        creature: ['beast', 'monster', 'animal', 'mythical', 'alien']
    },
    
    // Note: Field types are now managed in js/field-types.js
    // This provides a single source of truth based on the authoritative OnlyWorlds schema
};

// Make constants available globally
window.ONLYWORLDS = ONLYWORLDS;