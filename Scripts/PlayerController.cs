using UnityEngine;

/// <summary>
/// PlayerController - Handles all player movement, input, and ball interaction
/// Features:
/// - 8-directional movement with smooth acceleration/deceleration
/// - Momentum-based physics for realistic feel
/// - Dribbling mechanics (ball stays near feet with physics separation)
/// - Sprint capability with stamina drain
/// - Passing and shooting input preparation
/// </summary>
public class PlayerController : MonoBehaviour
{
    // ===== References =====
    private Rigidbody rb;
    private BallPhysics ball;
    private Animator animator;
    [SerializeField] private Transform ballTrackingPoint; // Position where ball should stay near during dribbling

    // ===== Movement Parameters =====
    [SerializeField] private float maxSpeed = 12f;           // Maximum walking speed (m/s)
    [SerializeField] private float maxSprintSpeed = 18f;     // Maximum sprint speed (m/s)
    [SerializeField] private float acceleration = 20f;       // How quickly player reaches max speed
    [SerializeField] private float deceleration = 15f;       // How quickly player slows down
    [SerializeField] private float rotationSpeed = 10f;      // Smooth rotation towards movement direction
    [SerializeField] private float dribbleSlowDownFactor = 0.85f; // Speed reduction when dribbling

    // ===== Dribbling Parameters =====
    [SerializeField] private float dribbleControlRadius = 1.5f;  // How far ball can drift from feet
    [SerializeField] private float dribbleDragStrength = 8f;     // How strongly player pulls ball back
    [SerializeField] private float dribbleMaxBallDistance = 2.5f; // Max distance before losing possession

    // ===== Stamina System =====
    [SerializeField] private float maxStamina = 100f;
    [SerializeField] private float staminaDrainSprint = 30f;   // Stamina drain per second while sprinting
    [SerializeField] private float staminaRecovery = 15f;      // Stamina recovery per second
    private float currentStamina;
    private bool canSprint = true;

    // ===== Input Handling =====
    private Vector2 inputDirection = Vector2.zero;
    private bool isSprinting = false;
    private bool isDribbling = false;
    private Vector3 currentVelocity = Vector3.zero;

    // ===== Player State =====
    [SerializeField] private GameStateManager.Team playerTeam = GameStateManager.Team.TeamA;
    [SerializeField] private bool isLocalPlayer = false;  // Is this player controlled by the player
    [SerializeField] private int playerNumber = 7;        // Jersey number for UI/identification
    private bool hasBallPossession = false;
    private float lastTouchTime = 0f;

    // ===== Initialization =====
    private void Start()
    {
        rb = GetComponent<Rigidbody>();
        animator = GetComponent<Animator>();
        
        // Find ball in scene
        BallPhysics[] balls = FindObjectsOfType<BallPhysics>();
        if (balls.Length > 0)
            ball = balls[0];

        // Create a child object for ball tracking if it doesn't exist
        if (ballTrackingPoint == null)
        {
            GameObject trackingObj = new GameObject("BallTrackingPoint");
            trackingObj.transform.SetParent(transform);
            trackingObj.transform.localPosition = new Vector3(0, 0, 0.5f); // Slightly in front of feet
            ballTrackingPoint = trackingObj.transform;
        }

        currentStamina = maxStamina;
        rb.constraints = RigidbodyConstraints.FreezeRotation; // Prevent physics rotation
    }

    // ===== Update Loop =====
    private void Update()
    {
        if (!isLocalPlayer || GameStateManager.Instance.GetCurrentGameState() == GameStateManager.GameState.Paused)
            return;

        HandleInput();
        UpdateStamina();
        UpdateAnimations();
    }

    // ===== Physics Update =====
    private void FixedUpdate()
    {
        if (!isLocalPlayer || GameStateManager.Instance.GetCurrentGameState() == GameStateManager.GameState.Paused)
        {
            rb.velocity = Vector3.Lerp(rb.velocity, Vector3.zero, Time.fixedDeltaTime * 5f);
            return;
        }

        ApplyMovement();
        HandleRotation();
        
        if (isDribbling && ball != null)
        {
            ApplyDribbleControl();
        }
    }

