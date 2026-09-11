/**
 * PlayerController.js - Handles all player movement, input, and ball interaction
 * Features:
 * - 8-directional movement with smooth acceleration/deceleration
 * - Momentum-based physics for realistic feel
 * - Dribbling mechanics (ball stays near feet with physics separation)
 * - Sprint capability with stamina drain
 * - Passing and shooting input preparation
 */

class PlayerController {
    constructor(scene, position, playerTeam, playerNumber, isLocalPlayer = false) {
        // ===== References =====
        this.scene = scene;
        this.ball = null; // Will be set by game manager
        
        // ===== Transform Data =====
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.currentVelocity = new THREE.Vector3(0, 0, 0);
        this.rotation = 0; // Rotation around Y axis in radians
        
        // ===== Movement Parameters =====
        this.maxSpeed = 12;              // Maximum walking speed (m/s)
        this.maxSprintSpeed = 18;        // Maximum sprint speed (m/s)
        this.acceleration = 20;          // How quickly player reaches max speed
        this.deceleration = 15;          // How quickly player slows down
        this.rotationSpeed = 10;         // Smooth rotation towards movement direction
        this.dribbleSlowDownFactor = 0.85; // Speed reduction when dribbling
        
        // ===== Dribbling Parameters =====
        this.dribbleControlRadius = 1.5;    // How far ball can drift from feet
        this.dribbleDragStrength = 8;       // How strongly player pulls ball back
        this.dribbleMaxBallDistance = 2.5;  // Max distance before losing possession
        
        // ===== Stamina System =====
        this.maxStamina = 100;
        this.currentStamina = 100;
        this.staminaDrainSprint = 30;  // Stamina drain per second while sprinting
        this.staminaRecovery = 15;     // Stamina recovery per second
        this.canSprint = true;
        
        // ===== Input Handling =====
        this.inputDirection = new THREE.Vector2(0, 0);
        this.isSprinting = false;
        this.isDribbling = false;
        
        // ===== Player State =====
        this.playerTeam = playerTeam;
        this.isLocalPlayer = isLocalPlayer;
        this.playerNumber = playerNumber;
        this.hasBallPossession = false;
        this.lastTouchTime = 0;
        
        // ===== 3D Mesh =====
        this.createPlayerMesh();
        
        // ===== Input Keys Tracking =====
        this.keysPressed = {
            W: false,
            A: false,
            S: false,
            D: false,
            Shift: false,
            Space: false,
            Control: false
        };
    }

    /**
     * Create 3D player mesh
     */
    createPlayerMesh() {
        // Create player capsule (simple cylinder + sphere for head)
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 16);
        const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        
        // Team color (Red for Team A, Blue for Team B)
        const teamColor = this.playerTeam === gameStateManager.Team.TeamA ? 0xFF3333 : 0x3366FF;
        const material = new THREE.MeshPhongMaterial({ color: teamColor });
        
        // Create mesh group
        this.mesh = new THREE.Group();
        
        // Body
        const body = new THREE.Mesh(bodyGeometry, material);
        body.position.y = 0.75;
        this.mesh.add(body);
        
        // Head
        const head = new THREE.Mesh(headGeometry, material);
        head.position.y = 1.7;
        this.mesh.add(head);
        
