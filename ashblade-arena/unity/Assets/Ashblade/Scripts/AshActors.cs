using System.Collections.Generic;
using UnityEngine;

namespace Ashblade
{
    /// <summary>This frame's input, filled by AshGame before the update.</summary>
    public static class In
    {
        public static Vector2 move, aimStick;
        public static Vector2? mouseWorld;
        public static bool attack, attackHeld, dash, burst, aimWithMouse = true;
    }

    public enum Owner { Enemy, Player }

    public class Projectile
    {
        public Vector2 pos, vel;
        public float h, r = 0.28f, dmg, life, t;
        public Owner owner;
        public bool dead, perfectChecked;
        public Enemy src, target;
    }

    public class Pickup
    {
        public bool heart;
        public Vector2 pos, vel;
        public float z, vz, t;
    }

    /// <summary>Freeze (hitstop), flash, knockback applied after the freeze, squash spring, hop height and wall hits.</summary>
    public class Combatant
    {
        public Vector2 pos, knock;
        public Vector2? pendingKnock;
        public float radius = 0.35f, bodyH = 0.4f, hp = 100f, maxHp = 100f, freeze, flashT, z, vz, sq, sqv, friction = 13f;
        public bool alive = true, vibrate, flip;
        public int vibSign = 1;
        public Color32 flashColor = new Color32(255, 255, 255, 255);
        protected static AshTuning T { get { return AshTuning.I; } }

        public virtual Vector2 Center { get { return new Vector2(pos.x, pos.y + bodyH); } }
        public virtual float Hover { get { return 0f; } }
        public void DoFreeze(float s, bool shake) { if (s <= 0f) return; if (s > freeze) freeze = s; if (shake) vibrate = true; }
        public void DoFlash(float s, Color32 c) { if (s <= 0f) return; flashColor = c; if (s > flashT) flashT = s; }
        public void DoKnock(Vector2 v) { if (freeze > 0f) pendingKnock = v; else knock = v; }
        public void Punch(float v) { if (!T.squash) return; sq = v; sqv = 0f; }
        public void ClearMotion() { knock = Vector2.zero; pendingKnock = null; freeze = 0f; flashT = 0f; vibrate = false; z = 0f; vz = 0f; sq = 0f; sqv = 0f; }

        protected virtual void PreTick(float dt) { }
        protected virtual void Tick(float dt) { }
        protected virtual void OnWall(Vector2 n, float speed) { }
        protected virtual void OnLand(float v) { }

        public void Update(float dt)
        {
            PreTick(dt);
            if (flashT > 0f) flashT -= dt;
            if (freeze > 0f)
            {
                freeze -= dt;
                if (vibrate) vibSign = -vibSign;
                if (freeze <= 0f) { vibrate = false; if (pendingKnock.HasValue) knock = pendingKnock.Value; pendingKnock = null; }
                return;
            }
            sqv += (-380f * sq - 15f * sqv) * dt; sq += sqv * dt;
            if (z > 0f || vz > 0f) { vz -= 640f * dt; z += vz * dt; if (z <= 0f) { z = 0f; OnLand(-vz); vz = 0f; } }
            if (knock.sqrMagnitude > 0.0004f) { pos += knock * dt; knock *= Mathf.Exp(-friction * dt); }
            else knock = Vector2.zero;
            Tick(dt);
            float r = radius, sp = knock.magnitude;
            Vector2? wall = null;
            if (pos.x < Arena.xMin + r) { pos.x = Arena.xMin + r; if (knock.x < -6f) wall = Vector2.right; }
            if (pos.x > Arena.xMax - r) { pos.x = Arena.xMax - r; if (knock.x > 6f) wall = Vector2.left; }
            if (pos.y < Arena.yMin + r * 0.5f) { pos.y = Arena.yMin + r * 0.5f; if (knock.y < -6f) wall = Vector2.up; }
            if (pos.y > Arena.yMax - 0.5f) { pos.y = Arena.yMax - 0.5f; if (knock.y > 6f) wall = Vector2.down; }
            if (wall.HasValue)
            {
                if (wall.Value.x != 0f) knock.x *= -0.35f; else knock.y *= -0.35f;
                OnWall(wall.Value, sp);
            }
        }
    }

    // ===================================================================================== player
    public class Smear
    {
        public float a0, a1, r, life, max;
        public bool live, heavy, crit;
        public AttackKind kind;
        public Vector2 dir;
    }

