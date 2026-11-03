using UnityEngine;

namespace CombatProto
{
    /// <summary>One attack, timed in frames at 60 fps.</summary>
    [System.Serializable]
    public class AttackData
    {
        public string name = "Attack";
        [Tooltip("Frames before the hit becomes active (wind-up)")] public int startup = 4;
        [Tooltip("Frames the hitbox is live")] public int active = 3;
        [Tooltip("Frames after the hit. The next combo hit (and a dash cancel) is allowed here")] public int recovery = 12;
        public int damage = 10;
        [Tooltip("Reach in world units (16 px = 1 unit)")] public float range = 1.3f;
        public float arcDegrees = 140f;
        [Tooltip("Knockback start speed, units per second")] public float knockback = 6f;
        public int hitstopFrames = 3;
        public float shakePixels = 1.5f;
        public int shakeFrames = 5;
        [Tooltip("Forward step during startup + active, in units")] public float lunge = 0.25f;
        public bool heavy;

        public AttackData() { }

        public AttackData(string name, int startup, int active, int recovery, int damage, float range,
            float arcDegrees, float knockback, int hitstopFrames, float shakePixels, int shakeFrames,
            float lunge, bool heavy)
        {
            this.name = name;
            this.startup = startup;
            this.active = active;
            this.recovery = recovery;
            this.damage = damage;
            this.range = range;
            this.arcDegrees = arcDegrees;
            this.knockback = knockback;
            this.hitstopFrames = hitstopFrames;
            this.shakePixels = shakePixels;
            this.shakeFrames = shakeFrames;
            this.lunge = lunge;
            this.heavy = heavy;
        }
    }

    /// <summary>
    /// Every number and on/off switch of the prototype. Edit it in the Inspector while playing,
    /// or flip the toggles with the number keys.
    /// </summary>
    public class CombatTuning : MonoBehaviour
    {
        public static CombatTuning I { get; private set; }

        [Header("Feel toggles (keys 1-9 while playing, 0 = all)")]
        public bool hitstop = true;
        public bool shake = true;
        public bool knockback = true;
        public bool hitFlash = true;
        public bool inputBuffer = true;
        public bool dashCancel = true;
        public bool aimAssist = true;
        public bool sparks = true;
        public bool sound = true;

        [Header("Feel strength")]
        [Range(0f, 3f)] public float hitstopScale = 1f;
        [Range(0f, 3f)] public float shakeScale = 1f;
        [Range(0f, 3f)] public float knockbackScale = 1f;

        [Header("Player")]
        public float moveSpeed = 6.5f;
        public float dashSpeed = 19f;
        public int dashFrames = 10;
        public int dashInvulnFrames = 8;
        public float dashCooldown = 0.2f;
        [Tooltip("How long a press is remembered while the player is busy (seconds)")]
        public float bufferWindow = 0.15f;
        [Tooltip("Idle time after which the combo restarts from hit 1 (seconds)")]
        public float comboResetTime = 0.4f;
        public float aimAssistAngle = 35f;
        public float aimAssistRange = 1.2f;

        [Header("Camera")]
        public bool pixelSnap = true;
        public float cameraLookAhead = 0.6f;

        [Header("Combo (frames at 60 fps)")]
        public AttackData[] combo =
        {
            new AttackData("Slash 1", 4, 3, 12, 10, 1.3f, 140f, 6f, 3, 1.5f, 5, 0.25f, false),
            new AttackData("Slash 2", 4, 3, 12, 10, 1.3f, 140f, 6f, 3, 1.5f, 5, 0.25f, false),
            new AttackData("Finisher", 7, 4, 22, 25, 1.6f, 200f, 15f, 8, 4f, 10, 0.5f, true),
        };
        [Tooltip("Attack pressed during a dash")]
        public AttackData dashStrike = new AttackData("Dash Strike", 3, 3, 14, 15, 1.4f, 120f, 9f, 5, 2.5f, 7, 0.6f, false);

        [Header("Enemies")]
        public int chaserCount = 3;
        public int enemyHp = 60;
        public float enemySpeed = 2.4f;
        public int enemyWindupFrames = 34;
        public int enemyStaggerFrames = 18;

        public float Window => inputBuffer ? bufferWindow : 0f;

        void Awake() { I = this; }
        void OnDestroy() { if (I == this) I = null; }
    }
}
