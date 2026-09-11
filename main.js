/**
 * main.js - Main game loop and initialization
 * Initializes Three.js scene, creates players, manages game flow
 */

class SoccerGame {
    constructor() {
        // ===== Canvas & Renderer =====
        this.canvas = document.getElementById('canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.setClearColor(0x1a4d2e);

        // ===== Scene Setup =====
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

        // ===== Camera =====
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 30, 50);
        this.camera.lookAt(0, 0, 0);

        // ===== Lighting =====
        this.setupLighting();

        // ===== Game Objects =====
        this.ball = null;
        this.players = [];
        this.localPlayer = null;

        // ===== Game State =====
        this.gameRunning = false;
        this.deltaTime = 0;
        this.lastFrameTime = Date.now();

        // ===== UI References =====
        this.uiElements = {
            scoreTeamA: document.getElementById('scoreTeamA'),
            scoreTeamB: document.getElementById('scoreTeamB'),
            matchTime: document.getElementById('matchTime'),
            playerNum: document.getElementById('playerNum'),
            playerTeam: document.getElementById('playerTeam'),
            playerSpeed: document.getElementById('playerSpeed'),
            playerStatus: document.getElementById('playerStatus'),
            staminaFill: document.getElementById('staminaFill'),
            possessionTeam: document.getElementById('possessionTeam'),
            gameState: document.getElementById('gameState')
        };

        // ===== Event Listeners =====
        this.setupEventListeners();

        // ===== Initialize Game =====
        this.init();
    }

    /**
     * Setup lighting
     */
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(50, 80, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);

        // Point lights for stadium effect
        const stLight1 = new THREE.PointLight(0xffff99, 0.5);
        stLight1.position.set(-40, 40, 30);
        this.scene.add(stLight1);