    public class Player : Combatant
    {
        public string state = "Free";
        public float stateTime, lastAttackEnd = -99f, dashCd, hurtInvuln, clock, stepT, runT, deadT;
        public float attackPressT = -99f, dashPressT = -99f, burstPressT = -99f, holdStart;
        public bool wasHeld, swingCrit, charged, perfectUsed, slamDone, burstDone;
        public Attack cur;
        public int comboIndex, nextCombo, ghostCounter;
        public Vector2 atkDir = Vector2.right, aimDir = Vector2.right, moveInput, vel, dashDir = Vector2.right;
        public readonly HashSet<Enemy> hitThisSwing = new HashSet<Enemy>();
        public int hitsTaken;
        public float blade = -110f * M.D2R, bladeStart, bladeExt, empowered, meter, chargeT, hpGhost = 100f;
        public float hurtAnim, spawnAnim, dashEndT, perfectT, victoryAnim; // timers that pick one-shot sprite motions
        public Smear smear;
        public Vector2[] scarf = new Vector2[5], scarfPrev = new Vector2[5];

        public Player() { Reset(); }

        public void Reset()
        {
            ClearMotion();
            pos = new Vector2(0f, -1f); radius = 0.3f; bodyH = 0.5f; maxHp = hp = 100f; hpGhost = 100f; alive = true;
            state = "Free"; stateTime = 0f; cur = null; comboIndex = 0; nextCombo = 0; lastAttackEnd = -99f;
            atkDir = aimDir = dashDir = Vector2.right; moveInput = vel = Vector2.zero;
            dashCd = hurtInvuln = clock = stepT = runT = 0f; ghostCounter = 0;
            attackPressT = dashPressT = burstPressT = -99f; holdStart = 0f; wasHeld = false;
            hitThisSwing.Clear(); hitsTaken = 0; blade = -110f * M.D2R; bladeStart = bladeExt = 0f;
            smear = null; empowered = 0f; swingCrit = false; meter = 0f; chargeT = 0f; charged = perfectUsed = slamDone = burstDone = false; deadT = 0f;
            hurtAnim = dashEndT = perfectT = victoryAnim = 0f; spawnAnim = 30f / 60f;
            for (int i = 0; i < scarf.Length; i++) { scarf[i] = pos + new Vector2(0, 0.55f); scarfPrev[i] = scarf[i]; }
        }

        public bool Invulnerable
        {
            get { return hurtInvuln > 0f || state == "Burst" || state == "Dead" || (state == "Dash" && stateTime * 60f < T.dashInvulnFrames); }
        }
        float RestAngle { get { return flip ? -70f * M.D2R : -110f * M.D2R; } }
        public string StateName
        {
            get
            {
                if (state == "Charge") return "Charge " + Mathf.Min(100, Mathf.RoundToInt(chargeT / T.chargeTime * 100f)) + "%";
                if (state != "Attack") return state;
                float f = stateTime * 60f;
                return cur.name + " / " + (f < cur.startup ? "startup" : f < cur.startup + cur.active ? "ACTIVE" : "recovery");
            }
        }

        protected override void PreTick(float dt)
        {
            moveInput = In.move;
            if (In.attack) attackPressT = clock;
            if (In.dash) dashPressT = clock;
            if (In.burst) burstPressT = clock;
            if (In.attackHeld && !wasHeld) holdStart = clock;
            wasHeld = In.attackHeld;
            Vector2 aim = Vector2.zero;
            if (In.aimStick.sqrMagnitude > 0.09f) aim = In.aimStick;
            else if (In.aimWithMouse && In.mouseWorld.HasValue && !AshInput.PadActive) aim = In.mouseWorld.Value - Center;
            if (aim.sqrMagnitude < 0.01f && moveInput.sqrMagnitude > 0.01f) aim = moveInput;
            if (aim.sqrMagnitude > 0.01f) aimDir = aim.normalized;
            if (state == "Free" || state == "Charge") flip = aimDir.x < 0f;
            else if (state == "Dash") flip = dashDir.x < 0f;
        }

        bool Consume(ref float pressT)
        {
            if (clock - pressT <= (T.inputBuffer ? T.bufferWindow : 1f / 60f + 1e-4f)) { pressT = -99f; return true; }
            return false;
        }

        protected override void Tick(float dt)
        {
            TickInner(dt);
            clock += dt;
        }

        void TickInner(float dt)
        {
            if (hurtInvuln > 0f) hurtInvuln -= dt;
            if (dashCd > 0f) dashCd -= dt;
            if (empowered > 0f)
            {
                empowered -= dt;
                if (Random.value < 0.3f) W.P(new Part { type = PT.Spark, x = pos.x + M.Rand(-0.4f, 0.4f), y = pos.y + M.Rand(0.2f, 1f), vy = M.Rand(1f, 2.5f), life = 0.3f, max = 0.3f, drag = 2, ramp = "gold" });
            }
            if (smear != null) { smear.life -= dt; if (smear.life <= 0f && !smear.live) smear = null; }
            hurtAnim = Mathf.Max(0f, hurtAnim - dt); spawnAnim = Mathf.Max(0f, spawnAnim - dt); dashEndT = Mathf.Max(0f, dashEndT - dt);
            perfectT = Mathf.Max(0f, perfectT - dt); victoryAnim = Mathf.Max(0f, victoryAnim - dt);
            stateTime += dt;
            float f = stateTime * 60f;
            switch (state)
            {
                case "Free": TickFree(dt); break;
                case "Attack": TickAttack(f, dt); break;
                case "Dash": TickDash(f, dt); break;
                case "Charge": TickCharge(dt); break;
                case "Burst": TickBurst(); break;
                case "Dead": deadT += dt; break;
            }
            if (state != "Attack")
            {
                float target = state == "Charge" ? (flip ? 150f : 30f) * M.D2R : RestAngle;
                blade += M.WrapPi(target - blade) * (1f - Mathf.Exp(-14f * dt));
                bladeExt *= Mathf.Exp(-12f * dt);
            }
            UpdateScarf(dt);
        }

