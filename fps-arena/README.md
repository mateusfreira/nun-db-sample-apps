# FPS Arena - Real-time Multiplayer Game

A complete real-time multiplayer FPS arena game built with NunDB for real-time synchronization. Features overhead 2D gameplay with multiple player roles, real-time combat, and seamless multiplayer experience.

## Features

### Core Gameplay
- **Real-time multiplayer**: Up to multiple players in the same arena
- **Overhead 2D view**: Classic top-down perspective with 800x600 canvas
- **Smooth movement**: WASD/Arrow key controls with collision detection
- **Combat system**: Spacebar shooting with projectile physics
- **Map design**: Strategic walls and obstacles for tactical gameplay

### Player Roles
- **Assault** ⚔️: Balanced speed & damage, perfect for newcomers
  - Speed: ⭐⭐⭐ | Damage: ⭐⭐⭐ | Health: 100 HP | Ammo: 30
- **Sniper** 🎯: High damage at long range, slower movement
  - Speed: ⭐ | Damage: ⭐⭐⭐⭐⭐ | Health: 75 HP | Ammo: 10
- **Medic** 🏥: Low damage but can heal teammates
  - Speed: ⭐⭐⭐⭐ | Damage: ⭐⭐ | Health: 120 HP | Ammo: 20

### Visual Design
- **Player sprites**: Colored triangles pointing in movement direction
- **Projectiles**: White circles with trailing effects
- **Health bars**: Green-to-red gradient above each player
- **HUD elements**: Health, ammo, role info, and connection status
- **Real-time updates**: Seamless synchronization across all clients

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd fps-arena
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run serve
```

4. Open your browser to `http://localhost:3000`

### Alternative: Express Server
```bash
npm start
```

## Controls

- **Movement**: WASD keys or Arrow keys
- **Shoot**: Spacebar
- **Reload**: R key
- **Heal** (Medic only): H key

## Architecture

### Frontend (public/)
- `index.html`: Main game interface with modals and HUD
- `game.js`: Complete game logic, NunDB integration, and rendering
- `styles.css`: Responsive styling with game-themed design

### Backend Integration
- **NunDB**: Real-time database for player state and game events
- **Collections**: `player:*`, `projectile:*`, `heal:*` with room-based filtering
- **Real-time sync**: Player positions, health, projectiles, and actions

### Game Systems

#### Real-time Synchronization
```javascript
// Player state sync (10 FPS)
setInterval(() => {
    nundb.update(`player:${playerId}`, localPlayer);
}, 100);

// Real-time subscriptions
nundb.subscribe(`player:*`, handlePlayerUpdate);
nundb.subscribe(`projectile:*`, handleProjectileUpdate);
```

#### Role System
```javascript
const ROLES = {
    assault: { speed: 3, damage: 25, maxHealth: 100 },
    sniper: { speed: 1.5, damage: 60, maxHealth: 75 },
    medic: { speed: 3.5, damage: 15, maxHealth: 120 }
};
```

#### Collision Detection
- Wall collision with map boundaries and obstacles
- Projectile-to-wall collision for realistic physics
- Player-to-projectile collision for damage calculation

## Testing

### Playwright E2E Tests

Run all tests:
```bash
npm test
```

Run tests in headed mode:
```bash
npm run test:headed
```

Debug mode:
```bash
npm run test:debug
```

### Test Coverage

#### Name Entry Tests (`name-popup.spec.js`)
- Modal visibility on page load
- Input validation (empty, too short, too long)
- Name submission and role selection flow
- Game initialization after role selection

#### Multiplayer Tests (`multiplayer.spec.js`)
- Two-player game joining
- Real-time player synchronization
- Connection status updates
- Role switching and display
- Canvas rendering validation

### Test Hooks
The game exposes test hooks via `window._test`:
```javascript
window._test = {
    getPlayerName: () => this.playerName,
    isModalVisible: () => !document.getElementById('nameModal').classList.contains('hidden'),
    isGameStarted: () => this.gameStarted,
    getPlayersCount: () => this.players.size,
    getCurrentRole: () => this.currentRole
};
```

## Code Quality

### ESLint
```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

### Code Standards
- ES6+ modules with async/await
- Strict error handling and validation
- Clean separation of concerns
- Comprehensive commenting
- Follows NunDB best practices

## Database Schema

### Player Document
```javascript
{
    id: "player_timestamp_random",
    name: "PlayerName",
    role: "assault|sniper|medic",
    x: 400, y: 300,        // Position
    angle: 1.57,           // Rotation in radians
    health: 100,           // Current health
    maxHealth: 100,        // Role-based max health
    ammo: 30,              // Current ammo
    maxAmmo: 30,           // Role-based max ammo
    isAlive: true,
    roomId: "fps-arena-main"
}
```

### Projectile Document
```javascript
{
    id: "proj_playerId_timestamp",
    x: 450, y: 320,        // Current position
    angle: 0.785,          // Movement direction
    speed: 8,              // Pixels per frame
    damage: 25,            // Role-based damage
    ownerId: "player_id",  // Shooter's ID
    roomId: "fps-arena-main",
    createdAt: 1640995200000
}
```

### Heal Action Document (Medic)
```javascript
{
    healerId: "medic_player_id",
    targetId: "target_player_id",
    amount: 30,            // Heal amount
    roomId: "fps-arena-main",
    timestamp: 1640995200000
}
```

## Performance Optimizations

- **60 FPS rendering**: Optimized canvas drawing with requestAnimationFrame
- **10 FPS sync**: Reduced database writes for better performance
- **Collision optimization**: Efficient wall and projectile collision detection
- **Projectile cleanup**: Automatic removal of expired projectiles
- **Role-based stats**: Pre-calculated role configurations

## Deployment

### Production Build
```bash
npm run serve
```

### Environment Variables
- `PORT`: Server port (default: 3000)
- `NUNDB_URL`: NunDB WebSocket URL
- `NUNDB_TOKEN`: Authentication token

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper tests
4. Run linting and tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Troubleshooting

### Common Issues

**Connection fails**: Check NunDB service availability and network connectivity.

**Players not syncing**: Verify WebSocket connection and room ID consistency.

**Performance issues**: Check browser developer tools for optimization opportunities.

**Test failures**: Ensure NunDB service is running and accessible during tests.

For more help, check the [Issues](https://github.com/repository/issues) section.