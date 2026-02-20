// ============================================================
// CACING KEHIDUPAN — INFINITE AUTO-SIMULATION CONSTANTS
// ============================================================

export const CONSTANTS = {
    // --- World Layers (Y positions as fractions of world height) ---
    LAYER_TOP_END: 0.25,       // 0..25% = surface (dangerous)
    LAYER_MID_END: 0.65,       // 25..65% = middle (balanced)
    // 65..100% = deep layer (safe, scarce food)

    // --- Worm Base Stats ---
    WORM_LENGTH: 12,
    WORM_SIZE: 11,
    BASE_SPEED: 1.8,
    HUNGER_DRAIN: 0.003,       // per frame
    ENERGY_DRAIN: 0.0015,
    STRESS_DRAIN: 0.005,       // when separated from partner
    STRESS_RECOVER: 0.01,      // when near partner
    CRITICAL_HUNGER: 15,       // triggers foraging / work
    REPRODUCE_HUNGER_MIN: 50,
    REPRODUCE_ENERGY_MIN: 55,
    NEAR_PARTNER_DIST: 150,
    REPRO_COOLDOWN: 25000,     // ms between egg lays
    EGG_HATCH_TIME: 10000,

    // --- HP (natural, not alpha invincibility) ---
    WORM_HP: 100,
    OFFSPRING_HP: 80,

    // --- Mining ---
    MINE_HIT_DAMAGE: 10,       // Aha deals this per swing
    MINE_HIT_COOLDOWN: 1200,   // increased slightly for head-bang animation
    MIN_DROPS: 3,              // min ores per rock
    MAX_DROPS: 10,             // max ores per rock
    ORE_CARRY_CAP: 1,          // mouth carrying
    ROCK_RESPAWN_TIME: 15000,
    GROW_MULTIPLIER: 2.5,     // how much larger the worm becomes

    // --- Kitchen ---
    COOK_DURATION: 8000,             // ms Tika spends cooking one meal
    COOK_GREEN_ORE_COST: 2,          // green ore needed per meal
    COOK_BLACK_ORE_COST: 1,          // black ore needed per meal
    MEAL_HUNGER_RESTORE: 40,         // hunger restored by one meal
    KITCHEN_CAP: 10,                 // max stored meals

    // --- Market ---
    MARKET_VEGETABLE_COST: 2,        // green ore to buy one vegetable
    MARKET_VEGETABLE_HUNGER: 25,

    // --- Jealousy / Fighting ---
    JEALOUSY_RANGE: 130,
    FIGHT_DAMAGE: 0.8,
    FIGHT_COOLDOWN: 800,

    // --- Ecology ---
    FOOD_SPAWN_RATE: 0.002,
    MUSHROOM_GROW_RATE: 0.0005,
    MUSHROOM_SPREAD_RATE: 0.0002,
    PREDATOR_SPEED: 2.5,
    PREDATOR_HUNT_RANGE: 200,

    // --- Season & Era ---
    SEASON_SHIFT_INTERVAL: 5 * 60 * 1000,
    ERA_MUTATION_INTERVAL: 30 * 60 * 1000,
    GOLDEN_WORM_THRESHOLD: 24 * 60 * 60 * 1000,

    // --- Water Management ---
    WATER_DROPLET_CAP: 40,           // max droplets on screen
    WATER_DROPLET_LIFETIME: 60000,   // ms before droplet dries up

    // --- Roles ---
    ROLES: { MALE: 'male', FEMALE: 'female', OFFSPRING: 'offspring' },

    // --- States ---
    STATES: {
        IDLE: 'IDLE',
        FORAGING: 'FORAGING',
        FLEEING: 'FLEEING',
        BONDING: 'BONDING',
        RESTING: 'RESTING',
        REPRODUCING: 'REPRODUCING',
        DEAD: 'DEAD',
        HUNTING: 'HUNTING',
        HIBERNATION: 'HIBERNATION',
        FIGHTING: 'FIGHTING',   // Tika defends home from rival males
        MINING: 'MINING',       // Aha breaks rocks at the mine
        PICKUP: 'PICKUP',       // Aha picks up dropped ore
        DELIVERING: 'DELIVERING', // Aha carries ore home to kitchen
        SHOPPING: 'SHOPPING',   // Aha buys vegetables at market
        COOKING: 'COOKING',     // Tika cooks ore into meals
        WATERING: 'WATERING',   // Aha waters the plant
    },

    // --- Seasons ---
    SEASONS: ['RAINY', 'DRY', 'MILD'],

    // --- Mutation trait pool ---
    TRAITS: ['FAST', 'BULKY', 'KEEN_SENSES', 'DIGGER', 'AGILE', 'FERTILE', 'HARDY'],

    // --- Audio ---
    BGM_URL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', // Placeholder funny song
};

// Computed from canvas at runtime – populated inside GameEngine.setup()
export const WORLD = {
    width: 1000,
    height: 700,
    get topEnd() { return this.height * CONSTANTS.LAYER_TOP_END; },
    get midEnd() { return this.height * CONSTANTS.LAYER_MID_END; },
};

// Fixed zone definitions (recomputed on resize inside GameEngine)
export const ZONES = {
    // Mine zone — left side, mid layer
    mine: { x: 0, y: 0, radius: 90, label: '⛏️ Tambang' },
    // Kitchen zone — center-right, mid layer (around Tika's home)
    kitchen: { x: 0, y: 0, radius: 80, label: '🍳 Dapur' },
    // Market zone — right side, near surface
    market: { x: 0, y: 0, radius: 70, label: '🛒 Pasar' },
};

export const COLORS = {
    male: '#4FC3F7',
    female: '#F06292',
    offspring: '#A5D6A7',
    egg: '#FFF9C4',
    food: '#81C784',
    meal: '#FFD54F',            // cooked food
    mushroom: '#CE93D8',
    predatorBird: '#FF7043',
    predatorDeep: '#37474F',
    oreGreen: '#A5D6A7',        // green ore (medium/small rocks)
    oreBlack: '#FF8F00',         // black ore (large rocks) — amber glow
    ore: '#FF8F00',              // kept for backward compat
    water: '#42a5f5',            // water droplet for plant

    // Layer gradients (stops)
    layerTop: ['#87CEEB', '#BDBDBD', '#8D6E63'],
    layerMid: ['#795548', '#5D4037', '#4E342E'],
    layerDeep: ['#3E2723', '#212121', '#1A1A1A'],
};
