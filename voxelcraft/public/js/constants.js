const CHUNK_SIZE = 16;
const BLOCK_SIZE = 1;
const RENDER_DISTANCE = 4;
const GRAVITY = -9.81 * 3;
const JUMP_FORCE = 8;
const PLAYER_SPEED = 5;
const PLAYER_HEIGHT = 1.8;
const MOUSE_SENSITIVITY = 0.002;
const MAX_REACH_DISTANCE = 5;

const BLOCK_TYPES = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    WOOD: 4,
    LEAVES: 5,
    SAND: 6,
    WATER: 7,
    BRICK: 8,
    GLASS: 9
};

const BLOCK_PROPERTIES = {
    [BLOCK_TYPES.AIR]: { name: 'Air', solid: false, transparent: true },
    [BLOCK_TYPES.GRASS]: { name: 'Grass', solid: true, transparent: false, color: 0x7ec850 },
    [BLOCK_TYPES.DIRT]: { name: 'Dirt', solid: true, transparent: false, color: 0x8b6914 },
    [BLOCK_TYPES.STONE]: { name: 'Stone', solid: true, transparent: false, color: 0x8b8b8b },
    [BLOCK_TYPES.WOOD]: { name: 'Wood', solid: true, transparent: false, color: 0x8b6914 },
    [BLOCK_TYPES.LEAVES]: { name: 'Leaves', solid: true, transparent: false, color: 0x228b22 },
    [BLOCK_TYPES.SAND]: { name: 'Sand', solid: true, transparent: false, color: 0xf4e4c1 },
    [BLOCK_TYPES.WATER]: { name: 'Water', solid: false, transparent: true, color: 0x0077be },
    [BLOCK_TYPES.BRICK]: { name: 'Brick', solid: true, transparent: false, color: 0xb22222 },
    [BLOCK_TYPES.GLASS]: { name: 'Glass', solid: true, transparent: true, color: 0xffffff }
};

const WORLD_HEIGHT = 64;
const WATER_LEVEL = 32;