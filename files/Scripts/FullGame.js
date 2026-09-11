/**
 * FullGame.js - Complete 3D Soccer Game Engine (All-in-One)
 * Combines GameStateManager, PlayerController, BallPhysics, AIStateMachine, and main game loop
 * Built with HTML5, JavaScript, and Three.js
 */

// ============================================================================
// GAME STATE MANAGER - Singleton for match state and timing
// ============================================================================

class GameStateManager {
    constructor() {
        if (GameStateManager.instance) return GameStateManager.instance;
        
        this.GameState = {
            PreMatch: 'PreMatch',
            KickOff: 'KickOff',
            Gameplay: 'Gameplay',
            HalfTime: 'HalfTime',
            SecondHalf: 'SecondHalf',
            MatchEnd: 'MatchEnd',
            Paused: 'Paused'
        };

        this.Team = {
            TeamA: 'Team A',
            TeamB: 'Team B'
        };

        this.currentGameState = this.GameState.PreMatch;
        this.matchElapsedTime = 0;
        this.REAL_MATCH_DURATION = 360; // 6 real minutes for 90 simulated
        this.SIMULATED_MATCH_DURATION = 5400; // 90 simulated minutes
        this.TIME_SCALE = this.SIMULATED_MATCH_DURATION / this.REAL_MATCH_DURATION; // 15:1

        this.scoreTeamA = 0;
        this.scoreTeamB = 0;
        this.currentPossession = null;
        this.isPaused = false;

        this.eventListeners = {
            gameStateChanged: [],
            scoreChanged: [],
            possessionChanged: [],
            matchTimeChanged: [],
            goalScored: []
        };

        GameStateManager.instance = this;
    }

    static getInstance() {
        if (!GameStateManager.instance) {
            new GameStateManager();
        }
        return GameStateManager.instance;
    }

    startMatch() {
        this.currentGameState = this.GameState.KickOff;
        this.matchElapsedTime = 0;
        this.emit('gameStateChanged', this.currentGameState, this.GameState.PreMatch);
    }

    resumeMatch() {
        this.isPaused = false;
        this.emit('gameStateChanged', this.currentGameState, this.GameState.Paused);
    }

    pauseMatch() {
        this.isPaused = true;
        this.emit('gameStateChanged', this.GameState.Paused, this.currentGameState);
    }

    update(deltaTime) {
        if (this.isPaused) return;

        this.matchElapsedTime += deltaTime * this.TIME_SCALE;
        this.emit('matchTimeChanged', this.matchElapsedTime);

        // Check for state transitions
        if (this.matchElapsedTime >= this.SIMULATED_MATCH_DURATION / 2 && 
            this.currentGameState === this.GameState.Gameplay) {
            this.currentGameState = this.GameState.HalfTime;
            this.emit('gameStateChanged', this.currentGameState, this.GameState.Gameplay);
        }

        if (this.matchElapsedTime >= this.SIMULATED_MATCH_DURATION && 
            this.currentGameState === this.GameState.SecondHalf) {
            this.currentGameState = this.GameState.MatchEnd;
            this.emit('gameStateChanged', this.currentGameState, this.GameState.SecondHalf);
        }

        if (this.currentGameState === this.GameState.KickOff) {
            this.currentGameState = this.GameState.Gameplay;
            this.emit('gameStateChanged', this.currentGameState, this.GameState.KickOff);
        }
    }

    scoreGoal(team) {
        if (team === this.Team.TeamA) {
            this.scoreTeamA++;
        } else {
            this.scoreTeamB++;
        }
        this.emit('scoreChanged', this.scoreTeamA, this.scoreTeamB);
        this.emit('goalScored', team);
    }

    setPossession(team) {
        if (this.currentPossession === team) return;
        const oldTeam = this.currentPossession;
        this.currentPossession = team;
        this.emit('possessionChanged', team, oldTeam);
    }

    getCurrentPossession() {
        return this.currentPossession;
    }

    getCurrentGameState() {
        return this.currentGameState;
    }

    isMatchPausedState() {
        return this.isPaused;
    }

    getMatchTimeInSeconds() {
        return this.matchElapsedTime;
    }

    getMatchTimeFormatted() {
        const minutes = Math.floor(this.matchElapsedTime / 60);
        const seconds = Math.floor(this.matchElapsedTime % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    on(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
    }

    emit(event, ...args) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(...args));
        }
    }
}

const gameStateManager = GameStateManager.getInstance();

