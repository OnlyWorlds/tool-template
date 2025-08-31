/**
 * OnlyWorlds Constants
 * Contains all element types and configuration for the OnlyWorlds API
 */

const ONLYWORLDS = {
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
    },
    
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
    },
    
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
    }
};

export { ONLYWORLDS };
