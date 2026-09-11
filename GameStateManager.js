/**
 * GameStateManager.js - Central authority for all game state management
 * Tracks match time (90 minutes scaled to 6 real minutes), score, possession, and game flow states
 * 
 * TIME SCALING: 90 real minutes = 6 real-time minutes (15:1 ratio)
 * This keeps arcade gameplay fast while maintaining realistic match structure
 */

class GameStateManager {
    constructor() {
        // ===== Singleton Pattern =====
        if (GameStateManager.instance) {
            return GameStateManager.instance;
        }
        GameStateManager.instance = this;

        // ===== Game State Enum =====
        this.GameState = {
            KickOff: 'KickOff',
            Gameplay: 'Gameplay',
            ThrowIn: 'ThrowIn',
            Penalty: 'Penalty',
            CornerKick: 'CornerKick',
            GoalKick: 'GoalKick',
            Paused: 'Paused',
            HalfTime: 'HalfTime',
            MatchEnd: 'MatchEnd'
        };

        // ===== Team Enum =====
        this.Team = {
            TeamA: 'TeamA',
            TeamB: 'TeamB',
            None: 'None'
        };

        // ===== Time Management =====
        this.REAL_MATCH_DURATION = 360;        // 6 real minutes in seconds
        this.SIMULATED_MATCH_DURATION = 5400;  // 90 simulated match minutes in seconds
        this.TIME_SCALE_RATIO = this.SIMULATED_MATCH_DURATION / this.REAL_MATCH_DURATION; // 15:1

        this.matchElapsedTime = 0;
        this.isFirstHalf = true;
        this.isMatchActive = false;
        this.isPaused = false;

        // ===== Score Management =====
        this.teamAScore = 0;
        this.teamBScore = 0;

        // ===== Possession Tracking =====
        this.currentPossession = this.Team.None;
        this.possessionChangeTime = 0;

        // ===== Game State =====
        this.currentGameState = this.GameState.KickOff;
        this.previousGameState = this.GameState.KickOff;

        // ===== Events =====
        this.listeners = {
            gameStateChanged: [],
            scoreChanged: [],
            possessionChanged: [],
            matchTimeChanged: [],
            halfTime: [],
            matchEnd: []
        };
    }

    // ===== Event System =====
    on(eventName, callback) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].push(callback);
        }
    }

    emit(eventName, ...args) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].forEach(callback => callback(...args));
        }
    }

    // ===== Update Loop =====
    update(deltaTime) {
        if (!this.isMatchActive || this.isPaused) return;

        // Increment match time scaled to real-time (15x speed)
        this.matchElapsedTime += deltaTime * this.TIME_SCALE_RATIO;

        // Check for half-time or match end
        const halfDuration = this.SIMULATED_MATCH_DURATION / 2;
        if (this.isFirstHalf && this.matchElapsedTime >= halfDuration) {
            this.handleHalfTime();
        } else if (!this.isFirstHalf && this.matchElapsedTime >= this.SIMULATED_MATCH_DURATION) {
            this.handleMatchEnd();
        }

        // Broadcast time change event
        this.emit('matchTimeChanged', this.matchElapsedTime);
    }

    // ===== Match Control =====
    startMatch() {
        this.isMatchActive = true;
        this.isPaused = false;
        this.matchElapsedTime = 0;
        this.isFirstHalf = true;
        this.setGameState(this.GameState.KickOff);
        console.log('Match Started!');
    }

    pauseMatch() {
        this.isPaused = true;
        this.setGameState(this.GameState.Paused);
        console.log('Match Paused');
    }

    resumeMatch() {
        if (this.currentGameState === this.GameState.Paused) {
            this.isPaused = false;
            this.setGameState(this.previousGameState);
            console.log('Match Resumed');
        }
    }

    endMatch() {
        this.isMatchActive = false;
        this.setGameState(this.GameState.MatchEnd);
        console.log(`Match Ended! Final Score - Team A: ${this.teamAScore} vs Team B: ${this.teamBScore}`);
        this.emit('matchEnd', this.teamAScore, this.teamBScore);
    }

    // ===== Game State Management =====
    setGameState(newState) {
        if (this.currentGameState === newState) return;

        this.previousGameState = this.currentGameState;
        this.currentGameState = newState;

        console.log(`Game State Changed: ${this.previousGameState} -> ${this.currentGameState}`);
        this.emit('gameStateChanged', this.currentGameState, this.previousGameState);
    }

    handleHalfTime() {
        this.isFirstHalf = false;
        this.setGameState(this.GameState.HalfTime);
        console.log('Half Time! First half ended.');
        this.emit('halfTime');
        
        // Resume with kick-off after delay
        setTimeout(() => this.resumeFromHalfTime(), 3000);
    }

    resumeFromHalfTime() {
        this.matchElapsedTime = this.SIMULATED_MATCH_DURATION / 2; // Start second half timer
        this.setGameState(this.GameState.KickOff);
        console.log('Second Half Starting!');
    }

    handleMatchEnd() {
        this.isMatchActive = false;
        this.setGameState(this.GameState.MatchEnd);
        console.log('Match Complete!');
        this.emit('matchEnd');
    }

    // ===== Score Management =====
    addGoal(scoringTeam) {
        if (scoringTeam === this.Team.TeamA) {
            this.teamAScore++;
        } else if (scoringTeam === this.Team.TeamB) {
            this.teamBScore++;
        }

        console.log(`GOAL! ${scoringTeam} scores. Current Score - Team A: ${this.teamAScore} vs Team B: ${this.teamBScore}`);
        this.emit('scoreChanged', this.teamAScore, this.teamBScore);

        // Reset to kick-off
        this.setGameState(this.GameState.KickOff);
    }

    // ===== Possession Management =====
    changePossession(newTeam) {
        if (this.currentPossession === newTeam) return;

        const oldTeam = this.currentPossession;
        this.currentPossession = newTeam;
        this.possessionChangeTime = this.matchElapsedTime;

        console.log(`Possession changed to: ${this.currentPossession}`);
        this.emit('possessionChanged', this.currentPossession, oldTeam);
    }

    // ===== Getters =====
    getCurrentGameState() {
        return this.currentGameState;
    }

    getCurrentPossession() {
        return this.currentPossession;
    }

    getMatchTimeInSeconds() {
        return this.matchElapsedTime;
    }

    /**
     * Returns match time in MM:SS format (simulated match minutes)
     */
    getMatchTimeFormatted() {
        const minutes = Math.floor(this.matchElapsedTime / 60);
        const seconds = Math.floor(this.matchElapsedTime % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    getTeamAScore() {
        return this.teamAScore;
    }

    getTeamBScore() {
        return this.teamBScore;
    }

    isFirstHalfActive() {
        return this.isFirstHalf;
    }

    isMatchActiveState() {
        return this.isMatchActive;
    }

    isMatchPausedState() {
        return this.isPaused;
    }

    getPossessionDuration() {
        return this.matchElapsedTime - this.possessionChangeTime;
    }
}

// Export singleton instance
const gameStateManager = new GameStateManager();