        void TickFree(float dt)
        {
            Vector2 target = moveInput * T.moveSpeed;
            float k = 1f - Mathf.Exp(-(moveInput.sqrMagnitude > 0.01f ? 28f : 22f) * dt);
            vel += (target - vel) * k;
            pos += vel * dt;
            if (vel.magnitude > 1f)
            {
                runT += dt; stepT -= dt;
                if (stepT <= 0f) { stepT = 0.16f; W.Dust(pos + new Vector2(0, 0.05f), vel * -0.2f, 1, 0.7f); W.Sfx("step", 1f, 0.2f, 0.35f); }
            }
            else runT = 0f;
            if (dashCd <= 0f && Consume(ref dashPressT)) { StartDash(); return; }
            if (meter >= 100f && Consume(ref burstPressT)) { StartBurst(); return; }
            if (Consume(ref attackPressT))
            {
                if (clock - lastAttackEnd > T.comboResetTime) nextCombo = 0;
                StartAttack(T.combo[nextCombo], nextCombo); return;
            }
            if (In.attackHeld && clock - holdStart > 0.22f) StartCharge();
        }

        public void StartAttack(Attack a, int index)
        {
            cur = a; comboIndex = index; state = "Attack"; stateTime = 0f;
            atkDir = aimDir;
            if (T.aimAssist) atkDir = W.AimAssist(Center, atkDir, T.aimAssistAngle, a.range + T.aimAssistRange);
            hitThisSwing.Clear(); W.killsThisSwing = 0;
            flip = atkDir.x < 0f; bladeStart = blade; slamDone = false;
            swingCrit = false;
            if (empowered > 0f) { swingCrit = true; empowered = 0f; }
            Punch(a.heavy ? 0.22f : 0.12f);
            vel = Vector2.zero;
            if (AshAudio.I != null) AshAudio.I.Charge(false);
        }

        void EndAttack()
        {
            lastAttackEnd = clock;
            nextCombo = comboIndex >= 0 && comboIndex + 1 < T.combo.Length ? comboIndex + 1 : 0;
            if (smear != null) smear.live = false;
        }

        float BladeAt(float f)
        {
            Attack c = cur;
            float s = c.startup, a = s + c.active, b = M.Ang(atkDir), sign = atkDir.x < 0f ? -1f : 1f;
            float from = b + c.from * M.D2R * sign, to = b + c.to * M.D2R * sign;
            if (f < s) return bladeStart + M.WrapPi(from - bladeStart) * M.EaseOut(f / s);
            if (f < a) return from + (to - from) * M.EaseOut((f - s) / c.active);
            float p = (f - a) / c.recovery;
            return p < 0.6f ? to : to + M.WrapPi(RestAngle - to) * M.EaseOut((p - 0.6f) / 0.4f);
        }

