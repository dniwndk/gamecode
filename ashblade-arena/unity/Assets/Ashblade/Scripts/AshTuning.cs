using System;
using UnityEngine;

namespace Ashblade
{
    public enum AttackKind { Slash, Thrust, Spin, Burst }
    public enum EnemyKind { Grunt, Wisp, Brute }

    /// <summary>One attack. Frame counts are at 60 fps; from/to are the blade angles (degrees) relative to the attack direction.</summary>
    [Serializable]
    public class Attack
    {
        public string name;
        public int startup = 4, active = 3, recovery = 12;
        public float damage = 10f, range = 1.5f, arc = 150f, knockback = 6f;
        public int hitstop = 4;
        [Tooltip("Camera trauma added on hit (0..1)")] public float shake = 0.25f;
        public float lunge = 0.3f;
        public bool heavy;
        public float from = -110f, to = 80f;
        public AttackKind kind = AttackKind.Slash;
        [Tooltip("Small step back during the wind-up before the lunge")] public bool back = true;

        public static Attack Make(string name, int s, int a, int r, float dmg, float range, float arc, float kb, int hs,
            float shake, float lunge, float from, float to, bool heavy = false, AttackKind kind = AttackKind.Slash, bool back = true)
        {
            return new Attack
            {
                name = name, startup = s, active = a, recovery = r, damage = dmg, range = range, arc = arc, knockback = kb,
                hitstop = hs, shake = shake, lunge = lunge, from = from, to = to, heavy = heavy, kind = kind, back = back,
            };
        }
    }

    [Serializable]
    public class KindStats
    {
        public float hp = 40f, speed = 2.5f, radius = 0.38f, bodyH = 0.3f;
        public int windup = 30, recover = 34;
        public float mass = 1f, dmg = 12f;
        public bool armor;
        public int poise;
        public float slamR = 2.3f;
        [HideInInspector] public Color32[] ichor;
    }

    /// <summary>Every number and toggle of the prototype. Change them in the inspector while playing.</summary>
    public class AshTuning : MonoBehaviour
    {
        public static AshTuning I;

        [Header("Basics (keys 1-9 toggle these)")]
        public bool hitstop = true;
        public bool shake = true;
        public bool knockback = true;
        public bool hitFlash = true;
        public bool inputBuffer = true;
        public bool dashCancel = true;
        public bool aimAssist = true;
        public bool particles = true;
        public bool sound = true;

        [Header("Juice added in the second test")]
        public bool impactFrame = true;
        public bool zoom = true;
        public bool slowmo = true;
        public bool squash = true;
        public bool numbers = true;
        public bool trails = true;
        public bool glow = true;
        public bool decals = true;
        public bool chroma = true;
        public bool rumble = true;
        [Tooltip("Take no damage (feedback still plays)")] public bool god = false;

        [Header("Strength")]
        [Range(0f, 3f)] public float hitstopScale = 1f;
        [Range(0f, 3f)] public float shakeScale = 1f;
        [Range(0f, 3f)] public float knockbackScale = 1f;

        [Header("Player")]
        public float moveSpeed = 6.5f;
        public float dashSpeed = 20f;
        public int dashFrames = 10;
        public int dashInvulnFrames = 9;
        public float dashCooldown = 0.16f;
        [Range(0.05f, 0.4f)] public float bufferWindow = 0.15f;
        public float comboResetTime = 0.45f;
        public float aimAssistAngle = 35f;
        public float aimAssistRange = 1.2f;
        public float lookAhead = 1.1f;
        public float chargeTime = 0.55f;

