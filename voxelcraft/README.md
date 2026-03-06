# VoxelCraft - Multiplayer Voxel Game

A real-time multiplayer voxel-based building game inspired by Minecraft, powered by NunDB for instant synchronization between players.

## Features

- **3D Voxel World**: Build and destroy blocks in a 3D environment
- **Real-time Multiplayer**: See other players' actions instantly
- **Multiple Block Types**: Grass, dirt, stone, wood, and more
- **Player Movement**: WASD + Space/Shift controls
- **Chat System**: Communicate with other players
- **Persistent World**: World state is saved and synchronized via NunDB

## How to Play

1. Open the game in your browser
2. Enter your username
3. Use mouse to look around
4. Left-click to destroy blocks
5. Right-click to place blocks
6. Number keys (1-9) to select block types
7. Press T to open chat

## Controls

- **WASD**: Move forward/backward/left/right
- **Space**: Jump
- **Shift**: Crouch/descend
- **Mouse**: Look around
- **Left Click**: Destroy block
- **Right Click**: Place block
- **1-9**: Select block type
- **T**: Open chat
- **Enter**: Send chat message
- **Escape**: Close chat

## Installation

```bash
npm install
npm start
```

Then open http://localhost:3000 in your browser.

## Running Tests

```bash
npm test
```

## Architecture

The game uses:
- **Three.js** for 3D rendering
- **NunDB** for real-time data synchronization
- **Express** for serving static files
- **Jest** for unit testing

## NunDB Integration

VoxelCraft uses NunDB to synchronize:
- World blocks (additions and removals)
- Player positions and rotations
- Chat messages
- Player list and states

Each game room has its own isolated world state using NunDB's key prefixing.