        void TickAttack(float f, float dt)
        {
            Attack c = cur;
            float s = c.startup, a = s + c.active, end = a + c.recovery;
            float backEnd = c.back ? s * 0.7f : 0f;
            if (f < backEnd) pos += atkDir * (-c.lunge * 0.22f / (backEnd / 60f) * dt);
            else if (f < a) pos += atkDir * (c.lunge * (c.back ? 1.22f : 1f) / ((a - backEnd) / 60f) * dt);
            blade = BladeAt(f);
            if (c.kind == AttackKind.Thrust) bladeExt = f < a ? 6f * M.EaseOut(f / a) : bladeExt * Mathf.Exp(-10f * dt);
            if (f >= s && f < a)
            {
                if (smear == null || !smear.live)
                {
                    float from = BladeAt(s);
                    smear = new Smear { a0 = from, a1 = from, r = c.range * Art.PPU, life = 0.13f, max = 0.13f, live = true, kind = c.kind, heavy = c.heavy, crit = swingCrit, dir = atkDir };
                    W.Sfx(c.kind == AttackKind.Spin ? "spin" : c.kind == AttackKind.Thrust ? "thrust" : c.heavy ? "swingHeavy" : "swing", 1f, 0.08f, 0.9f);
                    if (c.kind == AttackKind.Thrust) W.SpeedLines(Center, atkDir, 6);
                    Ench.OnSwing(this, c, Ench.SlotOf(comboIndex), pos, atkDir, false);
                    Punch(c.heavy ? -0.18f : -0.1f);
                }
                smear.a1 = blade; smear.life = smear.max;
                DoHits();
                if (c.heavy && c.kind == AttackKind.Slash && !slamDone && f >= a - 1.5f)
                {
                    slamDone = true;
                    Vector2 tip = pos + atkDir * (c.range * 0.85f);
                    W.Crack(tip, M.Ang(atkDir), 10, 3); W.Dust(tip, Vector2.up, 6, 1.2f); W.Debris(tip, 6, W.Rubble, null, 1.2f, 1f, 0.8f);
                    W.RingFx(tip, 2, 18, 2, 0.22f, "steel", 0.55f);
                    W.AddShake(0.18f, atkDir, 2); W.Sfx("slam", 1.4f, 0.05f, 0.5f);
                }
            }
            else if (smear != null && smear.live && f >= a) smear.live = false;
            bool inRecovery = f >= a;
            if (T.dashCancel && (f < s || inRecovery) && dashCd <= 0f && Consume(ref dashPressT)) { EndAttack(); StartDash(); return; }
            if (inRecovery && meter >= 100f && Consume(ref burstPressT)) { EndAttack(); StartBurst(); return; }
            if (inRecovery && comboIndex >= 0 && comboIndex + 1 < T.combo.Length && Consume(ref attackPressT)) { EndAttack(); StartAttack(T.combo[comboIndex + 1], comboIndex + 1); return; }
            if (f >= end)
            {
                EndAttack(); state = "Free"; stateTime = 0f;
                if (In.attackHeld && clock - holdStart > 0.22f) StartCharge();
            }
        }

        void DoHits()
        {
            Attack c = cur;
            foreach (var e in W.enemies.ToArray())
            {
                if (!e.Hittable || hitThisSwing.Contains(e)) continue;
                Vector2 to = e.Center - Center; float d = to.magnitude;
                if (d - e.radius > c.range) continue;
                if (c.arc < 360f && d > 0.3f && M.AngleBetween(atkDir, to) > c.arc / 2f) continue;
                if (c.kind == AttackKind.Spin && smear != null)
                {
                    float span = smear.a1 - smear.a0, sg = span >= 0f ? 1f : -1f;
                    float back = (smear.a1 - M.Ang(to)) * sg; back = ((back % M.TAU) + M.TAU) % M.TAU;
                    if (Mathf.Abs(span) < M.TAU && back > Mathf.Abs(span) + 0.3f) continue;
                }
                hitThisSwing.Add(e);
                Vector2 dir = d > 0.01f ? to / d : atkDir;
                Vector2 kb = c.kind == AttackKind.Spin ? dir : M.Norm(atkDir + dir);
                if (kb.sqrMagnitude < 0.25f) kb = atkDir;
                W.HitEnemy(e, c, kb, this, swingCrit);
                Ench.OnHit(e, c, kb, Ench.SlotOf(comboIndex), 0);
            }
            foreach (var pr in W.projectiles)
            {
                if (pr.owner != Owner.Enemy || pr.dead) continue;
                Vector2 to = pr.pos - pos; float d = to.magnitude;
                if (d > c.range + 0.5f) continue;
                if (c.arc < 360f && d > 0.6f && M.AngleBetween(atkDir, to) > c.arc / 2f + 15f) continue;
                W.Deflect(pr, this);
            }
        }

        void StartDash()
        {
            if (state == "Charge" && AshAudio.I != null) AshAudio.I.Charge(false);
            state = "Dash"; stateTime = 0f; ghostCounter = 0; perfectUsed = false;
            dashDir = moveInput.sqrMagnitude > 0.01f ? moveInput.normalized : aimDir;
            dashCd = T.dashFrames / 60f + T.dashCooldown; smear = null; bladeExt = 0f;
            Punch(Mathf.Abs(dashDir.x) > 0.6f ? 0.32f : -0.28f);
            W.Dust(pos, -dashDir, 5, 1.1f);
            W.Sfx("dash", 1f, 0.1f, 0.8f);
        }

        void TickDash(float f, float dt)
        {
            pos += dashDir * (T.dashSpeed * dt);
            vel = dashDir * T.moveSpeed;
            int g = Mathf.FloorToInt(f / 1.5f);
            if (g >= ghostCounter && T.trails)
            {
                ghostCounter = g + 1;
                W.PF(new Part { type = PT.Ghost, spr = PlayerSheet.Pick(this) ?? Art.PlayerRunA, x = pos.x, y = pos.y, flip = flip, life = 0.22f, max = 0.22f, col = g % 2 == 1 ? Col.H("#6fd0ff") : Col.H("#b08aff") });
            }
            if (Random.value < 0.6f) W.SpeedLines(Center, dashDir, 1);
            if (f >= 3f && Consume(ref attackPressT)) { StartAttack(T.dashStrike, -1); return; }
            if (f >= T.dashFrames)
            {
                state = "Free"; stateTime = 0f; dashEndT = 6f / 60f; Punch(Mathf.Abs(dashDir.x) > 0.6f ? -0.15f : 0.15f);
                W.Dust(pos, dashDir, 3, 0.8f);
            }
        }