        // Jersey number label
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.playerNumber.toString(), 32, 48);
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.MeshBasicMaterial({ map: texture });
        const labelGeometry = new THREE.PlaneGeometry(0.3, 0.3);
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.set(0, 0.75, 0.31);
        this.mesh.add(label);
        
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    /**
     * Setup input listeners
     */
    setupInputListeners() {
        if (!this.isLocalPlayer) return;

        window.addEventListener('keydown', (e) => {
            const key = e.key.toUpperCase();
            if (key in this.keysPressed) this.keysPressed[key] = true;
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toUpperCase();
            if (key in this.keysPressed) this.keysPressed[key] = false;
        });
    }

    /**
     * Main update loop
     */
    update(deltaTime) {
        if (gameStateManager.getCurrentGameState() === gameStateManager.GameState.Paused) {
            this.currentVelocity.multiplyScalar(0.95);
            return;
        }

        if (this.isLocalPlayer) {
            this.handleInput();
        }

        this.updateStamina(deltaTime);
        this.applyMovement(deltaTime);
        this.handleRotation(deltaTime);
        
        if (this.isDribbling && this.ball) {
            this.applyDribbleControl(deltaTime);
        }

        // Update mesh position
        this.mesh.position.copy(this.position);
        this.mesh.position.y += 0.75; // Adjust for mesh offset
    }

    /**
     * Handle keyboard input
     */
    handleInput() {
        // Get 8-directional input
        let horizontal = 0;
        let vertical = 0;

        if (this.keysPressed.W) vertical += 1;
        if (this.keysPressed.S) vertical -= 1;
        if (this.keysPressed.A) horizontal -= 1;
        if (this.keysPressed.D) horizontal += 1;

        this.inputDirection.set(horizontal, vertical).normalize();

        // Sprint with Shift
        this.isSprinting = this.keysPressed.Shift && this.inputDirection.length() > 0.1 && this.canSprint;

        // Dribbling detection
        if (this.ball) {
            const distanceToBall = this.position.distanceTo(this.ball.getPosition());
            this.isDribbling = 
                distanceToBall < this.dribbleControlRadius && 
                gameStateManager.getCurrentPossession() === this.playerTeam;
        }

        // Passing (Space)
        if (this.keysPressed.Space) {
            if (this.isDribbling) {
                console.log(`Player ${this.playerNumber}: Pass initiated`);
                // Implement pass logic in game manager
            }
        }

        // Shooting (Control)
        if (this.keysPressed.Control) {
            if (this.isDribbling) {
                console.log(`Player ${this.playerNumber}: Shot charging...`);
                // Implement shot logic in game manager
            }
        }
    }

    /**
     * Apply movement physics
     */
    applyMovement(deltaTime) {
        // Determine current max speed
        let currentMaxSpeed = this.isSprinting ? this.maxSprintSpeed : this.maxSpeed;

        // Apply dribble slow-down if holding ball
        if (this.isDribbling) {
            currentMaxSpeed *= this.dribbleSlowDownFactor;
        }

        // Target velocity based on input
        let targetVelocity = new THREE.Vector3(0, 0, 0);
        if (this.inputDirection.length() > 0.1) {
            const moveDirection = new THREE.Vector3(this.inputDirection.x, 0, this.inputDirection.y).normalize();
            targetVelocity = moveDirection.multiplyScalar(currentMaxSpeed);

            // Smooth acceleration
            this.currentVelocity.lerp(targetVelocity, deltaTime * this.acceleration);
        } else {
            // Decelerate when no input
            this.currentVelocity.multiplyScalar(1 - deltaTime * this.deceleration);
        }

        // Apply velocity
        this.position.add(this.currentVelocity.clone().multiplyScalar(deltaTime));
    }

    /**
     * Handle smooth rotation towards movement direction
     */
    handleRotation(deltaTime) {
        if (this.inputDirection.length() < 0.1) return;

        // Calculate target rotation
        const targetRotation = Math.atan2(this.inputDirection.x, this.inputDirection.y);
        
        // Smoothly rotate towards target
        const angleDiff = targetRotation - this.rotation;
        this.rotation += angleDiff * deltaTime * this.rotationSpeed;
        
        // Apply rotation to mesh
        this.mesh.rotation.y = this.rotation;
    }

    /**
     * Apply dribble control to keep ball near player
     */
    applyDribbleControl(deltaTime) {
        const ballPos = this.ball.getPosition();
        const trackingPos = this.position.clone();
        trackingPos.y = ballPos.y; // Adjust for ball height
        
        // Add forward offset based on player velocity
        const forwardOffset = Math.min(this.currentVelocity.length() / this.maxSpeed, 1) * 1;
        const moveDir = this.currentVelocity.clone().normalize();
        if (moveDir.length() > 0) {
            trackingPos.add(moveDir.multiplyScalar(forwardOffset * 0.5));
        }
        
        const distanceVector = trackingPos.clone().sub(ballPos);

        // Pull ball back if drifted
        if (distanceVector.length() > 0.2) {
            const pullForce = distanceVector.normalize().multiplyScalar(this.dribbleDragStrength);
            this.ball.applyForce(pullForce);
        }

        // Lose possession if ball gets too far
        if (distanceVector.length() > this.dribbleMaxBallDistance) {
            this.losePossession();
        }
    }

    /**
     * Update stamina
     */
    updateStamina(deltaTime) {
        if (this.isSprinting && this.currentStamina > 0) {
            this.currentStamina -= this.staminaDrainSprint * deltaTime;
            this.canSprint = this.currentStamina > 10;
        } else {
            this.currentStamina = Math.min(
                this.currentStamina + this.staminaRecovery * deltaTime,
                this.maxStamina
            );
            this.canSprint = true;
        }
    }

    /**
     * Gain ball possession
     */
    gainPossession() {
        this.hasBallPossession = true;
        this.lastTouchTime = gameStateManager.getMatchTimeInSeconds();
        gameStateManager.changePossession(this.playerTeam);
        console.log(`Player ${this.playerNumber} (${this.playerTeam}) gained possession`);
    }

    /**
     * Lose ball possession
     */
    losePossession() {
        this.hasBallPossession = false;
        this.isDribbling = false;
        console.log(`Player ${this.playerNumber} lost possession`);
    }

    /**
     * Execute a ground pass
     */
    performGroundPass(targetDirection, power) {
        if (this.ball && this.isDribbling) {
            this.ball.executeGroundPass(targetDirection.normalize(), power);
            this.losePossession();
        }
    }

    /**
     * Execute a lofted pass
     */
    performLoftedPass(targetDirection, power) {
        if (this.ball && this.isDribbling) {
            this.ball.executeLoftedPass(targetDirection.normalize(), power);
            this.losePossession();
        }
    }

    /**
     * Execute a shot on goal
     */
    performShot(targetDirection, power, accuracyStat = 0.7) {
        if (this.ball && this.isDribbling) {
            this.ball.executeShot(targetDirection.normalize(), power, accuracyStat);
            this.losePossession();
            console.log(`Player ${this.playerNumber} shot with power ${power} and accuracy ${accuracyStat}`);
        }
    }

    // ===== Getters =====
    getStaminaPercent() {
        return this.currentStamina / this.maxStamina;
    }

    getTeam() {
        return this.playerTeam;
    }

    getPlayerNumber() {
        return this.playerNumber;
    }

    getPosition() {
        return this.position.clone();
    }

    getVelocity() {
        return this.currentVelocity.clone();
    }

    getSpeed() {
        return this.currentVelocity.length();
    }

    isDribblingBall() {
        return this.isDribbling;
    }

    hasPossession() {
        return this.hasBallPossession;
    }
}
