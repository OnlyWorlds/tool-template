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
    
    // Element-specific fields beyond base fields
    // Types: string, number, boolean, date, uuid, array<type>, object
    ELEMENT_FIELDS: {
        ability: {
            effect: 'string',           // What the ability does
            cost: 'string',             // Energy/mana/resource cost
            range: 'string',            // Range or area of effect
            duration: 'string',         // How long it lasts
            prerequisites: 'array<uuid>' // Required abilities/traits
        },
        
        character: {
            birth_date: 'date',         // When born
            death_date: 'date',         // When died (if applicable)
            age: 'string',              // Current age or age at death
            gender: 'string',           // Gender identity
            species_id: 'uuid',         // Link to species
            abilities: 'array<uuid>',   // Character's abilities
            titles: 'array<uuid>',      // Titles held
            traits: 'array<uuid>',      // Character traits
            family_id: 'uuid',          // Primary family
            location_id: 'uuid',        // Current/primary location
            affiliations: 'array<uuid>' // Groups/institutions
        },
        
        collective: {
            founded_date: 'date',       // When established
            dissolved_date: 'date',     // When ended (if applicable)
            member_count: 'number',     // Number of members
            leader_ids: 'array<uuid>',  // Current leaders
            location_id: 'uuid',        // Headquarters/primary location
            members: 'array<uuid>',     // Individual members
            parent_collective_id: 'uuid' // Parent organization
        },
        
        construct: {
            creator_id: 'uuid',         // Who/what created it
            creation_date: 'date',      // When created
            purpose: 'string',          // Primary function
            materials: 'string',        // What it's made of
            location_id: 'uuid',        // Where it is
            status: 'string'            // operational/damaged/destroyed
        },
        
        creature: {
            species_id: 'uuid',         // Species type
            habitat: 'string',          // Natural environment
            diet: 'string',             // What it eats
            size: 'string',             // Size category
            abilities: 'array<uuid>',   // Natural abilities
            location_ids: 'array<uuid>', // Where found
            danger_level: 'string'      // Threat assessment
        },
        
        event: {
            start_date: 'date',         // When it begins
            end_date: 'date',           // When it ends
            location_id: 'uuid',        // Where it happens
            participants: 'array<uuid>', // Who's involved
            causes: 'array<uuid>',      // What caused it
            effects: 'array<uuid>',     // What it caused
            importance: 'string'        // Historical significance
        },
        
        family: {
            founder_id: 'uuid',         // Who started the family
            members: 'array<uuid>',     // Family members
            head_id: 'uuid',            // Current family head
            location_id: 'uuid',        // Family seat/home
            traditions: 'string',       // Family customs
            reputation: 'string'        // How they're known
        },
        
        institution: {
            type: 'string',             // government/religious/academic/etc
            founded_date: 'date',       // When established
            founder_id: 'uuid',         // Who founded it
            location_id: 'uuid',        // Main location
            branches: 'array<uuid>',    // Other locations
            members: 'array<uuid>',     // Members
            laws: 'array<uuid>',        // Associated laws
            leader_id: 'uuid'           // Current leader
        },
        
        language: {
            speakers: 'number',         // Number of speakers
            script: 'string',           // Writing system
            parent_language_id: 'uuid', // Language it evolved from
            region_ids: 'array<uuid>',  // Where spoken
            status: 'string'            // living/dead/constructed
        },
        
        law: {
            enacted_date: 'date',       // When passed
            enforced_by: 'uuid',        // Who enforces it
            jurisdiction: 'uuid',       // Where it applies
            penalties: 'string',        // Punishments for breaking
            status: 'string'            // active/repealed/pending
        },
        
        location: {
            coordinates: 'object',      // {lat, lng} or {x, y}
            parent_location_id: 'uuid', // Containing location
            location_type: 'string',    // city/building/region/etc
            population: 'number',       // Number of inhabitants
            zones: 'array<uuid>',       // Subdivisions
            landmarks: 'array<uuid>',   // Notable places
            ruler_id: 'uuid'            // Who controls it
        },
        
        map: {
            scale: 'string',            // Map scale
            dimensions: 'object',       // {width, height}
            locations: 'array<uuid>',   // Locations on map
            pins: 'array<uuid>',        // Pin markers
            markers: 'array<uuid>'      // Other markers
        },
        
        marker: {
            map_id: 'uuid',             // Which map it's on
            position: 'object',         // {x, y} coordinates
            marker_type: 'string',      // Type of marker
            target_id: 'uuid'           // What it marks
        },
        
        narrative: {
            content: 'string',          // The actual story/text
            author_id: 'uuid',          // Who wrote it
            date_written: 'date',       // In-world creation date
            characters: 'array<uuid>',  // Featured characters
            locations: 'array<uuid>',   // Featured locations
            events: 'array<uuid>'       // Featured events
        },
        
        object: {
            owner_id: 'uuid',           // Current owner
            creator_id: 'uuid',         // Who made it
            location_id: 'uuid',        // Where it is
            material: 'string',         // What it's made of
            value: 'string',            // Worth/importance
            abilities: 'array<uuid>'    // Special properties
        },
        
        phenomenon: {
            frequency: 'string',        // How often it occurs
            duration: 'string',         // How long it lasts
            trigger: 'string',          // What causes it
            effects: 'string',          // What it does
            locations: 'array<uuid>'    // Where it happens
        },
        
        pin: {
            map_id: 'uuid',             // Which map it's on
            position: 'object',         // {x, y} coordinates
            label: 'string',            // Pin label
            target_id: 'uuid'           // What it points to
        },
        
        relation: {
            source_id: 'uuid',          // First entity
            source_type: 'string',      // Type of first entity
            target_id: 'uuid',          // Second entity
            target_type: 'string',      // Type of second entity
            relation_type: 'string',    // Type of relationship
            start_date: 'date',         // When relationship began
            end_date: 'date',           // When relationship ended
            bidirectional: 'boolean'    // If relationship goes both ways
        },
        
        species: {
            lifespan: 'string',         // Average lifespan
            habitat: 'string',          // Natural environment
            traits: 'array<uuid>',      // Common traits
            abilities: 'array<uuid>',   // Common abilities
            parent_species_id: 'uuid'   // What it evolved from
        },
        
        title: {
            rank: 'string',             // Level of importance
            requirements: 'string',     // How to obtain
            privileges: 'string',       // What it grants
            holder_ids: 'array<uuid>',  // Current holders
            institution_id: 'uuid'      // Granting institution
        },
        
        trait: {
            trait_type: 'string',       // physical/mental/social
            effect: 'string',           // What it does
            rarity: 'string',           // How common
            inherited: 'boolean'        // Can be passed down
        },
        
        zone: {
            parent_location_id: 'uuid', // Containing location
            zone_type: 'string',        // district/neighborhood/sector
            boundaries: 'object',       // Geographic bounds
            population: 'number',       // Inhabitants
            characteristics: 'string'   // Notable features
        }
    },
    
    // Relationship field types
    RELATIONSHIP_TYPES: {
        // Single relationships (many-to-one)
        relation_single: [
            'species_id',
            'family_id',
            'location_id',
            'parent_location_id',
            'parent_collective_id',
            'creator_id',
            'founder_id',
            'ruler_id',
            'leader_id',
            'owner_id',
            'map_id',
            'institution_id',
            'parent_species_id',
            'parent_language_id',
            'enforced_by',
            'jurisdiction',
            'author_id',
            'head_id',
            'source_id',
            'target_id'
        ],
        
        // Multiple relationships (many-to-many)
        relation_many: [
            'abilities',
            'titles',
            'traits',
            'affiliations',
            'members',
            'leader_ids',
            'location_ids',
            'participants',
            'causes',
            'effects',
            'branches',
            'laws',
            'region_ids',
            'zones',
            'landmarks',
            'locations',
            'pins',
            'markers',
            'characters',
            'events',
            'holder_ids',
            'prerequisites'
        ]
    },
    
    // Field type descriptions for developers
    FIELD_TYPES: {
        'string': 'Text field',
        'number': 'Numeric value',
        'boolean': 'True/false value',
        'date': 'ISO 8601 date string (YYYY-MM-DD)',
        'uuid': 'Reference to another element\'s ID',
        'array<uuid>': 'List of references to other elements',
        'array<string>': 'List of text values',
        'object': 'Nested JSON object',
        'array<object>': 'List of nested objects'
    }
};

// Make constants available globally
window.ONLYWORLDS = ONLYWORLDS;