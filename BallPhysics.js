/**
 * BallPhysics.js - Handles all ball physics, bounce, friction, drag, and interactions
 * Supports ground passes, lofted passes, and shooting with power calculation
 */

class BallPhysics {
    constructor(scene, position = { x: 0, y: 0, z: 0 }) {
        // ===== References =====
        this.scene = scene;
        
        // ===== Ball Properties =====
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, -9.81, 0); // Gravity
        
        // ===== Physics Parameters =====
        this.mass = 0.43; // Standard soccer ball mass in kg
        this.radius = 0.22; // Standard soccer ball radius in meters
        this.maxSpeed = 35; // Maximum ball speed (m/s)
        this.friction = 0.98; // Ground friction (0-1, higher = less friction)
        this.airResistance = 0.99; // Air drag (0-1, higher = less resistance)
        this.bounceDamping = 0.65; // Energy loss on bounce (0-1)
        this.rollingFriction = 0.02; // Additional friction when rolling
        
        // ===== Ball State =====
        this.isGrounded = false;
        this.lastGroundY = 0;
        this.spinAxis = new THREE.Vector3(0, 0, 0);
        this.spinMagnitude = 0;
        
        // ===== Field Boundaries =====
        this.fieldWidth = 100;
        this.fieldLength = 68;
        this.fieldHeight = 50;
        
