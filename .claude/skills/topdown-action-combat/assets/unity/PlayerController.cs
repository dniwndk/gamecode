using System.Collections.Generic;
using UnityEngine;

namespace CombatProto
{
    /// <summary>
    /// Move, 3-hit combo, dash with invulnerability, dash strike.
    /// Each attack runs startup -> active -> recovery. The next hit and a dash cancel open in recovery.
    /// Presses made while busy are kept for CombatTuning.bufferWindow seconds (input buffer).
    /// </summary>
    public class PlayerController : Combatant
    {
        public static PlayerController I { get; private set; }

        enum State { Free, Attack, Dash }

        State state = State.Free;
        float stateTime;
        AttackData cur;
        int comboIndex;
        int nextCombo;
        float lastAttackEnd = -99f;
        Vector2 atkDir = Vector2.right;
        Vector2 moveInput;
        Vector2 dashDir = Vector2.right;
        float dashCd, hurtInvuln, slashTimer;
        int ghostCounter;
        float attackPressT = -99f, dashPressT = -99f;
        bool aimWithMouse = true;
        readonly HashSet<Enemy> hitThisSwing = new HashSet<Enemy>();
        SpriteRenderer slash;
        Sprite bodySprite;

        public Vector2 AimDir { get; private set; } = Vector2.right;
        public bool AimWithMouse => aimWithMouse;
        public int HitsTaken { get; private set; }

        public bool Invulnerable =>
            hurtInvuln > 0f || (state == State.Dash && stateTime * 60f < T.dashInvulnFrames);

        public string StateName
        {
            get
            {
                if (state != State.Attack) return state.ToString();
                float f = stateTime * 60f;
                string phase = f < cur.startup ? "startup" : f < cur.startup + cur.active ? "ACTIVE" : "recovery";
                return cur.name + " / " + phase;
            }
        }

        public void Init()
        {
            I = this;
            radius = 0.3f;
            bodyHeight = 0.45f;
            maxHp = hp = 9999;
            Sprite s, sil;
            PixelArt.FromRows(PixelArt.PlayerRows, PixelArt.PlayerPal, out s, out sil);
            bodySprite = s;
            BuildVisual(s, sil, 10);
            slash = new GameObject("Slash").AddComponent<SpriteRenderer>();
            slash.transform.SetParent(transform, false);
            slash.sprite = PixelArt.Slash;
            slash.enabled = false;
        }

        void OnDestroy() { if (I == this) I = null; }

        public void ResetState()
        {
            ClearMotion();
            state = State.Free;
            stateTime = 0f;
            hurtInvuln = 0f;
            HitsTaken = 0;
            slash.enabled = false;
            body.enabled = true;
        }

        protected override void PreTick()
        {
            moveInput = ProtoInput.Move();
            if (ProtoInput.AttackPressed()) attackPressT = Time.time;
            if (ProtoInput.DashPressed()) dashPressT = Time.time;
            if (ProtoInput.ToggleAimDown()) aimWithMouse = !aimWithMouse;

            Vector2 aim = Vector2.zero;
            if (aimWithMouse)
            {
                Vector2? m = ProtoInput.MouseWorld();
                if (m.HasValue) aim = m.Value - Center;
            }
            Vector2 stick = ProtoInput.AimStick();
            if (stick.sqrMagnitude > 0.1f) aim = stick;
            if (!aimWithMouse && aim.sqrMagnitude < 0.01f && moveInput.sqrMagnitude > 0.01f) aim = moveInput;
            if (aim.sqrMagnitude > 0.01f) AimDir = aim.normalized;

            if (state == State.Free) body.flipX = AimDir.x < 0f;
            else if (state == State.Dash) body.flipX = dashDir.x < 0f;
        }

        /// <summary>True if the button was pressed within the buffer window (or exactly now when the buffer is off).</summary>
        bool Consume(ref float pressT)
        {
            if (Time.time - pressT <= T.Window)
            {
                pressT = -99f;
                return true;
            }
            return false;
        }

        protected override void Tick(float dt)
        {
            if (hurtInvuln > 0f) hurtInvuln -= dt;
            if (dashCd > 0f) dashCd -= dt;
            body.enabled = !(hurtInvuln > 0f && Mathf.FloorToInt(hurtInvuln * 20f) % 2 == 0);
            if (slashTimer > 0f)
            {
                slashTimer -= dt;
                if (slashTimer <= 0f) slash.enabled = false;
            }

            stateTime += dt;
            float f = stateTime * 60f;
            switch (state)
            {
                case State.Free:
                    pos += moveInput * T.moveSpeed * dt;
                    if (dashCd <= 0f && Consume(ref dashPressT)) { StartDash(); break; }
                    if (Consume(ref attackPressT))
                    {
                        if (Time.time - lastAttackEnd > T.comboResetTime) nextCombo = 0;
                        StartAttack(T.combo[Mathf.Clamp(nextCombo, 0, T.combo.Length - 1)], nextCombo);
                    }
                    break;
                case State.Attack:
                    TickAttack(f, dt);
                    break;
                case State.Dash:
                    TickDash(f, dt);
                    break;
            }
        }