        const stLight2 = new THREE.PointLight(0xffff99, 0.5);
        stLight2.position.set(40, 40, 30);
        this.scene.add(stLight2);
    }

    /**
     * Initialize game scene
     */
    init() {
        console.log('Initializing Soccer Game...');

        // Create field
        this.createField();

        // Create ball
        this.ball = new BallPhysics(this.scene, { x: 0, y: 1, z: 0 });

        // Create players
        this.createPlayers();

        // Setup game state manager listeners
        this.setupGameStateListeners();

        // Start game
        gameStateManager.startMatch();
        this.gameRunning = true;

        console.log('Game Initialized! Starting match...');

        // Start game loop
        this.gameLoop();
    }

    /**
     * Create soccer field
     */
    createField() {
        // Field dimensions
        const fieldLength = 100;
        const fieldWidth = 68;

        // Grass
        const grassGeometry = new THREE.PlaneGeometry(fieldWidth, fieldLength);
        const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x1a4d2e });
        const field = new THREE.Mesh(grassGeometry, grassMaterial);
        field.rotation.x = -Math.PI / 2;
        field.receiveShadow = true;
        this.scene.add(field);

        // Field lines
        const linesMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF, linewidth: 2 });

        // Center line
        const centerLineGeometry = new THREE.BufferGeometry();
        centerLineGeometry.setAttribute('position', new THREE.BufferAttribute(
            new Float32Array([0, 0, -fieldLength/2, 0, 0, fieldLength/2]),
            3
        ));
        const centerLine = new THREE.Line(centerLineGeometry, linesMaterial);
        this.scene.add(centerLine);

        // Center circle
        const circleGeometry = new THREE.BufferGeometry();
        const circlePoints = [];
        const radius = 9;
        for (let i = 0; i <= 64; i++) {
            const angle = (i / 64) * Math.PI * 2;
            circlePoints.push(
                Math.cos(angle) * radius,
                0.01,
                Math.sin(angle) * radius
            );
        }
        circleGeometry.setAttribute('position', new THREE.BufferAttribute(
            new Float32Array(circlePoints),
            3
        ));
        const centerCircle = new THREE.Line(circleGeometry, linesMaterial);
        this.scene.add(centerCircle);

        // Goal areas
        const goalBoxWidth = 44;
        const goalBoxLength = 18;

        // Draw goal boxes
        this.drawGoalBox(-fieldLength/2 + goalBoxLength, goalBoxWidth, linesMaterial);
        this.drawGoalBox(fieldLength/2 - goalBoxLength, goalBoxWidth, linesMaterial);

        // Goals (simple posts)
        this.createGoal(-fieldLength/2, 0);
        this.createGoal(fieldLength/2, 0);
    }

    /**
     * Draw goal box lines
     */
    drawGoalBox(centerZ, width, material) {
        const length = 18;
        const x = width / 2;

        const geometry = new THREE.BufferGeometry();
        const points = [
            [-x, 0, centerZ - length], [x, 0, centerZ - length],
            [x, 0, centerZ - length], [x, 0, centerZ],
            [x, 0, centerZ], [-x, 0, centerZ],
            [-x, 0, centerZ], [-x, 0, centerZ - length]
        ];

        const positionArray = new Float32Array(points.flat());
        geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
        const line = new THREE.LineSegments(geometry, material);
        this.scene.add(line);
    }

    /**
     * Create goal posts
     */
    createGoal(posZ, posX) {
        const postMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.7 });
        const postGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2.44, 16);

        // Goal posts
        const leftPost = new THREE.Mesh(postGeometry, postMaterial);
        leftPost.position.set(posX - 3.66, 1.22, posZ);
        this.scene.add(leftPost);

        const rightPost = new THREE.Mesh(postGeometry, postMaterial);
        rightPost.position.set(posX + 3.66, 1.22, posZ);
        this.scene.add(rightPost);

        // Crossbar
        const crossbarGeometry = new THREE.CylinderGeometry(0.15, 0.15, 7.32, 16);
        const crossbar = new THREE.Mesh(crossbarGeometry, postMaterial);
        crossbar.rotation.z = Math.PI / 2;
        crossbar.position.set(posX, 2.44, posZ);
        this.scene.add(crossbar);
    }

    /**
     * Create all players
     */
    createPlayers() {
        const teamAPositions = [
            { x: -40, z: 0 },    // GK
            { x: -20, z: -15 },  // DEF
            { x: -20, z: 15 },   // DEF
            { x: -10, z: 0 },    // MID
            { x: 0, z: -20 },    // MID
            { x: 0, z: 20 },     // MID
            { x: 10, z: 0 },     // FWD
            { x: 20, z: -10 },   // FWD
            { x: 20, z: 10 }     // FWD
        ];

        const teamBPositions = [
            { x: 40, z: 0 },     // GK
            { x: 20, z: -15 },   // DEF
            { x: 20, z: 15 },    // DEF
            { x: 10, z: 0 },     // MID
            { x: 0, z: -20 },    // MID
            { x: 0, z: 20 },     // MID
            { x: -10, z: 0 },    // FWD
            { x: -20, z: -10 },  // FWD
            { x: -20, z: 10 }    // FWD
        ];

        // Create Team A
        for (let i = 0; i < teamAPositions.length; i++) {
            const pos = teamAPositions[i];
            const isLocal = i === 6; // Make forward (7) the player-controlled character
            const player = new PlayerController(
                this.scene,
                { x: pos.x, y: 0, z: pos.z },
                gameStateManager.Team.TeamA,
                i + 1,
                isLocal
            );
            player.ball = this.ball;
            player.setupInputListeners();
            this.players.push(player);

            if (isLocal) {
                this.localPlayer = player;
            } else {
                // Add AI to non-local players
                player.aiStateMachine = new AIStateMachine(player);
                player.aiStateMachine.setHomePosition(new THREE.Vector3(pos.x, 0, pos.z));
            }
        }

        // Create Team B
        for (let i = 0; i < teamBPositions.length; i++) {
            const pos = teamBPositions[i];
            const player = new PlayerController(
                this.scene,
                { x: pos.x, y: 0, z: pos.z },
                gameStateManager.Team.TeamB,
                i + 1,
                false // All Team B is AI
            );
            player.ball = this.ball;
            player.aiStateMachine = new AIStateMachine(player);
            player.aiStateMachine.setHomePosition(new THREE.Vector3(pos.x, 0, pos.z));
            this.players.push(player);
        }

        console.log(`Created ${this.players.length} players`);
    }

    /**
     * Setup game state event listeners
     */
    setupGameStateListeners() {
        gameStateManager.on('gameStateChanged', (newState, oldState) => {
            console.log(`Game State: ${oldState} -> ${newState}`);
            if (newState === gameStateManager.GameState.KickOff) {
                this.ball.reset({ x: 0, y: 0.5, z: 0 });
            }
        });

        gameStateManager.on('scoreChanged', (teamAScore, teamBScore) => {
            this.uiElements.scoreTeamA.textContent = teamAScore;
            this.uiElements.scoreTeamB.textContent = teamBScore;
        });

        gameStateManager.on('possessionChanged', (newTeam, oldTeam) => {
            this.uiElements.possessionTeam.textContent = newTeam || '-';
        });

        gameStateManager.on('matchTimeChanged', (matchTime) => {
            this.uiElements.matchTime.textContent = gameStateManager.getMatchTimeFormatted();
        });
    }

    /**
     * Setup input event listeners
     */
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());

        // Pause/Resume with P key
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'p') {
                if (gameStateManager.isMatchPausedState()) {
                    gameStateManager.resumeMatch();
                } else {
                    gameStateManager.pauseMatch();
                }
            }
            // Restart with R key
            if (e.key.toLowerCase() === 'r') {
                location.reload();
            }
        });
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Update UI
     */
    updateUI() {
        if (!this.localPlayer) return;

        this.uiElements.playerNum.textContent = this.localPlayer.getPlayerNumber();
        this.uiElements.playerTeam.textContent = this.localPlayer.getTeam();
        this.uiElements.playerSpeed.textContent = this.localPlayer.getSpeed().toFixed(1);
        this.uiElements.staminaFill.style.width = (this.localPlayer.getStaminaPercent() * 100) + '%';
        
        if (this.localPlayer.isDribblingBall()) {
            this.uiElements.playerStatus.textContent = 'Dribbling';
        } else if (gameStateManager.getCurrentPossession() === this.localPlayer.getTeam()) {
            this.uiElements.playerStatus.textContent = 'Has Possession';
        } else {
            this.uiElements.playerStatus.textContent = 'Ready';
        }
    }

    /**
     * Main game loop
     */
    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());

        // Calculate delta time
        const currentTime = Date.now();
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        if (this.deltaTime > 0.1) this.deltaTime = 0.016; // Cap deltaTime

        // ===== Update Game Logic =====
        gameStateManager.update(this.deltaTime);

        // Update ball physics
        if (this.ball) {
            this.ball.update(this.deltaTime);
        }

        // Update players
        for (let player of this.players) {
            player.update(this.deltaTime);

            // Update AI
            if (player.aiStateMachine) {
                player.aiStateMachine.update(this.deltaTime, this.ball, this.players);
            }

            // Check for ball collision
            const distanceToBall = player.getPosition().distanceTo(this.ball.getPosition());
            if (distanceToBall < 1.5 && gameStateManager.getCurrentPossession() !== player.getTeam()) {
                player.gainPossession();
            }
        }

        // Update camera to follow local player
        if (this.localPlayer) {
            const playerPos = this.localPlayer.getPosition();
            const cameraDistance = 50;
            const cameraHeight = 30;
            this.camera.position.x = playerPos.x + cameraDistance * 0.3;
            this.camera.position.y = playerPos.y + cameraHeight;
            this.camera.position.z = playerPos.z + cameraDistance;
            this.camera.lookAt(playerPos.x, playerPos.y + 5, playerPos.z);
        }

        // Update UI
        this.updateUI();

        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// ===== Start Game =====
window.addEventListener('load', () => {
    console.log('DOM loaded, starting game...');
    const game = new SoccerGame();
});