        // ===== Create 3D Mesh =====
        this.createBallMesh();
    }

    /**
     * Create a 3D sphere mesh for the ball
     */
    createBallMesh() {
        const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
        
        // Create material with white panels (like a soccer ball)
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Draw soccer ball texture (simple white with black pentagons pattern)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('SOCCER', 150, 250);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshPhongMaterial({ 
            map: texture,
            shininess: 100
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    /**
     * Main physics update loop
     */
    update(deltaTime) {
        if (deltaTime > 0.1) deltaTime = 0.016; // Cap deltaTime to prevent tunneling

        // ===== Apply Forces =====
        // Gravity
        this.velocity.y += this.acceleration.y * deltaTime;
        
        // Air resistance
        this.velocity.multiplyScalar(this.airResistance);
        
        // ===== Ground Collision =====
        this.handleGroundCollision();
        
        // ===== Update Position =====
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        
        // ===== Field Boundaries =====
        this.handleFieldBoundaries();
        
        // ===== Clamp Speed =====
        if (this.velocity.length() > this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed);
        }
        
        // ===== Update Mesh Position =====
        this.mesh.position.copy(this.position);
        
        // Rotate ball based on velocity (spin effect)
        if (this.velocity.length() > 0.1) {
            const rotationAxis = new THREE.Vector3(
                -this.velocity.z * 0.01,
                0,
                this.velocity.x * 0.01
            );
            this.mesh.rotateOnWorldAxis(rotationAxis.normalize(), rotationAxis.length());
        }
    }

    /**
     * Handle collision with the ground
     */
    handleGroundCollision() {
        const groundLevel = 0;
        
        if (this.position.y <= groundLevel + this.radius) {
            // Ball is on or below ground
            this.position.y = groundLevel + this.radius;
            this.isGrounded = true;
            
            if (this.velocity.y < -1) {
                // Bounce
                this.velocity.y *= -this.bounceDamping;
            } else {
                // Stop vertical movement
                this.velocity.y = 0;
            }
            
            // Apply ground friction
            this.velocity.x *= this.friction;
            this.velocity.z *= this.friction;
            
            // Rolling friction (additional)
            const horizontalSpeed = Math.sqrt(
                this.velocity.x ** 2 + this.velocity.z ** 2
            );
            if (horizontalSpeed > 0.1) {
                this.velocity.multiplyScalar(1 - this.rollingFriction);
            }
        } else {
            this.isGrounded = false;
        }
    }

    /**
     * Handle ball going out of bounds
     */
    handleFieldBoundaries() {
        // Side boundaries (touchline)
        if (Math.abs(this.position.x) > this.fieldWidth / 2) {
            this.position.x = Math.sign(this.position.x) * (this.fieldWidth / 2);
            this.velocity.x *= -0.5; // Partial bounce
        }
        
        // Goal line
        if (Math.abs(this.position.z) > this.fieldLength / 2) {
            this.position.z = Math.sign(this.position.z) * (this.fieldLength / 2);
            this.velocity.z *= -0.5;
        }
        
        // Top boundary
        if (this.position.y > this.fieldHeight) {
            this.position.y = this.fieldHeight;
            this.velocity.y *= -this.bounceDamping;
        }
    }

    /**
     * Execute a ground pass - faster, more accurate, shorter range
     * @param {THREE.Vector3} direction - Direction of the pass (normalized)
     * @param {number} power - Pass power (0-100)
     */
    executeGroundPass(direction, power) {
        // Normalize direction
        direction = direction.normalize();
        
        // Ground pass: power translates to speed (typical 5-15 m/s)
        const speed = (power / 100) * 15;
        
        this.velocity.set(
            direction.x * speed,
            0.5, // Slight lift to ensure clean roll
            direction.z * speed
        );
        
        console.log(`Ground Pass executed with power ${power} (${speed.toFixed(2)} m/s)`);
    }

    /**
     * Execute a lofted pass - slower, longer range, high arc
     * @param {THREE.Vector3} direction - Direction of the pass (normalized)
     * @param {number} power - Pass power (0-100)
     */
    executeLoftedPass(direction, power) {
        // Normalize direction
        direction = direction.normalize();
        
        // Lofted pass: lower horizontal speed but significant vertical component
        const horizontalSpeed = (power / 100) * 12;
        const verticalSpeed = (power / 100) * 20; // Higher arc
        
        this.velocity.set(
            direction.x * horizontalSpeed,
            verticalSpeed,
            direction.z * horizontalSpeed
        );
        
        console.log(`Lofted Pass executed with power ${power} (${horizontalSpeed.toFixed(2)} m/s horizontal, ${verticalSpeed.toFixed(2)} m/s vertical)`);
    }

    /**
     * Execute a shot on goal - high power with random error
     * @param {THREE.Vector3} direction - Direction towards goal (normalized)
     * @param {number} power - Shot power (0-100)
     * @param {number} accuracy - Accuracy stat (0-1, higher is more accurate)
     */
    executeShot(direction, power, accuracy = 0.7) {
        // Normalize direction
        direction = direction.normalize();
        
        // Add random error based on accuracy stat
        const errorRange = (1 - accuracy) * 25; // Up to 25 degrees error
        const randomAngle = (Math.random() - 0.5) * 2 * errorRange * (Math.PI / 180);
        
        // Apply rotation around Y axis for error
        const cosAngle = Math.cos(randomAngle);
        const sinAngle = Math.sin(randomAngle);
        const adjustedDirection = new THREE.Vector3(
            direction.x * cosAngle - direction.z * sinAngle,
            direction.y,
            direction.x * sinAngle + direction.z * cosAngle
        );
        
        // Shot: high power (20-35 m/s)
        const speed = (power / 100) * 35;
        const verticalComponent = (power / 100) * 12; // Slight lift
        
        this.velocity.set(
            adjustedDirection.x * speed,
            verticalComponent,
            adjustedDirection.z * speed
        );
        
        // Add spin for curvature effect (optional)
        this.spinMagnitude = (power / 100) * 2;
        this.spinAxis.set(
            -adjustedDirection.z * this.spinMagnitude,
            0,
            adjustedDirection.x * this.spinMagnitude
        );
        
        console.log(`Shot executed with power ${power}, accuracy ${accuracy} (${speed.toFixed(2)} m/s, ${(randomAngle * 180 / Math.PI).toFixed(1)}° error)`);
    }

    /**
     * Apply force to the ball (used for physical interactions)
     */
    applyForce(forceVector) {
        this.velocity.add(forceVector);
        
        // Clamp to max speed
        if (this.velocity.length() > this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed);
        }
    }

    /**
     * Stop the ball
     */
    stop() {
        this.velocity.set(0, 0, 0);
        this.spinMagnitude = 0;
    }

    /**
     * Reset ball to center
     */
    reset(position = { x: 0, y: 0, z: 0 }) {
        this.position.set(position.x, position.y, position.z);
        this.velocity.set(0, 0, 0);
        this.spinMagnitude = 0;
        this.mesh.position.copy(this.position);
    }

    /**
     * Get ball position
     */
    getPosition() {
        return this.position.clone();
    }

    /**
     * Get ball velocity
     */
    getVelocity() {
        return this.velocity.clone();
    }

    /**
     * Get current ball speed
     */
    getSpeed() {
        return this.velocity.length();
    }

    /**
     * Check if ball is moving significantly
     */
    isMoving() {
        return this.velocity.length() > 0.5;
    }

    /**
     * Get distance from a point
     */
    getDistanceFrom(point) {
        return this.position.distanceTo(point);
    }
}