        void StartCharge() { state = "Charge"; stateTime = 0f; chargeT = 0f; charged = false; if (AshAudio.I != null) AshAudio.I.Charge(true); }

        void TickCharge(float dt)
        {
            chargeT += dt;
            Vector2 target = moveInput * (T.moveSpeed * 0.35f);
            vel += (target - vel) * (1f - Mathf.Exp(-20f * dt));
            pos += vel * dt;
            float k = Mathf.Min(1f, chargeT / T.chargeTime);
            if (Random.value < 0.5f + k * 0.5f) W.Converge(Center, 1, 1.4f - k * 0.5f, k >= 1f ? "gold" : "fire", 0.18f);
            if (!charged && chargeT >= T.chargeTime)
            {
                charged = true; DoFlash(0.08f, new Color32(255, 255, 255, 255)); Punch(0.3f);
                W.RingFx(Center, 2, 22, 2, 0.25f, "gold"); W.Sparks(Center, Vector2.up, 10, 9, 360, "gold");
                W.Sfx("chargeFull"); W.Rumble(0.2f, 0.5f, 80);
            }
            if (dashCd <= 0f && Consume(ref dashPressT)) { StartDash(); return; }
            if (!In.attackHeld)
            {
                if (AshAudio.I != null) AshAudio.I.Charge(false);
                attackPressT = -99f;
                if (charged) StartAttack(T.spin, -2);
                else { state = "Free"; stateTime = 0f; }
            }
        }

        void StartBurst()
        {
            meter = 0f; state = "Burst"; stateTime = 0f; burstDone = false; vz = 210f; z = 0.01f;
            Punch(-0.35f); W.Slowmo(0.45f, 0.28f); W.Converge(Center, 30, 2.6f, "fire", 0.28f); W.Sfx("spawn", 1.5f, 0.05f, 0.8f); W.Muffle(true);
            if (AshAudio.I != null) AshAudio.I.Charge(false);
        }

        void TickBurst()
        {
            if (!burstDone && stateTime > 0.3f) { burstDone = true; W.AshBurst(this); }
            if (stateTime > 0.62f) { state = "Free"; stateTime = 0f; }
        }

        protected override void OnLand(float v) { if (v > 120f) { Punch(0.35f); W.Dust(pos, Vector2.up, 6, 1.2f); } }

        void UpdateScarf(float dt)
        {
            if (dt <= 0f) return;
            Vector2 anchor = new Vector2(pos.x + (flip ? 0.12f : -0.12f), pos.y + 0.62f + z / Art.PPU);
            const float seg = 0.17f;
            scarf[0] = anchor; scarfPrev[0] = anchor;
            Vector2 wind = vel * -0.02f;
            for (int i = 1; i < scarf.Length; i++)
            {
                Vector2 p = scarf[i], q = scarfPrev[i];
                float nx = p.x + (p.x - q.x) * 0.86f + wind.x * dt * 4f + (flip ? 0.04f : -0.04f) * dt * 6f;
                float ny = p.y + (p.y - q.y) * 0.86f - 2.2f * dt * dt + wind.y * dt * 4f + Mathf.Sin(W.realTime * 9f + i) * 0.002f;
                scarfPrev[i] = p; scarf[i] = new Vector2(nx, ny);
            }
            for (int it = 0; it < 3; it++)
                for (int i = 1; i < scarf.Length; i++)
                {
                    Vector2 d = scarf[i] - scarf[i - 1]; float l = d.magnitude; if (l < 1e-4f) l = 1e-4f;
                    scarf[i] = scarf[i - 1] + d * (seg / l);
                }
        }

        public bool HurtBy(Combatant src, Vector2 dir, float dmg)
        {
            if (Invulnerable) return false;
            if (T.god) dmg = 0f;
            hp = Mathf.Max(0f, hp - dmg); hitsTaken++; hurtInvuln = 0.8f; hurtAnim = 12f / 60f; spawnAnim = victoryAnim = dashEndT = perfectT = 0f;
            if (state == "Attack") EndAttack();
            if (state == "Charge" && AshAudio.I != null) AshAudio.I.Charge(false);
            state = "Free"; stateTime = 0f; smear = null;
            float hs = T.hitstop ? 7f / 60f * T.hitstopScale : 0f;
            DoFreeze(hs, true); if (src != null) src.DoFreeze(hs, false);
            if (T.hitFlash) DoFlash(hs + 5f / 60f, Col.H("#ff4d5a"));
            if (T.knockback) DoKnock(dir * (10f * T.knockbackScale));
            Punch(-0.35f);
            W.AddShake(0.55f, dir, 5); W.Chroma(1f, dir); W.ScreenFlash(new Color(1f, 0.13f, 0.25f), 0.28f, 0.18f);
            W.Sparks(Center, dir, 12, 10, 120, "fire");
            W.Sfx("hurt"); W.Rumble(1f, 0.6f, 220);
            if (dmg > 0f) W.PopText(pos.x, pos.y + 1.2f, "-" + Mathf.RoundToInt(dmg), "#ff6a6a", 2, true, 16, dir.x * 1.5f);
            if (W.combo >= 5) W.PopText(pos.x, pos.y + 1.6f, "COMBO LOST", "#ff9aa0", 1, false, 22, 0, 70, 0.9f);
            W.combo = 0; W.comboTimer = 0f;
            if (hp <= 0f) Die();
            return true;
        }