    // ===== Input Handling =====
    private void HandleInput()
    {
        // Get WASD input (normalized 8-directional movement)
        float horizontal = 0f;
        float vertical = 0f;

        if (Input.GetKey(KeyCode.W)) vertical += 1f;
        if (Input.GetKey(KeyCode.S)) vertical -= 1f;
        if (Input.GetKey(KeyCode.A)) horizontal -= 1f;
        if (Input.GetKey(KeyCode.D)) horizontal += 1f;

        inputDirection = new Vector2(horizontal, vertical).normalized;

        // Sprint with Left Shift
        isSprinting = Input.GetKey(KeyCode.LeftShift) && inputDirection.magnitude > 0.1f && canSprint;

        // Dribbling detection - check if player is close to ball
        if (ball != null)
        {
            float distanceToBall = Vector3.Distance(transform.position, ball.transform.position);
            isDribbling = distanceToBall < dribbleControlRadius && GameStateManager.Instance.GetCurrentPossession() == playerTeam;
        }

        // Passing (Space - sets up pass, released to execute)
        if (Input.GetKeyDown(KeyCode.Space))
        {
            if (isDribbling)
            {
                // Start pass preparation
                Debug.Log($"Player {playerNumber}: Pass initiated");
            }
        }

        // Shooting (Left Ctrl - hold to charge)
        if (Input.GetKeyDown(KeyCode.LeftControl))
        {
            if (isDribbling)
            {
                Debug.Log($"Player {playerNumber}: Shot charging...");
            }
        }
    }

    // ===== Movement Application =====
    private void ApplyMovement()
    {
        // Determine current max speed based on sprint state
        float currentMaxSpeed = isSprinting ? maxSprintSpeed : maxSpeed;

        // Apply dribble slow-down if holding ball
        if (isDribbling)
            currentMaxSpeed *= dribbleSlowDownFactor;

        // Target velocity based on input
        Vector3 targetVelocity = Vector3.zero;
        if (inputDirection.magnitude > 0.1f)
        {
            // Convert input to world space direction
            Vector3 moveDirection = new Vector3(inputDirection.x, 0, inputDirection.y).normalized;
            targetVelocity = moveDirection * currentMaxSpeed;

            // Smooth acceleration towards target speed
            currentVelocity = Vector3.Lerp(currentVelocity, targetVelocity, Time.fixedDeltaTime * acceleration);
        }
        else
        {
            // Decelerate when no input
            currentVelocity = Vector3.Lerp(currentVelocity, Vector3.zero, Time.fixedDeltaTime * deceleration);
        }

        // Apply velocity (maintain Y-axis for gravity)
        rb.velocity = new Vector3(currentVelocity.x, rb.velocity.y, currentVelocity.z);
    }

    // ===== Rotation Handling =====
    private void HandleRotation()
    {
        if (inputDirection.magnitude < 0.1f)
            return; // Don't rotate if no input

        // Calculate target rotation based on input direction
        Vector3 moveDirection = new Vector3(inputDirection.x, 0, inputDirection.y).normalized;
        Quaternion targetRotation = Quaternion.LookRotation(moveDirection, Vector3.up);

        // Smoothly rotate towards target
        transform.rotation = Quaternion.Lerp(transform.rotation, targetRotation, Time.fixedDeltaTime * rotationSpeed);
    }