// ============================================================================
// BALL PHYSICS - Realistic ball behavior and interactions
// ============================================================================

class BallPhysics {
    constructor(scene, position) {
        this.scene = scene;
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.radius = 0.35;
        this.mass = 0.43;
        this.maxSpeed = 35;
        this.friction = 0.98;
        this.bounceDamping = 0.65;
        this.airResistance = 0.99;
        this.gravity = 9.81;
        this.fieldLength = 100;
        this.fieldWidth = 68;

        this.createMesh();
    }

    createMesh() {
        const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xFFFFFF,
            metalness: 0.3,
            roughness: 0.4
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    update(deltaTime) {
        // Apply gravity
        this.velocity.y -= this.gravity * deltaTime;

        // Apply air resistance
        this.velocity.multiplyScalar(Math.pow(this.airResistance, deltaTime));

        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Ground friction and bounce
        if (this.position.y <= this.radius) {
            this.position.y = this.radius;
            this.velocity.y *= -this.bounceDamping;
            this.velocity.x *= this.friction;
            this.velocity.z *= this.friction;

            if (Math.abs(this.velocity.y) < 0.5) {
                this.velocity.y = 0;
            }
        }

        // Field boundaries
        if (Math.abs(this.position.x) > this.fieldWidth / 2) {
            this.position.x = Math.sign(this.position.x) * (this.fieldWidth / 2);
            this.velocity.x *= -0.5;
        }

        if (Math.abs(this.position.z) > this.fieldLength / 2) {
            this.position.z = Math.sign(this.position.z) * (this.fieldLength / 2);
        }

        // Speed limit
        if (this.velocity.length() > this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed);
        }

        this.mesh.position.copy(this.position);
    }

    performGroundPass(fromPosition, direction, power) {
        this.position.copy(fromPosition);
        this.position.y = 0.5;
        const speed = (power / 100) * 15;
        this.velocity = direction.clone().multiplyScalar(speed);
        this.velocity.y = 2;
    }

    performLoftedPass(fromPosition, direction, power) {
        this.position.copy(fromPosition);
        this.position.y = 0.5;
        this.velocity = direction.clone().multiplyScalar((power / 100) * 12);
        this.velocity.y = (power / 100) * 20;
    }

    performShot(fromPosition, direction, power) {
        this.position.copy(fromPosition);
        this.position.y = 0.5;
        const accuracy = 0.85 + Math.random() * 0.15;
        const errorAngle = (Math.random() - 0.5) * (1 - accuracy) * 0.3;
        const rotatedDir = new THREE.Vector3(
            direction.x * Math.cos(errorAngle) - direction.z * Math.sin(errorAngle),
            direction.y,
            direction.x * Math.sin(errorAngle) + direction.z * Math.cos(errorAngle)
        ).normalize();
        this.velocity = rotatedDir.multiplyScalar((power / 100) * 35);
        this.velocity.y = (power / 100) * 15;
    }

    reset(position) {
        this.position.set(position.x, position.y, position.z);
        this.velocity.set(0, 0, 0);
        this.mesh.position.copy(this.position);
    }

    getPosition() {
        return this.position;
    }

    getVelocity() {
        return this.velocity;
    }

    getSpeed() {
        return this.velocity.length();
    }
}

// ============================================================================
// PLAYER CONTROLLER - Player movement, input, and physics
// ============================================================================

class PlayerController {
    constructor(scene, position, team, playerNumber, isLocal = false) {
        this.scene = scene;
        this.playerNumber = playerNumber;
        this.playerTeam = team;
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.currentVelocity = new THREE.Vector3(0, 0, 0);
        this.rotation = 0;
        this.isLocal = isLocal;
        this.ball = null;

        // Movement params
        this.maxSpeed = 12;
        this.maxSprintSpeed = 18;
        this.acceleration = 20;
        this.deceleration = 15;
        this.dribbleRadius = 1.5;

        // Stamina
        this.maxStamina = 100;
        this.currentStamina = 100;
        this.sprintDrain = 30;
        this.staminaRecovery = 20;

        // Input state
        this.inputState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            sprinting: false,
            passing: false,
            shooting: false
        };

        this.hasPossession = false;
        this.passCharge = 0;
        this.shootCharge = 0;