        void Die()
        {
            state = "Dead"; stateTime = 0f; deadT = 0f;
            if (AshAudio.I != null) AshAudio.I.Charge(false);
            W.Slowmo(0.2f, 1.2f); W.ZoomPunch(0.12f); W.hold = 1.2f; W.holdAt = null; W.ImpactFrame(Center, 0.1f, this);
            W.Sfx("fell"); W.Muffle(true);
            W.Banner("YOU FELL", Col.H("#ff6a6a"), 99f, "PRESS R TO RETRY");
        }
    }

    // ===================================================================================== enemies
    public class Enemy : Combatant
    {
        static int seedCounter;
        public readonly EnemyKind kind;
        public readonly KindStats K;
        public readonly Spr spr;
        public string state = "Spawn";
        public float stateTime, deadT, cool, telePop, broken, hpGhost, hpShowT, chainHit;
        public int staggerF = 16, poise;
        public readonly int seed;
        public readonly float strafe;
        public bool dying, lungeHit;
        public EnchStatus st; // burn / chill / freeze from enchants
        public Vector2 aimDir = Vector2.right, dieDir = Vector2.right;

        public Enemy(EnemyKind kind, Vector2 at)
        {
            this.kind = kind; K = T.Kind(kind); pos = at; radius = K.radius; bodyH = K.bodyH;
            maxHp = hp = hpGhost = K.hp;
            cool = M.Rand(0.6f, 1.4f); poise = K.poise; seed = seedCounter++;
            strafe = Random.value < 0.5f ? -1f : 1f; friction = kind == EnemyKind.Brute ? 16f : 12f;
            spr = kind == EnemyKind.Grunt ? Art.Grunt : kind == EnemyKind.Wisp ? Art.Wisp : Art.Brute;
            W.Sfx("spawn", 1f, 0.1f, 0.5f);
        }

        public bool Hittable { get { return alive && !dying && state != "Spawn" && state != "Dead"; } }
        public bool SuperArmor { get { return K.armor && (state == "Windup" || state == "Attack") && broken <= 0f; } }
        public override float Hover { get { return kind == EnemyKind.Wisp ? 6f + Mathf.Sin(W.realTime * 4f + seed) * 2f : 0f; } }
        public override Vector2 Center { get { return new Vector2(pos.x, pos.y + bodyH + Hover / Art.PPU); } }

        public bool TakeDamage(float d)
        {
            if (!Hittable) return false;
            hp -= d; hpShowT = 2.2f;
            if (hp <= 0f) { hp = 0f; dying = true; return true; }
            return false;
        }

        public void Stagger(int frames)
        {
            if (dying) return;
            if (state == "Windup") W.PopText(pos.x, pos.y + 1.4f, "INTERRUPT", "#ffe066", 1, false, 34, 0, 70, 0.6f);
            state = "Stagger"; stateTime = 0f; staggerF = frames;
        }

        protected override void OnWall(Vector2 n, float sp)
        {
            if (dying || state == "Dead" || !T.knockback) return;
            int dmg = Mathf.RoundToInt(4f + sp * 0.5f);
            hp -= dmg; hpShowT = 2f;
            Vector2 hitPt = new Vector2(pos.x - n.x * radius, pos.y + 0.2f - n.y * radius);
            DoFreeze(T.hitstop ? 4f / 60f * T.hitstopScale : 0f, true); DoFlash(0.08f, new Color32(255, 255, 255, 255)); Punch(n.x != 0f ? -0.35f : 0.35f);
            W.Dust(hitPt, n, 8, 1.2f); W.Debris(hitPt, 6, W.Rubble, M.Ang(n), 1.3f);
            W.StarFlash(hitPt, n, 7, "steel");
            W.AddShake(0.25f, -n, 3); W.Sfx("wall", 1f, 0.05f, 0.8f); W.Rumble(0.5f, 0.3f, 90);
            W.PopText(pos.x, pos.y + 1.2f, "WALL " + dmg, "#ffd166", 1, true);
            if (hp <= 0f) { hp = 0f; dying = true; W.RegisterKill(this, n, false, null); }
        }

        protected override void OnLand(float v) { if (state == "Dead") return; if (v > 100f) W.Dust(pos, Vector2.up, 4, 1f); }