        void StartAttack(AttackData a, int index)
        {
            cur = a;
            comboIndex = index;
            state = State.Attack;
            stateTime = 0f;
            atkDir = AimDir;
            if (T.aimAssist) atkDir = Feel.AimAssist(Center, atkDir, T.aimAssistAngle, a.range + T.aimAssistRange);
            hitThisSwing.Clear();
            body.flipX = atkDir.x < 0f;
            Feel.I.PlaySfx(a.heavy ? SfxId.SwingHeavy : SfxId.Swing, 0.08f, 0.8f);
        }

        void EndAttack()
        {
            lastAttackEnd = Time.time;
            nextCombo = comboIndex + 1 < T.combo.Length ? comboIndex + 1 : 0;
        }

        void TickAttack(float f, float dt)
        {
            float s = cur.startup;
            float a = s + cur.active;
            float end = a + cur.recovery;

            if (f < a && a > 0f) pos += atkDir * (cur.lunge / (a / 60f)) * dt;
            if (f >= s && f < a)
            {
                ShowSlash();
                DoHits();
            }

            bool inRecovery = f >= a;
            bool canDashCancel = T.dashCancel && (f < s || inRecovery);
            if (canDashCancel && dashCd <= 0f && Consume(ref dashPressT))
            {
                EndAttack();
                StartDash();
                return;
            }
            if (inRecovery && comboIndex + 1 < T.combo.Length && Consume(ref attackPressT))
            {
                StartAttack(T.combo[comboIndex + 1], comboIndex + 1);
                return;
            }
            if (f >= end)
            {
                EndAttack();
                state = State.Free;
                stateTime = 0f;
            }
        }

        void ShowSlash()
        {
            slash.enabled = true;
            slashTimer = 4f / 60f;
            float ang = Mathf.Atan2(atkDir.y, atkDir.x) * Mathf.Rad2Deg;
            slash.transform.localPosition = new Vector3(0f, bodyHeight, 0f);
            slash.transform.localRotation = Quaternion.Euler(0f, 0f, ang);
            float sc = cur.range / PixelArt.SlashRadiusUnits;
            slash.transform.localScale = new Vector3(sc, sc, 1f);
            slash.flipY = comboIndex == 1;
            slash.color = cur.heavy ? new Color(1f, 0.93f, 0.65f) : Color.white;
            slash.sortingOrder = body.sortingOrder + 2;
        }

        void DoHits()
        {
            for (int i = 0; i < Enemy.All.Count; i++)
            {
                Enemy e = Enemy.All[i];
                if (!e.Hittable || hitThisSwing.Contains(e)) continue;
                Vector2 to = e.Center - Center;
                float d = to.magnitude;
                if (d - e.radius > cur.range) continue;
                if (d > 0.25f && Vector2.Angle(atkDir, to) > cur.arcDegrees * 0.5f) continue;
                hitThisSwing.Add(e);
                Vector2 dir = d > 0.01f ? to / d : atkDir;
                Vector2 kbDir = (atkDir + dir).normalized;
                if (kbDir == Vector2.zero) kbDir = atkDir;
                Feel.I.Hit(this, e, cur, kbDir);
            }
        }

        void StartDash()
        {
            state = State.Dash;
            stateTime = 0f;
            ghostCounter = 0;
            dashDir = moveInput.sqrMagnitude > 0.01f ? moveInput.normalized : AimDir;
            dashCd = T.dashFrames / 60f + T.dashCooldown;
            slash.enabled = false;
            Feel.I.PlaySfx(SfxId.Dash, 0.1f, 0.7f);
        }

        void TickDash(float f, float dt)
        {
            pos += dashDir * T.dashSpeed * dt;
            int g = Mathf.FloorToInt(f / 2f);
            if (g >= ghostCounter)
            {
                ghostCounter = g + 1;
                Feel.I.Ghost(bodySprite, transform.position, body.flipX, body.sortingOrder - 1);
            }
            if (f >= 3f && Consume(ref attackPressT))
            {
                StartAttack(T.dashStrike, -1);
                return;
            }
            if (f >= T.dashFrames)
            {
                state = State.Free;
                stateTime = 0f;
            }
        }

        public void HurtBy(Enemy src, Vector2 dir)
        {
            if (Invulnerable) return;
            HitsTaken++;
            hurtInvuln = 0.6f;
            if (state == State.Attack) EndAttack();
            state = State.Free;
            stateTime = 0f;
            slash.enabled = false;
            Feel.I.PlayerHurt(this, src, dir);
        }
    }
}