        this.createMesh();
    }

    createMesh() {
        const geometry = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
        const teamColor = this.playerTeam === gameStateManager.Team.TeamA ? 0xFF3333 : 0x3366FF;
        const material = new THREE.MeshStandardMaterial({ color: teamColor });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // Add jersey number indicator
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = teamColor === 0xFF3333 ? '#FF3333' : '#3366FF';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.playerNumber, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(0.5, 0.5, 1);
        sprite.position.y = 1.2;
        this.mesh.add(sprite);
    }

    setupInputListeners() {
        if (!this.isLocal) return;

        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (key === 'w') this.inputState.forward = true;
        if (key === 's') this.inputState.backward = true;
        if (key === 'a') this.inputState.left = true;
        if (key === 'd') this.inputState.right = true;
        if (key === 'shift') this.inputState.sprinting = true;
        if (key === ' ') { e.preventDefault(); this.performGroundPass(75); }
        if (key === 'control') this.performShot(80);
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        if (key === 'w') this.inputState.forward = false;
        if (key === 's') this.inputState.backward = false;
        if (key === 'a') this.inputState.left = false;
        if (key === 'd') this.inputState.right = false;
        if (key === 'shift') this.inputState.sprinting = false;
    }

    update(deltaTime) {
        this.updateMovement(deltaTime);
        this.updateStamina(deltaTime);
        this.updateBallDribble();
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;
    }

    updateMovement(deltaTime) {
        const moveDirection = new THREE.Vector3(0, 0, 0);

        if (this.inputState.forward) moveDirection.z += 1;
        if (this.inputState.backward) moveDirection.z -= 1;
        if (this.inputState.left) moveDirection.x -= 1;
        if (this.inputState.right) moveDirection.x += 1;

        if (moveDirection.length() > 0) {
            moveDirection.normalize();
            const isSprinting = this.inputState.sprinting && this.currentStamina > 0;
            const targetSpeed = isSprinting ? this.maxSprintSpeed : this.maxSpeed;

            const targetVelocity = moveDirection.clone().multiplyScalar(targetSpeed);
            this.currentVelocity.lerp(targetVelocity, deltaTime * this.acceleration);

            this.rotation = Math.atan2(moveDirection.x, moveDirection.z);

            if (isSprinting) {
                this.currentStamina -= this.sprintDrain * deltaTime;
                if (this.currentStamina < 0) this.currentStamina = 0;
            }
        } else {
            this.currentVelocity.multiplyScalar(Math.pow(0.9, deltaTime * this.deceleration));
        }

        this.position.add(this.currentVelocity.clone().multiplyScalar(deltaTime));
    }

    updateStamina(deltaTime) {
        if (!this.inputState.sprinting) {
            this.currentStamina += this.staminaRecovery * deltaTime;
            if (this.currentStamina > this.maxStamina) {
                this.currentStamina = this.maxStamina;
            }
        }
    }

    updateBallDribble() {
        if (!this.ball || !this.hasPossession) return;

        const ballPos = this.ball.getPosition();
        const direction = ballPos.clone().sub(this.position);
        const distance = direction.length();

        if (distance > this.dribbleRadius) {
            const dribbleTarget = this.position.clone()
                .add(direction.normalize().multiplyScalar(this.dribbleRadius * 0.8));
            this.ball.position.lerp(dribbleTarget, 0.15);
            this.ball.mesh.position.copy(this.ball.position);
        }
    }

    performGroundPass(power) {
        if (!this.hasPossession || !this.ball) return;

        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
        this.ball.performGroundPass(this.position, direction, power);
        this.hasPossession = false;
        gameStateManager.setPossession(null);
    }

    performShot(power) {
        if (!this.hasPossession || !this.ball) return;

        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
        this.ball.performShot(this.position, direction, power);
        this.hasPossession = false;
        gameStateManager.setPossession(null);
    }

    gainPossession() {
        this.hasPossession = true;
        gameStateManager.setPossession(this.playerTeam);
    }

    isDribblingBall() {
        return this.hasPossession;
    }

    getPosition() {
        return this.position.clone();
    }

    getTeam() {
        return this.playerTeam;
    }

    getPlayerNumber() {
        return this.playerNumber;
    }

    getSpeed() {
        return this.currentVelocity.length();
    }

    getStaminaPercent() {
        return this.currentStamina / this.maxStamina;
    }
}

// ============================================================================
// AI STATE MACHINE - Intelligent opponent and teammate logic
// ============================================================================

