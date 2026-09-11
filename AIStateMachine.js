/**
 * AIStateMachine.js - Finite State Machine for AI players (teammates and opponents)
 * States: MoveToPosition, ChaseBall, DefendSpace, Intercept, Idle
 * AI makes decisions based on ball position, possession, and team formation
 */

class AIStateMachine {
    constructor(player) {
        this.player = player;
        
        // ===== AI States =====
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
        
        // ===== AI Parameters =====
        this.visionRange = 30; // How far AI can "see" the ball
        this.interceptionThreshold = 2; // Distance to attempt interception
        this.supportDistance = 5; // How close to stay to teammate with ball
        this.defendRadius = 8; // Area to defend
        
        // ===== Tactical Positioning =====
        this.homePosition = player.position.clone(); // Default position
        this.targetPosition = player.position.clone();
        
        // ===== AI Difficulty =====
        this.difficulty = 'medium'; // 'easy', 'medium', 'hard'
        this.reactionTime = this.getReactionTime();
        this.reactionTimer = 0;
    }

    /**
     * Get reaction time based on difficulty
     */
    getReactionTime() {
        switch (this.difficulty) {
            case 'easy': return 0.5;
            case 'medium': return 0.2;
            case 'hard': return 0.05;
            default: return 0.2;
        }
    }

    /**
     * Main AI update loop
     */
    update(deltaTime, ball, allPlayers) {
        this.reactionTimer += deltaTime;
        
        // Only make decisions at intervals based on difficulty
        if (this.reactionTimer < this.reactionTime) return;
        
        this.reactionTimer = 0;
        this.stateTimer += deltaTime;

        // ===== Decision Making =====
        this.makeDecision(ball, allPlayers);
        
        // ===== Execute Current State =====
        this.executeState(deltaTime, ball, allPlayers);
    }

    /**
     * Make state decisions based on game situation
     */
    makeDecision(ball, allPlayers) {
        const ballPos = ball.getPosition();
        const playerPos = this.player.getPosition();
        const distanceToBall = playerPos.distanceTo(ballPos);
        const isTeamInPossession = gameStateManager.getCurrentPossession() === this.player.getTeam();

        // ===== State Transitions =====
        if (distanceToBall < this.interceptionThreshold && !isTeamInPossession) {
            // Enemy ball is very close - try to intercept
            this.setState(this.State.Intercept);
        } 
        else if (distanceToBall < this.visionRange && !isTeamInPossession) {
            // Ball is visible and enemy has it - chase it
            this.setState(this.State.ChaseBall);
        }
        else if (isTeamInPossession) {
            // Our team has ball - move to support or defend space
            const positioningPlayer = this.findPlayerWithBall(allPlayers);
            if (positioningPlayer && positioningPlayer !== this.player) {
                this.setState(this.State.Support);
            } else {
                this.setState(this.State.Idle);
            }
        }
        else {
            // No clear objective - return to defensive position
            this.setState(this.State.DefendSpace);
        }
    }

