# FPS Arena - Demo & Quick Start

## Quick Demo

### 1. Start the Game
```bash
npm install
npm run serve
```

Open `http://localhost:3000` in your browser.

### 2. Join as Player 1
1. Enter your name (e.g., "Player1")
2. Select a role (Assault is pre-selected)
3. Wait 2 seconds for auto-start
4. You're in the game!

### 3. Test Multiplayer (Second Browser/Tab)
1. Open another browser tab/window to `http://localhost:3000`
2. Enter a different name (e.g., "Player2")
3. Select a different role (e.g., Sniper)
4. Both players should see each other in real-time

### 4. Test Game Features

#### Movement
- Use WASD or arrow keys to move around
- Your blue triangle indicates your position and direction

#### Combat
- Press Spacebar to shoot
- White projectiles appear with trailing effects
- Hit other players to damage them

#### Roles
- **Assault**: Balanced stats, good for beginners
- **Sniper**: Slower but higher damage, fewer bullets
- **Medic**: Faster, can heal nearby teammates with H key

#### Visual Elements
- Health bars above each player (green to red)
- Role icons next to players
- Real-time position updates
- Collision with gray walls

## Testing the Features

### Name Entry Modal
1. Refresh the page
2. Modal should appear with name input focused
3. Try empty name (should show error)
4. Try very long name (should show error)
5. Enter valid name and submit

### Role Selection
1. After name entry, role selection appears
2. Click different roles to see selection
3. Each role shows different stats
4. Game starts automatically after 2 seconds

### Real-time Sync
1. Open two browser windows side by side
2. Join with different names
3. Move one player, see it update on the other screen
4. Shoot from one player, see projectile on both screens

### HUD Elements
- Top-left: Player name and role
- Top-right: Health bar and ammo count
- Bottom-left: Controls help
- Bottom-right: Player list
- Top-center: Connection status

## Advanced Testing

### Different Roles
1. Join as Medic
2. Notice different stats (120 HP, 20 ammo)
3. Use H key near teammates to heal
4. See heal button in top-right

### Combat System
1. Shoot at walls (projectiles should disappear)
2. Hit other players (health should decrease)
3. Die and respawn after 3 seconds
4. Test reload with R key

### Performance
- Game runs at 60 FPS (smooth movement/rendering)
- Database sync at 10 FPS (efficient real-time updates)
- Multiple players should perform well

## Troubleshooting Demo

### Connection Issues
- If "Connection Error" appears, check internet connection
- NunDB demo server might be temporarily unavailable
- Game should still work locally for single player

### Performance Issues
- Open browser dev tools (F12)
- Check Console for JavaScript errors
- Check Network tab for connection issues
- Reduce number of open tabs/windows

### Test Failures
```bash
npm test  # Run Playwright tests (requires Node 18+)
```

If tests fail:
1. Ensure server is not already running
2. Check port 3000 is available
3. Verify NunDB service accessibility

## Demo Script for Presentations

### 30-Second Demo
1. "This is a real-time multiplayer FPS game built with NunDB"
2. Enter name, show role selection
3. Move around, show smooth real-time movement
4. Open second window, show second player joining
5. Demonstrate shooting and real-time projectiles

### 2-Minute Demo
1. **Setup** (30s): Show name entry, role selection, explain 3 roles
2. **Single Player** (30s): Movement, shooting, map collision, HUD
3. **Multiplayer** (45s): Second player joins, real-time sync, combat
4. **Advanced** (15s): Role switching, healing (medic), respawning

### Technical Demo
1. **Architecture**: Show NunDB real-time subscriptions in dev tools
2. **Code**: Highlight key game systems (roles, collision, sync)
3. **Performance**: Show 60 FPS rendering, efficient sync
4. **Testing**: Run Playwright tests for reliability

## Development Demo

### Code Quality
```bash
npm run lint      # Show clean code standards
npm run test      # Show comprehensive test coverage
```

### Real-time Features
1. Open browser dev tools → Network tab
2. Show WebSocket connection to NunDB
3. Move player and watch real-time data sync
4. Demonstrate sub-100ms latency

### Scalability
1. Open 3-4 browser windows
2. Join different players
3. Show smooth performance with multiple players
4. Demonstrate room-based isolation

This demo showcases a complete, production-ready real-time multiplayer game with proper testing, code quality, and scalable architecture using NunDB.