class AIStateMachine {
    constructor(player) {
        this.player = player;

        this.State = {
            Idle: 'Idle',
            MoveToPosition: 'MoveToPosition',
            ChaseBall: 'ChaseBall',
            DefendSpace: 'DefendSpace',
            Intercept: 'Intercept',
            Support: 'Support'
        };

        this.currentState = this.State.Idle;
        this.previousState = this.State.Idle;
        this.stateTimer = 0;

        this.visionRange = 30;
        this.interceptionThreshold = 2;
        this.supportDistance = 5;
        this.defendRadius = 8;

        this.homePosition = player.position.clone();
        this.targetPosition = player.position.clone();

        this.difficulty = 'medium';
        this.reactionTime = this.getReactionTime();
        this.reactionTimer = 0;
    }

    getReactionTime() {
        switch (this.difficulty) {
            case 'easy': return 0.5;
            case 'medium': return 0.2;
            case 'hard': return 0.05;
            default: return 0.2;
        }
    }

    update(deltaTime, ball, allPlayers) {
        this.reactionTimer += deltaTime;

        if (this.reactionTimer < this.reactionTime) return;

        this.reactionTimer = 0;
        this.stateTimer += deltaTime;

        this.makeDecision(ball, allPlayers);
        this.executeState(deltaTime, ball, allPlayers);
    }

    makeDecision(ball, allPlayers) {
        const ballPos = ball.getPosition();
        const playerPos = this.player.getPosition();
        const distanceToBall = playerPos.distanceTo(ballPos);
        const isTeamInPossession = gameStateManager.getCurrentPossession() === this.player.getTeam();

        if (distanceToBall < this.interceptionThreshold && !isTeamInPossession) {
            this.setState(this.State.Intercept);
        } else if (distanceToBall < this.visionRange && !isTeamInPossession) {
            this.setState(this.State.ChaseBall);
        } else if (isTeamInPossession) {
            const positioningPlayer = this.findPlayerWithBall(allPlayers);
            if (positioningPlayer && positioningPlayer !== this.player) {
                this.setState(this.State.Support);
            } else {
                this.setState(this.State.Idle);
            }
        } else {
            this.setState(this.State.DefendSpace);
        }
    }

    executeState(deltaTime, ball, allPlayers) {
        switch (this.currentState) {
            case this.State.Idle:
                this.executeIdle(deltaTime);
                break;
            case this.State.ChaseBall:
                this.executeChaseBall(deltaTime, ball);
                break;
            case this.State.DefendSpace:
                this.executeDefendSpace(deltaTime, ball);
                break;
            case this.State.Intercept:
                this.executeIntercept(deltaTime, ball);
                break;
            case this.State.Support:
                this.executeSupport(deltaTime, ball, allPlayers);
                break;
        }
    }

    executeIdle(deltaTime) {
        this.player.currentVelocity.multiplyScalar(0.95);
    }

    executeChaseBall(deltaTime, ball) {
        const ballPos = ball.getPosition();
        const playerPos = this.player.getPosition();
        const direction = ballPos.clone().sub(playerPos);
        const distance = direction.length();

        if (distance < 0.5) {
            this.player.gainPossession();
            return;
        }

        const moveDir = direction.normalize();
        this.player.currentVelocity.lerp(
            moveDir.multiplyScalar(this.player.maxSprintSpeed),
            deltaTime * this.player.acceleration * 1.5
        );

        this.player.rotation = Math.atan2(moveDir.x, moveDir.z);
    }

    executeDefendSpace(deltaTime, ball) {
        const ballPos = ball.getPosition();
        const playerPos = this.player.getPosition();

        const defensiveSpot = this.homePosition.clone();
        const threatVector = ballPos.clone().sub(this.homePosition);
        if (threatVector.length() < this.defendRadius) {
            defensiveSpot.add(threatVector.normalize().multiplyScalar(this.defendRadius * 0.5));
        }

        const direction = defensiveSpot.clone().sub(playerPos);
        const distance = direction.length();

        if (distance > 0.3) {
            const moveDir = direction.normalize();
            this.player.currentVelocity.lerp(
                moveDir.multiplyScalar(this.player.maxSpeed * 0.6),
                deltaTime * this.player.acceleration
            );
            this.player.rotation = Math.atan2(moveDir.x, moveDir.z);
        } else {
            this.player.currentVelocity.multiplyScalar(0.9);
        }

        if (ballPos.distanceTo(playerPos) < this.visionRange) {
            const watchDir = ballPos.clone().sub(playerPos).normalize();
            this.player.rotation = Math.atan2(watchDir.x, watchDir.z);
        }
    }