    // ===== Dribble Control =====
    private void ApplyDribbleControl()
    {
        Vector3 ballPos = ball.transform.position;
        Vector3 trackingPos = ballTrackingPoint.position;
        Vector3 distanceVector = trackingPos - ballPos;

        // Only apply force if ball drifts too far
        if (distanceVector.magnitude > 0.2f)
        {
            Vector3 pullForce = distanceVector.normalized * dribbleDragStrength;
            ball.rb.AddForce(pullForce, ForceMode.Acceleration);
        }

        // Lose possession if ball gets too far
        if (distanceVector.magnitude > dribbleMaxBallDistance)
        {
            LosePossession();
        }

        // Update ball tracking point based on player movement
        // Ball should stay in front of the player when moving
        float forwardOffset = Mathf.Clamp(currentVelocity.magnitude / maxSpeed * 1f, 0.3f, 1f);
        ballTrackingPoint.localPosition = new Vector3(0, 0.1f, forwardOffset);
    }

    // ===== Stamina System =====
    private void UpdateStamina()
    {
        if (isSprinting && currentStamina > 0)
        {
            currentStamina -= staminaDrainSprint * Time.deltaTime;
            canSprint = currentStamina > 10f; // Can't sprint if stamina below 10%
        }
        else
        {
            currentStamina = Mathf.Min(currentStamina + staminaRecovery * Time.deltaTime, maxStamina);
            canSprint = true;
        }
    }

    // ===== Animation Updates =====
    private void UpdateAnimations()
    {
        if (animator == null)
            return;

        // Set movement speed parameter (normalized 0-1)
        float speedPercent = rb.velocity.magnitude / maxSprintSpeed;
        animator.SetFloat("Speed", speedPercent);

        // Set sprint parameter
        animator.SetBool("IsSprinting", isSprinting);

        // Set dribbling parameter
        animator.SetBool("IsDribbling", isDribbling);
    }

    // ===== Ball Interaction =====
    public void GainPossession()
    {
        hasBallPossession = true;
        lastTouchTime = GameStateManager.Instance.GetMatchTimeInSeconds();
        GameStateManager.Instance.ChangePossession(playerTeam);
        Debug.Log($"Player {playerNumber} ({playerTeam}) gained possession");
    }

    public void LosePossession()
    {
        hasBallPossession = false;
        isDribbling = false;
        Debug.Log($"Player {playerNumber} lost possession");
    }

    /// <summary>
    /// Execute a ground pass - faster, more accurate but shorter range
    /// </summary>
    public void PerformGroundPass(Vector3 targetDirection, float power)
    {
        if (ball != null && isDribbling)
        {
            ball.ExecutePass(targetDirection, power, BallPhysics.PassType.Ground);
            LosePossession();
        }
    }

    /// <summary>
    /// Execute a lofted pass - slower, longer range, higher arc
    /// </summary>
    public void PerformLoftedPass(Vector3 targetDirection, float power)
    {
        if (ball != null && isDribbling)
        {
            ball.ExecutePass(targetDirection, power, BallPhysics.PassType.Lofted);
            LosePossession();
        }
    }

    /// <summary>
    /// Execute a shot on goal - high power, adds error based on player stat
    /// </summary>
    public void PerformShot(Vector3 targetDirection, float power, float accuracyStat)
    {
        if (ball != null && isDribbling)
        {
            // Add slight random error based on accuracy (0-1, higher is better)
            float errorRange = (1f - Mathf.Clamp01(accuracyStat)) * 15f; // Up to 15 degrees error
            float randomAngle = Random.Range(-errorRange, errorRange);
            Quaternion errorRotation = Quaternion.AngleAxis(randomAngle, Vector3.up);
            Vector3 adjustedDirection = errorRotation * targetDirection;

            ball.ExecuteShot(adjustedDirection, power);
            LosePossession();
            Debug.Log($"Player {playerNumber} shot with power {power} and accuracy {accuracyStat}");
        }
    }

    // ===== Getters =====
    public float GetStaminaPercent() => currentStamina / maxStamina;
    public bool HasBallPossession() => hasBallPossession;
    public bool IsDribbling() => isDribbling;
    public float GetCurrentSpeed() => rb.velocity.magnitude;
    public Vector3 GetCurrentVelocity() => currentVelocity;
    public GameStateManager.Team GetTeam() => playerTeam;
    public int GetPlayerNumber() => playerNumber;
}