    /**
     * Execute behavior based on current state
     */
    executeState(deltaTime, ball, allPlayers) {
        switch (this.currentState) {
            case this.State.Idle:
                this.executeIdle(deltaTime);
                break;
            case this.State.MoveToPosition:
                this.executeMoveToPosition(deltaTime);
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

    /**
     * IDLE - Stay in place, minimal movement
     */
    executeIdle(deltaTime) {
        // Slowly decelerate
        this.player.currentVelocity.multiplyScalar(0.95);
    }

    /**
     * MOVE TO POSITION - Navigate to a target location
     */
    executeMoveToPosition(deltaTime) {
        const direction = this.targetPosition.clone().sub(this.player.getPosition());
        const distance = direction.length();

        if (distance < 0.5) {
            // Reached target
            this.player.currentVelocity.multiplyScalar(0.9);
            return;
        }

        // Move towards target
        const moveDir = direction.normalize();
        this.player.currentVelocity.lerp(
            moveDir.multiplyScalar(this.player.maxSpeed * 0.8),
            deltaTime * this.player.acceleration
        );
    }

    /**
     * CHASE BALL - Run towards the ball aggressively
     */
    executeChaseBall(deltaTime, ball) {
        const ballPos = ball.getPosition();
        const playerPos = this.player.getPosition();
        const direction = ballPos.clone().sub(playerPos);
        const distance = direction.length();

        if (distance < 0.5) {
            // Reached ball
            this.player.gainPossession();
            return;
        }

        // Sprint towards ball
        const moveDir = direction.normalize();
        const targetSpeed = this.player.maxSprintSpeed;
        this.player.currentVelocity.lerp(
            moveDir.multiplyScalar(targetSpeed),
            deltaTime * this.player.acceleration * 1.5 // Faster acceleration when chasing
        );

        // Update rotation
        this.player.rotation = Math.atan2(moveDir.x, moveDir.z);
    }

    /**
     * DEFEND SPACE - Protect a zone on the field
     */
    executeDefendSpace(deltaTime, ball) {
        const ballPos = ball.getPosition();
        const playerPos = this.player.getPosition();
        
        // Find good defensive position between home and ball
        const defensiveSpot = this.homePosition.clone();
        
        // Adjust towards ball if it's threatening
        const threatVector = ballPos.clone().sub(this.homePosition);
        if (threatVector.length() < this.defendRadius) {
            defensiveSpot.add(threatVector.normalize().multiplyScalar(this.defendRadius * 0.5));
        }

        // Move to defensive position
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

        // Watch the ball and be ready to intercept
        if (ballPos.distanceTo(playerPos) < this.visionRange) {
            const watchDir = ballPos.clone().sub(playerPos).normalize();
            this.player.rotation = Math.atan2(watchDir.x, watchDir.z);
        }
    }

    /**
     * INTERCEPT - Attempt to take the ball from opponent
     */
    executeIntercept(deltaTime, ball) {
        const ballPos = ball.getPosition();
        const playerPos = this.player.getPosition();
        const direction = ballPos.clone().sub(playerPos);
        const distance = direction.length();

        // Aggressive movement towards ball
        const moveDir = direction.normalize();
        this.player.currentVelocity.lerp(
            moveDir.multiplyScalar(this.player.maxSprintSpeed),
            deltaTime * this.player.acceleration * 2
        );

        this.player.rotation = Math.atan2(moveDir.x, moveDir.z);

        // Check for successful tackle
        if (distance < this.interceptionThreshold && !this.player.isDribblingBall()) {
            this.player.gainPossession();
            console.log(`AI Player ${this.player.playerNumber} intercepted the ball!`);
        }
    }

    /**
     * SUPPORT - Move to support teammate with ball
     */
    executeSupport(deltaTime, ball, allPlayers) {
        const playerWithBall = this.findPlayerWithBall(allPlayers);
        
        if (!playerWithBall || playerWithBall === this.player) {
            this.setState(this.State.DefendSpace);
            return;
        }

        const supportPos = playerWithBall.getPosition().clone();
        
        // Move to side or behind player with ball
        const offset = new THREE.Vector3(
            Math.cos(gameStateManager.getMatchTimeInSeconds()) * this.supportDistance,
            0,
            Math.sin(gameStateManager.getMatchTimeInSeconds() * 0.7) * this.supportDistance * 0.5
        );

        this.targetPosition = supportPos.add(offset);

        // Move to support position
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

    /**
     * Find player with ball possession
     */
    findPlayerWithBall(allPlayers) {
        for (let player of allPlayers) {
            if (player.hasPossession && player.getTeam() === this.player.getTeam()) {
                return player;
            }
        }
        return null;
    }

    /**
     * Change AI state
     */
    setState(newState) {
        if (this.currentState === newState) return;

        this.previousState = this.currentState;
        this.currentState = newState;
        this.stateTimer = 0;

        console.log(`AI Player ${this.player.playerNumber}: ${this.previousState} -> ${this.currentState}`);
    }

    /**
     * Set home position for defensive AI
     */
    setHomePosition(position) {
        this.homePosition = position.clone();
    }

    /**
     * Set AI difficulty
     */
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.reactionTime = this.getReactionTime();
    }

    /**
     * Get current state
     */
    getCurrentState() {
        return this.currentState;
    }
}