    executeIntercept(deltaTime, ball) {
        const ballPos = ball.getPosition();
        const playerPos = this.player.getPosition();
        const direction = ballPos.clone().sub(playerPos);
        const distance = direction.length();

        const moveDir = direction.normalize();
        this.player.currentVelocity.lerp(
            moveDir.multiplyScalar(this.player.maxSprintSpeed),
            deltaTime * this.player.acceleration * 2
        );

        this.player.rotation = Math.atan2(moveDir.x, moveDir.z);

        if (distance < this.interceptionThreshold && !this.player.isDribblingBall()) {
            this.player.gainPossession();
        }
    }

    executeSupport(deltaTime, ball, allPlayers) {
        const playerWithBall = this.findPlayerWithBall(allPlayers);

        if (!playerWithBall || playerWithBall === this.player) {
            this.setState(this.State.DefendSpace);
            return;
        }

        const supportPos = playerWithBall.getPosition().clone();
        const offset = new THREE.Vector3(
            Math.cos(gameStateManager.getMatchTimeInSeconds()) * this.supportDistance,
            0,
            Math.sin(gameStateManager.getMatchTimeInSeconds() * 0.7) * this.supportDistance * 0.5
        );

        this.targetPosition = supportPos.add(offset);

        const direction = this.targetPosition.clone().sub(this.player.getPosition());
        const distance = direction.length();

        if (distance > 0.5) {
            const moveDir = direction.normalize();
            this.player.currentVelocity.lerp(
                moveDir.multiplyScalar(this.player.maxSpeed * 0.7),
                deltaTime * this.player.acceleration
            );
            this.player.rotation = Math.atan2(moveDir.x, moveDir.z);
        } else {
            this.player.currentVelocity.multiplyScalar(0.95);
        }
    }

    findPlayerWithBall(allPlayers) {
        for (let player of allPlayers) {
            if (player.hasPossession && player.getTeam() === this.player.getTeam()) {
                return player;
            }
        }
        return null;
    }

    setState(newState) {
        if (this.currentState === newState) return;

        this.previousState = this.currentState;
        this.currentState = newState;
        this.stateTimer = 0;
    }

    setHomePosition(position) {
        this.homePosition = position.clone();
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.reactionTime = this.getReactionTime();
    }

    getCurrentState() {
        return this.currentState;
    }
}

// ============================================================================
// SOCCER GAME - Main game loop and initialization
// ============================================================================