        [Header("Attacks")]
        public Attack[] combo =
        {
            Attack.Make("Slash 1", 5, 3, 13, 12, 1.6f, 150, 7, 4, 0.22f, 0.4f, 115, -85),
            Attack.Make("Slash 2", 4, 3, 13, 12, 1.6f, 150, 7, 4, 0.22f, 0.4f, -115, 85),
            Attack.Make("Finisher", 10, 4, 24, 28, 2.0f, 200, 17, 9, 0.5f, 0.8f, 160, -140, true),
        };
        public Attack dashStrike = Attack.Make("Dash Strike", 2, 5, 14, 18, 2.0f, 100, 11, 6, 0.32f, 1.7f, 8, -8, false, AttackKind.Thrust, false);
        public Attack spin = Attack.Make("Spin Slash", 3, 10, 18, 30, 2.5f, 360, 15, 8, 0.5f, 0.3f, 30, -420, true, AttackKind.Spin, false);
        public Attack burst = Attack.Make("Ash Burst", 0, 0, 0, 45, 4.6f, 360, 19, 10, 1f, 0f, 0, 0, true, AttackKind.Burst, false);
        public Attack deflected = Attack.Make("Deflect", 0, 0, 0, 26, 0, 0, 12, 6, 0.35f, 0, 0, 0);

        [Header("Enemies")]
        public KindStats grunt = new KindStats { hp = 42, speed = 2.7f, radius = 0.38f, bodyH = 0.3f, windup = 30, recover = 34, mass = 1f, dmg = 12 };
        public KindStats wisp = new KindStats { hp = 30, speed = 2.2f, radius = 0.34f, bodyH = 0.45f, windup = 42, recover = 46, mass = 0.8f, dmg = 10 };
        public KindStats brute = new KindStats { hp = 150, speed = 1.5f, radius = 0.62f, bodyH = 0.5f, windup = 50, recover = 62, mass = 2.4f, dmg = 22, armor = true, poise = 4, slamR = 2.3f };

        void Awake()
        {
            I = this;
            grunt.ichor = new[] { M.Hex("#ff8a4a"), M.Hex("#c8323c"), M.Hex("#6a1424") };
            wisp.ichor = new[] { M.Hex("#e0b0ff"), M.Hex("#8a4ad0"), M.Hex("#3e1e70") };
            brute.ichor = new[] { M.Hex("#ffb070"), M.Hex("#8a5a3a"), M.Hex("#3a2418") };
        }

        public KindStats Kind(EnemyKind k) { return k == EnemyKind.Grunt ? grunt : k == EnemyKind.Wisp ? wisp : brute; }

        public static readonly string[] BasicNames = { "Hitstop", "Shake", "Knockback", "Hit flash", "Input buffer", "Dash cancel", "Aim assist", "Particles", "Sound" };
        public static readonly string[] JuiceNames = { "Impact frame", "Zoom / kill cam", "Slow-mo", "Squash", "Numbers", "Trails", "Glow", "Decals", "Chroma", "Rumble", "God mode" };

        public bool GetBasic(int i)
        {
            switch (i)
            {
                case 0: return hitstop; case 1: return shake; case 2: return knockback; case 3: return hitFlash; case 4: return inputBuffer;
                case 5: return dashCancel; case 6: return aimAssist; case 7: return particles; default: return sound;
            }
        }
        public void SetBasic(int i, bool v)
        {
            switch (i)
            {
                case 0: hitstop = v; break; case 1: shake = v; break; case 2: knockback = v; break; case 3: hitFlash = v; break; case 4: inputBuffer = v; break;
                case 5: dashCancel = v; break; case 6: aimAssist = v; break; case 7: particles = v; break; default: sound = v; break;
            }
        }
        public bool GetJuice(int i)
        {
            switch (i)
            {
                case 0: return impactFrame; case 1: return zoom; case 2: return slowmo; case 3: return squash; case 4: return numbers;
                case 5: return trails; case 6: return glow; case 7: return decals; case 8: return chroma; case 9: return rumble; default: return god;
            }
        }
        public void SetJuice(int i, bool v)
        {
            switch (i)
            {
                case 0: impactFrame = v; break; case 1: zoom = v; break; case 2: slowmo = v; break; case 3: squash = v; break; case 4: numbers = v; break;
                case 5: trails = v; break; case 6: glow = v; break; case 7: decals = v; break; case 8: chroma = v; break; case 9: rumble = v; break; default: god = v; break;
            }
        }

        /// <summary>0 = everything on, 1 = only the first test's basics, 2 = everything off. God mode is left alone.</summary>
        public void Preset(int which)
        {
            for (int i = 0; i < BasicNames.Length; i++) SetBasic(i, which != 2);
            for (int i = 0; i < JuiceNames.Length - 1; i++) SetJuice(i, which == 0);
        }
    }
}
