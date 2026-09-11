using UnityEngine;

/// <summary>
/// GameStateManager - Central authority for all game state management
/// Tracks match time (90 minutes scaled to 6 real minutes), score, possession, and game flow states
/// 
/// TIME SCALING: 90 real minutes = 6 real-time minutes (15:1 ratio)
/// This keeps arcade gameplay fast while maintaining realistic match structure
/// </summary>
public class GameStateManager : MonoBehaviour
{
    // ===== Singleton Pattern =====
    public static GameStateManager Instance { get; private set; }

    // ===== Game State Enum =====
    public enum GameState
    {
        KickOff,      // Match start or after goal
        Gameplay,     // Normal play
        ThrowIn,      // Out of bounds on sideline
        Penalty,      // Penalty kick
        CornerKick,   // Corner kick
        GoalKick,     // Goal kick
        Paused,       // Game paused
        HalfTime,     // Between halves
        MatchEnd      // Match finished
    }

    // ===== Time Management =====
    private const float REAL_MATCH_DURATION = 360f;  // 6 real minutes in seconds
    private const float SIMULATED_MATCH_DURATION = 5400f; // 90 real match minutes in seconds
    private const float TIME_SCALE_RATIO = SIMULATED_MATCH_DURATION / REAL_MATCH_DURATION; // 15:1

    private float matchElapsedTime = 0f;        // Total elapsed time in game time (seconds)
    private bool isFirstHalf = true;
    private bool isMatchActive = false;
    private bool isPaused = false;

    // ===== Score Management =====
    [SerializeField] private int teamAScore = 0;
    [SerializeField] private int teamBScore = 0;

    // ===== Possession Tracking =====
    public enum Team { TeamA, TeamB, None }
    private Team currentPossession = Team.None;
    private float possessionChangeTime = 0f;

    // ===== Game State =====
    private GameState currentGameState = GameState.KickOff;
    private GameState previousGameState = GameState.KickOff;

    // ===== Events =====
    public delegate void OnGameStateChanged(GameState newState, GameState oldState);
    public event OnGameStateChanged GameStateChangedEvent;

    public delegate void OnScoreChanged(int teamAScore, int teamBScore);
    public event OnScoreChanged ScoreChangedEvent;

    public delegate void OnPossessionChanged(Team newTeam, Team oldTeam);
    public event OnPossessionChanged PossessionChangedEvent;

    public delegate void OnMatchTimeChanged(float matchTime);
    public event OnMatchTimeChanged MatchTimeChangedEvent;

    // ===== Initialization =====
    private void Awake()
    {
        // Enforce Singleton pattern
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    // ===== Update Loop =====
    private void Update()
    {
        if (!isMatchActive || isPaused)
            return;

        // Increment match time scaled to real-time (15x speed)
        matchElapsedTime += Time.deltaTime * TIME_SCALE_RATIO;

        // Check for half-time or match end
        float halfDuration = SIMULATED_MATCH_DURATION / 2f;
        if (isFirstHalf && matchElapsedTime >= halfDuration)
        {
            HandleHalfTime();
        }
        else if (!isFirstHalf && matchElapsedTime >= SIMULATED_MATCH_DURATION)
        {
            HandleMatchEnd();
        }

        // Broadcast time change event
        MatchTimeChangedEvent?.Invoke(matchElapsedTime);
    }

    // ===== Match Control =====
    public void StartMatch()
    {
        isMatchActive = true;
        isPaused = false;
        matchElapsedTime = 0f;
        isFirstHalf = true;
        SetGameState(GameState.KickOff);
        Debug.Log("Match Started!");
    }

    public void PauseMatch()
    {
        isPaused = true;
        SetGameState(GameState.Paused);
        Debug.Log("Match Paused");
    }

    public void ResumeMatch()
    {
        if (currentGameState == GameState.Paused)
        {
            isPaused = false;
            SetGameState(previousGameState);
            Debug.Log("Match Resumed");
        }
    }

    public void EndMatch()
    {
        isMatchActive = false;
        SetGameState(GameState.MatchEnd);
        Debug.Log($"Match Ended! Final Score - Team A: {teamAScore} vs Team B: {teamBScore}");
    }

    // ===== Game State Management =====
    public void SetGameState(GameState newState)
    {
        if (currentGameState == newState)
            return;

        previousGameState = currentGameState;
        currentGameState = newState;

        Debug.Log($"Game State Changed: {previousGameState} -> {currentGameState}");
        GameStateChangedEvent?.Invoke(currentGameState, previousGameState);
    }

    private void HandleHalfTime()
    {
        isFirstHalf = false;
        SetGameState(GameState.HalfTime);
        Debug.Log("Half Time! First half ended.");
        // Resume with kick-off after delay
        Invoke(nameof(ResumeFromHalfTime), 5f);
    }

    private void ResumeFromHalfTime()
    {
        matchElapsedTime = SIMULATED_MATCH_DURATION / 2f; // Start second half timer
        SetGameState(GameState.KickOff);
        Debug.Log("Second Half Starting!");
    }

    private void HandleMatchEnd()
    {
        isMatchActive = false;
        SetGameState(GameState.MatchEnd);
        Debug.Log("Match Complete!");
    }

    // ===== Score Management =====
    public void AddGoal(Team scoringTeam)
    {
        if (scoringTeam == Team.TeamA)
            teamAScore++;
        else if (scoringTeam == Team.TeamB)
            teamBScore++;

        Debug.Log($"GOAL! {scoringTeam} scores. Current Score - Team A: {teamAScore} vs Team B: {teamBScore}");
        ScoreChangedEvent?.Invoke(teamAScore, teamBScore);

        // Reset to kick-off
        SetGameState(GameState.KickOff);
    }

    // ===== Possession Management =====
    public void ChangePossession(Team newTeam)
    {
        if (currentPossession == newTeam)
            return;

        Team oldTeam = currentPossession;
        currentPossession = newTeam;
        possessionChangeTime = matchElapsedTime;

        Debug.Log($"Possession changed to: {currentPossession}");
        PossessionChangedEvent?.Invoke(currentPossession, oldTeam);
    }

    // ===== Getters =====
    public GameState GetCurrentGameState() => currentGameState;
    public Team GetCurrentPossession() => currentPossession;
    public float GetMatchTimeInSeconds() => matchElapsedTime;
    
    /// <summary>
    /// Returns match time in MM:SS format (simulated match minutes)
    /// </summary>
    public string GetMatchTimeFormatted()
    {
        int minutes = (int)(matchElapsedTime / 60f);
        int seconds = (int)(matchElapsedTime % 60f);
        return $"{minutes:D2}:{seconds:D2}";
    }

    public int GetTeamAScore() => teamAScore;
    public int GetTeamBScore() => teamBScore;
    public bool IsFirstHalf() => isFirstHalf;
    public bool IsMatchActive() => isMatchActive;
    public bool IsMatchPaused() => isPaused;
    public float GetPossessionDuration() => matchElapsedTime - possessionChangeTime;
}