class SoccerGame {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.setClearColor(0x1a4d2e);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 30, 50);
        this.camera.lookAt(0, 0, 0);

        this.setupLighting();

        this.ball = null;
        this.players = [];
        this.localPlayer = null;

        this.gameRunning = false;
        this.deltaTime = 0;
        this.lastFrameTime = Date.now();

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

        this.setupEventListeners();
        this.init();
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(50, 80, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);

        const stLight1 = new THREE.PointLight(0xffff99, 0.5);
        stLight1.position.set(-40, 40, 30);
        this.scene.add(stLight1);

        const stLight2 = new THREE.PointLight(0xffff99, 0.5);
        stLight2.position.set(40, 40, 30);
        this.scene.add(stLight2);
    }

    init() {
        console.log('Initializing Soccer Game...');

        this.createField();
        this.ball = new BallPhysics(this.scene, { x: 0, y: 1, z: 0 });
        this.createPlayers();
        this.setupGameStateListeners();

        gameStateManager.startMatch();
        this.gameRunning = true;

        console.log('Game Initialized! Starting match...');
        this.gameLoop();
    }

    createField() {
        const fieldLength = 100;
        const fieldWidth = 68;

        const grassGeometry = new THREE.PlaneGeometry(fieldWidth, fieldLength);
        const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x1a4d2e });
        const field = new THREE.Mesh(grassGeometry, grassMaterial);
        field.rotation.x = -Math.PI / 2;
        field.receiveShadow = true;
        this.scene.add(field);

        const linesMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF, linewidth: 2 });

        const centerLineGeometry = new THREE.BufferGeometry();
        centerLineGeometry.setAttribute('position', new THREE.BufferAttribute(
            new Float32Array([0, 0, -fieldLength/2, 0, 0, fieldLength/2]),
            3
        ));
        const centerLine = new THREE.Line(centerLineGeometry, linesMaterial);
        this.scene.add(centerLine);

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

        this.drawGoalBox(-fieldLength/2 + 18, fieldWidth, linesMaterial);
        this.drawGoalBox(fieldLength/2 - 18, fieldWidth, linesMaterial);

        this.createGoal(-fieldLength/2, 0);
        this.createGoal(fieldLength/2, 0);
    }

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

    createGoal(posZ, posX) {
        const postMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.7 });
        const postGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2.44, 16);

        const leftPost = new THREE.Mesh(postGeometry, postMaterial);
        leftPost.position.set(posX - 3.66, 1.22, posZ);
        this.scene.add(leftPost);

        const rightPost = new THREE.Mesh(postGeometry, postMaterial);
        rightPost.position.set(posX + 3.66, 1.22, posZ);
        this.scene.add(rightPost);

        const crossbarGeometry = new THREE.CylinderGeometry(0.15, 0.15, 7.32, 16);
        const crossbar = new THREE.Mesh(crossbarGeometry, postMaterial);
        crossbar.rotation.z = Math.PI / 2;
        crossbar.position.set(posX, 2.44, posZ);
        this.scene.add(crossbar);
    }

    createPlayers() {
        const teamAPositions = [
            { x: -40, z: 0 }, { x: -20, z: -15 }, { x: -20, z: 15 },
            { x: -10, z: 0 }, { x: 0, z: -20 }, { x: 0, z: 20 },
            { x: 10, z: 0 }, { x: 20, z: -10 }, { x: 20, z: 10 }
        ];

        const teamBPositions = [
            { x: 40, z: 0 }, { x: 20, z: -15 }, { x: 20, z: 15 },
            { x: 10, z: 0 }, { x: 0, z: -20 }, { x: 0, z: 20 },
            { x: -10, z: 0 }, { x: -20, z: -10 }, { x: -20, z: 10 }
        ];

        for (let i = 0; i < teamAPositions.length; i++) {
            const pos = teamAPositions[i];
            const isLocal = i === 6;
            const player = new PlayerController(
                this.scene,
                { x: pos.x, y: 0, z: pos.z },
                gameStateManager.Team.TeamA,
                i + 1,
                isLocal
            );
            player.ball = this.ball;
            if (isLocal) player.setupInputListeners();
            this.players.push(player);

            if (isLocal) {
                this.localPlayer = player;
            } else {
                player.aiStateMachine = new AIStateMachine(player);
                player.aiStateMachine.setHomePosition(new THREE.Vector3(pos.x, 0, pos.z));
            }
        }

        for (let i = 0; i < teamBPositions.length; i++) {
            const pos = teamBPositions[i];
            const player = new PlayerController(
                this.scene,
                { x: pos.x, y: 0, z: pos.z },
                gameStateManager.Team.TeamB,
                i + 1,
                false
            );
            player.ball = this.ball;
            player.aiStateMachine = new AIStateMachine(player);
            player.aiStateMachine.setHomePosition(new THREE.Vector3(pos.x, 0, pos.z));
            this.players.push(player);
        }

        console.log(`Created ${this.players.length} players`);
    }

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

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'p') {
                if (gameStateManager.isMatchPausedState()) {
                    gameStateManager.resumeMatch();
                } else {
                    gameStateManager.pauseMatch();
                }
            }
            if (e.key.toLowerCase() === 'r') {
                location.reload();
            }
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

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

    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());

        const currentTime = Date.now();
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        if (this.deltaTime > 0.1) this.deltaTime = 0.016;

        gameStateManager.update(this.deltaTime);

        if (this.ball) {
            this.ball.update(this.deltaTime);
        }

        for (let player of this.players) {
            player.update(this.deltaTime);

            if (player.aiStateMachine) {
                player.aiStateMachine.update(this.deltaTime, this.ball, this.players);
            }

            const distanceToBall = player.getPosition().distanceTo(this.ball.getPosition());
            if (distanceToBall < 1.5 && gameStateManager.getCurrentPossession() !== player.getTeam()) {
                player.gainPossession();
            }
        }

        if (this.localPlayer) {
            const playerPos = this.localPlayer.getPosition();
            const cameraDistance = 50;
            const cameraHeight = 30;
            this.camera.position.x = playerPos.x + cameraDistance * 0.3;
            this.camera.position.y = playerPos.y + cameraHeight;
            this.camera.position.z = playerPos.z + cameraDistance;
            this.camera.lookAt(playerPos.x, playerPos.y + 5, playerPos.z);
        }

        this.updateUI();
        this.renderer.render(this.scene, this.camera);
    }
}

// Start game when page loads
window.addEventListener('load', () => {
    console.log('DOM loaded, starting game...');
    const game = new SoccerGame();
});
