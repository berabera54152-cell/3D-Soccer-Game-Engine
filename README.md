# 🎮 3D Soccer Game Engine - FIFA/EA Sports FC Style

A fully functional **3D soccer game** built with **HTML5, JavaScript, and Three.js**. Features arcade-simulation hybrid physics, responsive player controls, AI opponents, and realistic ball mechanics.

**Play it now:** Simply open `index.html` in your browser!

---

## 📋 Features

### ✅ Core Gameplay
- **90-minute matches** scaled to 6 real-time minutes (15:1 ratio)
- **Team-based soccer** with 9 players per side (18 total)
- **Real-time score tracking** with possession indicators
- **Multiple game states**: KickOff, Gameplay, HalfTime, MatchEnd, Paused

### 🎮 Player Controls (Team A - Red)
You control a **forward (Jersey #7)** on Team A (Red)

| Key | Action |
|-----|--------|
| **W/A/S/D** | 8-directional movement |
| **SHIFT** | Sprint (drains stamina) |
| **SPACE** | Pass (ground pass - faster, shorter) |
| **CTRL** | Shoot (high power with accuracy-based error) |
| **P** | Pause/Resume |
| **R** | Restart Game |

### ⚽ Ball Physics
- **Ground passes**: Fast, accurate, shorter range (5-15 m/s)
- **Lofted passes**: Slower, longer range, high arc (12 m/s horizontal, 20 m/s vertical)
- **Shooting**: High power (up to 35 m/s) with random error based on player accuracy
- **Realistic bounce**, friction, air resistance, and rolling mechanics
- **Out-of-bounds detection** with goal detection

### 🤖 AI System
- **Finite State Machine** with intelligent decision-making
- **AI States**:
  - **Idle**: Minimal movement
  - **ChaseBall**: Aggressively pursue the ball
  - **DefendSpace**: Protect defensive zone
  - **Intercept**: Attempt to tackle and steal ball
  - **Support**: Move to support teammate with ball
  
- **Difficulty Levels**: Easy, Medium, Hard (affects reaction time and tactical skill)
- **Team A (Red)**: 1 player-controlled + 8 AI
- **Team B (Blue)**: 9 AI opponents

### 🎨 UI/UX
- **Real-time scoreboard** with match time
- **Player stats**: Speed, stamina, possession status
- **Stamina bar** with visual feedback
- **Possession indicator**
- **Game state messages** (KickOff, HalfTime, etc.)
- **On-screen control guide**

---

## 🏗️ Project Structure

```
3D-Soccer-Game-Engine/
├── index.html              # Main game page with UI
├── main.js                 # Game initialization & loop
├── GameStateManager.js     # Match state & timing
├── PlayerController.js     # Player movement & input
├── BallPhysics.js          # Ball physics & interactions
├── AIStateMachine.js       # AI opponent logic
├── package.json            # Project metadata
└── README.md               # This file
```

---

## 🚀 How to Play

### Quick Start
1. **Clone or download** this repository
2. **Open `index.html`** in any modern web browser (Chrome, Firefox, Safari, Edge)
3. **Press any key** to begin (or wait for kickoff)
4. **Use WASD** to move your player (Jersey #7)
5. **Hold SHIFT** to sprint
6. **Press SPACE** for passes, **CTRL** for shots

### Gameplay Tips
- **Dribble close to the ball** - Stay near the ball to maintain possession
- **Pass to teammates** - Look for open players (red jerseys) to pass to
- **Sprint strategically** - Stamina recovers, so manage your energy
- **Defend actively** - Switch to defending players with **Tab** (soon) or watch AI handle defense
- **Shoot from good angles** - Aim at the goal from close range

---

## 💻 Technical Details

### Time Scaling
- **Match Duration**: 90 simulated minutes
- **Real Time**: 6 real-time minutes (360 seconds)
- **Scaling Factor**: 15:1
- **Formula**: `matchElapsedTime += deltaTime * 15`

### Physics Parameters
| Parameter | Value | Notes |
|-----------|-------|-------|
| Max Walking Speed | 12 m/s | |
| Max Sprint Speed | 18 m/s | |
| Ball Max Speed | 35 m/s | |
| Friction (Ground) | 0.98 | Higher = less friction |
| Bounce Damping | 0.65 | Energy loss on impact |
| Air Resistance | 0.99 | Drag coefficient |

### Player Stats
- **Acceleration**: 20 m/s²
- **Deceleration**: 15 m/s²
- **Dribble Radius**: 1.5m (distance ball can drift)
- **Max Stamina**: 100
- **Sprint Drain**: 30/sec

---

## 🎯 Architecture Overview

### GameStateManager
Singleton that manages:
- Match timing (with 15:1 scaling)
- Score tracking
- Possession management
- Game state transitions
- Event broadcasting

### PlayerController
Per-player system handling:
- Input processing (W/A/S/D, Sprint, Pass, Shoot)
- Movement physics (acceleration, deceleration, momentum)
- Dribbling mechanics (ball tracking & control)
- Stamina drain & recovery
- 3D mesh updates

### BallPhysics
Ball behavior including:
- Gravity & bounce physics
- Friction & air resistance
- Pass execution (ground & lofted)
- Shot execution with accuracy-based error
- Field boundary handling
- Collision detection

### AIStateMachine
Intelligent AI opponent logic:
- State-based decision making
- Reaction time (configurable by difficulty)
- Tactical positioning
- Ball pursuit & interception
- Team support coordination

### SoccerGame (main.js)
Core game loop:
- Three.js scene initialization
- Field & goal creation
- Player instantiation
- Game loop management
- Camera following
- UI updates

---

## 🎨 Customization

### Change Player Colors
In `PlayerController.js`, line ~170:
```javascript
const teamColor = this.playerTeam === gameStateManager.Team.TeamA ? 0xFF3333 : 0x3366FF;
// 0xFF3333 = Red (Team A)
// 0x3366FF = Blue (Team B)
```

### Adjust AI Difficulty
In `main.js`, line ~450:
```javascript
player.aiStateMachine.setDifficulty('hard'); // 'easy', 'medium', 'hard'
```

### Modify Physics Parameters
In `BallPhysics.js`:
- `maxSpeed`: Maximum ball speed
- `friction`: Ground friction (0-1)
- `bounceDamping`: Bounce energy loss
- `airResistance`: Air drag

### Change Match Duration
In `GameStateManager.js`, lines ~27-28:
```javascript
this.REAL_MATCH_DURATION = 360;        // 6 real minutes
this.SIMULATED_MATCH_DURATION = 5400;  // 90 simulated minutes
```

---

## 🐛 Known Limitations & Future Improvements

### Current Limitations
- ⚠️ No pass/shoot charging UI (implemented in code, awaiting UI integration)
- ⚠️ No player switching (fixed on one forward)
- ⚠️ Limited stadium details (basic field & goals)
- ⚠️ No sound effects or music
- ⚠️ No replay system
- ⚠️ Minimal animation (players are simple capsules)

### Planned Features
- 🔄 Player switching system (Tab key)
- 🎯 Pass/shoot meter UI
- 🎬 Action replay system
- 🎵 Audio effects and crowd ambiance
- 🏟️ Enhanced stadium graphics
- 📊 Player statistics tracking
- 🎓 Tutorial mode
- 🌐 Multiplayer support (future)

---

## 🎮 Controls Reference

### Movement & Sprint
| Input | Action |
|-------|--------|
| W | Move Forward |
| S | Move Backward |
| A | Move Left |
| D | Move Right |
| SHIFT | Sprint (while moving) |

### Ball Interaction
| Input | Action |
|-------|--------|
| SPACE | Ground Pass (short range, fast) |
| CTRL | Shoot (high power) |

### Game Control
| Input | Action |
|-------|--------|
| P | Pause / Resume |
| R | Restart Game |
| ESC | (Pause menu - future) |

---

## 📊 File Sizes & Performance

| File | Size | Purpose |
|------|------|---------|
| index.html | ~8.5 KB | Main page & UI |
| main.js | ~14 KB | Game loop & initialization |
| GameStateManager.js | ~7.3 KB | State management |
| PlayerController.js | ~12 KB | Player physics & input |
| BallPhysics.js | ~10.4 KB | Ball mechanics |
| AIStateMachine.js | ~11 KB | AI logic |
| **Total** | **~63 KB** | Lightweight & fast |

**Three.js Library**: ~200 KB (CDN, minified)

### Performance
- **Target FPS**: 60 fps
- **Recommended**: Modern browser with WebGL support
- **Tested on**: Chrome, Firefox, Safari, Edge

---

## 🛠️ Browser Requirements

- **Modern web browser** with WebGL support
- **JavaScript enabled**
- **No additional installations** needed!

### Supported Browsers
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+

---

## 📝 Code Examples

### Creating a Player
```javascript
const player = new PlayerController(
    scene,
    { x: 0, y: 0, z: 0 },           // Position
    gameStateManager.Team.TeamA,      // Team
    7,                                // Jersey number
    true                              // Is local player?
);
```

### Executing a Pass
```javascript
player.performGroundPass(
    new THREE.Vector3(1, 0, 0).normalize(),  // Direction
    75                                        // Power (0-100)
);
```

### Checking Game State
```javascript
if (gameStateManager.getCurrentGameState() === gameStateManager.GameState.Gameplay) {
    // Game is active
}
```

---

## 📜 License

MIT License - Feel free to use, modify, and distribute!

---

## 🤝 Contributing

Found a bug? Have an idea for improvement?
1. Test it thoroughly
2. Document the issue
3. Suggest improvements

---

## 🎓 Learning Resources

- **Three.js**: https://threejs.org/
- **Game Physics**: https://www.youtube.com/watch?v=XdvwAeYc3Oo
- **AI State Machines**: https://gameprogrammingpatterns.com/state.html
- **3D Game Development**: https://www.udemy.com/course/game-development/

---

## 🎉 Credits

Built as a **FIFA/EA Sports FC-inspired** 3D soccer simulation with:
- **Three.js** for 3D rendering
- **Vanilla JavaScript** for game logic
- **Custom physics engine** for realistic ball mechanics
- **Finite State Machine AI** for intelligent opponents

Enjoy the game! ⚽🎮

---

**Last Updated**: September 2026  
**Version**: 1.0.0  
**Status**: Fully Playable ✅