        protected override void Tick(float dt)
        {
            stateTime += dt;
            float f = stateTime * 60f;
            var p = W.player;
            if (telePop > 0f) telePop -= dt;
            if (hpShowT > 0f) hpShowT -= dt;
            if (broken > 0f)
            {
                broken -= dt;
                if (broken <= 0f) poise = K.poise;
                if (Random.value < 0.15f) W.P(new Part { type = PT.Spark, x = pos.x + M.Rand(-0.4f, 0.4f), y = pos.y + 1.4f, vx = M.Rand(-1f, 1f), vy = M.Rand(0f, 1f), life = 0.3f, max = 0.3f, drag = 2, ramp = "gold" });
            }
            if (chainHit > 0f) chainHit -= dt;
            if (dying && state != "Dead")
            {
                state = "Dead"; stateTime = 0f; deadT = 0f; vz = 150f; z = Mathf.Max(z, 0.01f); flashT = 0.25f; flashColor = new Color32(255, 255, 255, 255);
                return;
            }
            Vector2 toP = p.pos - pos; float dist = toP.magnitude; Vector2 nP = M.Norm(toP);
            bool playerDown = p.state == "Dead";
            switch (state)
            {
                case "Spawn":
                    if (Random.value < 0.5f) W.Embers(pos, 1, kind == EnemyKind.Wisp ? "violet" : "fire", 1.5f);
                    if (stateTime >= 0.8f)
                    {
                        state = "Chase"; stateTime = 0f; z = 10f; vz = 0f; Punch(-0.4f);
                        W.RingFx(pos + new Vector2(0, 0.1f), 3, 22f * (kind == EnemyKind.Brute ? 1.4f : 1f), 2, 0.25f, kind == EnemyKind.Wisp ? "violet" : "fire", 0.6f);
                        W.Smoke(pos, 6, 1.6f, kind == EnemyKind.Brute ? 1.5f : 1f, "#3e3050"); W.Sfx("pop", 1f, 0.05f, 0.7f);
                    }
                    return;
                case "Dead":
                    deadT += dt; flashT = Mathf.Max(flashT, 0.05f);
                    flashColor = Mathf.FloorToInt(deadT * 30f) % 2 == 1 ? new Color32(255, 255, 255, 255) : Col.H("#ffe0a0");
                    if (deadT > 0.2f) W.ExplodeEnemy(this);
                    return;
                case "Chase":
                {
                    cool -= dt;
                    Vector2 mv;
                    if (playerDown) mv = new Vector2(Mathf.Cos(seed), Mathf.Sin(seed)) * 0.2f;
                    else if (kind == EnemyKind.Wisp)
                    {
                        float want = dist > 7f ? 1f : dist < 4.5f ? -1f : 0f;
                        mv = nP * want + new Vector2(-nP.y, nP.x) * (strafe * 0.7f);
                        if (cool <= 0f && dist < 10f) BeginWindup();
                    }
                    else
                    {
                        mv = nP + new Vector2(-nP.y, nP.x) * (strafe * (dist > 3f ? 0.35f : 0f));
                        float reach = kind == EnemyKind.Brute ? 2.0f : 2.4f;
                        if (dist < reach && cool <= 0f) BeginWindup();
                    }
                    if (state == "Chase")
                    {
                        float sp = K.speed * (broken > 0f ? 0.5f : 1f);
                        pos += M.Norm(mv) * (sp * dt * Mathf.Min(1f, mv.magnitude * 2f));
                    }
                    break;
                }
                case "Windup":
                {
                    float k = f / K.windup;
                    if (k < 0.72f && !playerDown && toP.sqrMagnitude > 0.0001f) aimDir = nP;
                    if (kind == EnemyKind.Grunt) { sq = 0.22f * M.EaseOut(k * 1.5f); vibSign = Mathf.FloorToInt(f / 2f) % 2 == 1 ? 1 : -1; }
                    if (kind == EnemyKind.Brute) { sq = -0.18f * M.EaseOut(k); z = 5f * M.EaseOut(k); }
                    if (kind == EnemyKind.Wisp && Random.value < 0.6f) W.Converge(Center + aimDir * 0.4f, 1, 0.9f, "violet", 0.16f);
                    if (f >= K.windup) BeginAttack();
                    break;
                }
                case "Attack":
                    if (kind == EnemyKind.Grunt)
                    {
                        pos += aimDir * (11f * dt);
                        if (Random.value < 0.7f) W.SpeedLines(Center, aimDir, 1);
                        if (!lungeHit && (p.pos - pos).magnitude < radius + p.radius + 0.28f)
                        {
                            lungeHit = true;
                            if (p.state == "Dash" && p.Invulnerable) W.PerfectDodge(this);
                            else p.HurtBy(this, aimDir, K.dmg);
                        }
                        if (f >= 11f) { state = "Recover"; stateTime = 0f; Punch(0.25f); W.Dust(pos, -aimDir, 3); }
                    }
                    else if (f >= 8f) { state = "Recover"; stateTime = 0f; }
                    break;
                case "Recover":
                    if (kind == EnemyKind.Brute) z = 0f;
                    if (f >= K.recover) { state = "Chase"; stateTime = 0f; cool = kind == EnemyKind.Wisp ? M.Rand(1.2f, 2.2f) : M.Rand(0.2f, 0.7f); }
                    break;
                case "Stagger":
                    if (f >= staggerF) { state = "Chase"; stateTime = 0f; cool = Mathf.Max(cool, 0.35f); }
                    break;
            }
            foreach (var o in W.enemies.ToArray())
            {
                if (o == this || !o.alive || o.state == "Spawn" || o.state == "Dead") continue;
                Vector2 d = pos - o.pos; float m = d.magnitude, min = radius + o.radius;
                if (m < min && m > 1e-4f)
                {
                    float ks = knock.magnitude;
                    if (ks > 7f && o.chainHit <= 0f && o.Hittable && T.knockback)
                    {
                        o.chainHit = 0.4f;
                        Vector2 dir = M.Norm(-d);
                        o.DoKnock(dir * (ks * 0.7f / o.K.mass)); o.Punch(0.3f); o.DoFlash(0.06f, new Color32(255, 255, 255, 255));
                        const int dmg = 6; o.hp -= dmg; o.hpShowT = 2f;
                        if (!o.SuperArmor) o.Stagger(14);
                        W.StarFlash((Center + o.Center) * 0.5f, dir, 6, "fire"); W.AddShake(0.15f, dir, 2); W.Sfx("hit", 1.3f, 0.05f, 0.6f);
                        W.PopText(o.pos.x, o.pos.y + 1.2f, "BONK " + dmg, "#ffb070", 1, true);
                        knock *= 0.5f;
                        if (o.hp <= 0f) { o.hp = 0f; o.dying = true; W.RegisterKill(o, dir, false, null); }
                    }
                    float w = o.K.mass / (K.mass + o.K.mass);
                    pos += d * ((min - m) * w / m);
                }
            }
            if (!playerDown)
            {
                Vector2 d = pos - p.pos; float m = d.magnitude, min = radius + p.radius;
                if (m < min && m > 1e-4f && p.state != "Dash") pos += d * ((min - m) / m);
            }
            if (state != "Attack") flip = p.pos.x < pos.x;
        }

        void BeginWindup()
        {
            state = "Windup"; stateTime = 0f; telePop = 0.3f;
            aimDir = M.Norm(W.player.pos - pos); if (aimDir.sqrMagnitude < 0.25f) aimDir = Vector2.right;
            W.Sfx("tele", kind == EnemyKind.Brute ? 0.7f : kind == EnemyKind.Wisp ? 1.3f : 1f, 0.05f, kind == EnemyKind.Brute ? 0.9f : 0.6f);
        }

        void BeginAttack()
        {
            state = "Attack"; stateTime = 0f; lungeHit = false; sq = 0f;
            var p = W.player;
            if (kind == EnemyKind.Grunt) { Punch(-0.35f); W.Sfx("dash", 1.3f, 0.05f, 0.5f); }
            else if (kind == EnemyKind.Wisp)
            {
                Vector2 c = Center;
                W.projectiles.Add(new Projectile { pos = pos + aimDir * 0.5f, h = 8f + Hover, vel = aimDir * 5.5f, owner = Owner.Enemy, dmg = K.dmg, life = 4f, src = this });
                Punch(0.3f); knock = aimDir * -3f;
                W.Sparks(c + aimDir * 0.4f, aimDir, 6, 6, 70, "violet"); W.Sfx("shoot", 1f, 0.05f, 0.8f);
            }
            else
            {
                z = 0f; Punch(0.5f);
                float R = K.slamR; Vector2 c = pos;
                W.RingFx(c, 4, R * Art.PPU, 3, 0.32f, "fire", 0.75f); W.RingFx(c, 2, R * Art.PPU * 0.6f, 2, 0.22f, "steel", 0.75f);
                W.Dust(c, Vector2.right, 8, 1.6f); W.Dust(c, Vector2.left, 8, 1.6f);
                W.Debris(c, 14, W.Rubble, null, 1.2f, 1.3f, 1.2f);
                for (int i = 0; i < 4; i++) W.Crack(c, M.Rand(0, M.TAU), 14, 1);
                W.Scorch(c, 10);
                float dp = (p.pos - c).magnitude;
                W.AddShake(Mathf.Clamp(0.6f - dp * 0.05f, 0.15f, 0.6f), Vector2.down, 4); W.Sfx("slam"); W.Rumble(0.7f, 0.4f, 160);
                if (dp < R + p.radius && p.state != "Dead")
                {
                    if (p.state == "Dash" && p.Invulnerable) W.PerfectDodge(this);
                    else p.HurtBy(this, dp > 0.1f ? (p.pos - c) / dp : Vector2.right, K.dmg);
                }
            }
        }
    }
}
