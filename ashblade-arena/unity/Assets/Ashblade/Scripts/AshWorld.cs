using System.Collections.Generic;
using UnityEngine;

namespace Ashblade
{
    public enum PT { Spark, Debris, Smoke, Ember, Ring, Star, Line, Ghost, Text }

    public class Part
    {
        public PT type;
        public float x, y, z, vx, vy, vz, life, max, drag, g, r0, r1, size, len, ang, seed, grav, pop, rise, squash;
        public int w;
        public string ramp;
        public Color32 col;
        public bool inward, stamp, stamped, flip;
        public Spr spr;
        public Sprite img;
    }

    public class Impact { public float t, max, x, y, seed; public List<Combatant> silh = new List<Combatant>(); }

    /// <summary>Hex colours parsed once.</summary>
    public static class Col
    {
        static readonly Dictionary<string, Color32> cache = new Dictionary<string, Color32>();
        public static Color32 H(string hex)
        {
            Color32 c;
            if (!cache.TryGetValue(hex, out c)) { c = M.Hex(hex); cache[hex] = c; }
            return c;
        }
    }

    /// <summary>Game state and every feel/combat function, ported one to one from the web build.</summary>
    public static class W
    {
        public static AshTuning T { get { return AshTuning.I; } }

        public static Player player;
        public static List<Enemy> enemies = new List<Enemy>();
        public static readonly List<Projectile> projectiles = new List<Projectile>();
        public static readonly List<Pickup> pickups = new List<Pickup>();
        public static readonly List<Part> parts = new List<Part>();

        public static float time, realTime, labSlow = 1f;
        public static bool paused;
        public static int kills, combo, bestCombo, gradeIdx = -1, killsThisSwing, pickupChain;
        public static float comboTimer, comboJolt, gradePop, pickupChainT;

        // camera
        public static float camX, camY, trauma, zoom = 1f, zoomV, hold;
        public static Vector2 kick, kickV;
        public static Vector2? holdAt;
        // slow-mo
        public static float slowScale = 1f, slowTarget = 1f, slowT;
        // screen fx
        public static Impact impact;
        public static float chroma, chromaDir = 1f;
        public static Color flashColor; public static float flashA, flashT, flashMax;
        public static string bannerText, bannerSub; public static Color32 bannerColor; public static float bannerT, bannerMax;
        // waves
        public static int waveN;
        public static readonly List<EnemyKind> queue = new List<EnemyKind>();
        public static float spawnT, waveT = 1f;
        public static string waveState = "intro";

        public static readonly Dictionary<string, Color32[]> Ramps = new Dictionary<string, Color32[]>
        {
            { "fire", new[] { Col.H("#ffffff"), Col.H("#fff3a0"), Col.H("#ffc24a"), Col.H("#ff7a2a"), Col.H("#c8321e") } },
            { "gold", new[] { Col.H("#ffffff"), Col.H("#fff8c8"), Col.H("#ffe066"), Col.H("#ffb020"), Col.H("#c87010") } },
            { "ice", new[] { Col.H("#ffffff"), Col.H("#dff8ff"), Col.H("#8fdcff"), Col.H("#3a9ee8"), Col.H("#24508a") } },
            { "violet", new[] { Col.H("#ffffff"), Col.H("#f2dcff"), Col.H("#c08af0"), Col.H("#8a4ad0"), Col.H("#4e2a8a") } },
            { "steel", new[] { Col.H("#ffffff"), Col.H("#e8eef8"), Col.H("#b8c4d8"), Col.H("#7884a0"), Col.H("#444c66") } },
            { "acid", new[] { Col.H("#ffffff"), Col.H("#e8ffd0"), Col.H("#a8f070"), Col.H("#5cc04a"), Col.H("#2a6a30") } },
        };
        public static readonly Dictionary<string, Color> GlowCol = new Dictionary<string, Color>
        {
            { "fire", new Color(1f, 0.59f, 0.24f) }, { "gold", new Color(1f, 0.82f, 0.35f) }, { "ice", new Color(0.47f, 0.82f, 1f) },
            { "violet", new Color(0.7f, 0.43f, 1f) }, { "steel", new Color(0.78f, 0.86f, 1f) }, { "red", new Color(1f, 0.24f, 0.24f) }, { "acid", new Color(0.59f, 0.94f, 0.43f) },
        };
        public static Color32 RampCol(string ramp, float k)
        {
            Color32[] r;
            if (!Ramps.TryGetValue(ramp, out r)) r = Ramps["fire"];
            return r[Mathf.Clamp(Mathf.FloorToInt((1f - k) * r.Length), 0, r.Length - 1)];
        }

        public static void Sfx(string n, float rate = 1f, float vary = 0.05f, float vol = 1f) { if (AshAudio.I != null) AshAudio.I.Play(n, rate, vary, vol); }
        public static void Rumble(float s, float w, float ms) { if (T.rumble) AshInput.Rumble(s, w, ms); }

        // ================================================================== feel primitives
        public static void AddShake(float amount, Vector2 dir, float kickPx)
        {
            if (!T.shake) return;
            trauma = Mathf.Min(1f, trauma + amount * T.shakeScale);
            if (kickPx > 0f && dir.sqrMagnitude > 1e-6f) { Vector2 d = dir.normalized; kick = new Vector2(d.x, -d.y) * kickPx * T.shakeScale; kickV = Vector2.zero; }
        }
        public static void ZoomPunch(float a) { if (!T.zoom) return; zoom = Mathf.Max(zoom, 1f + a); zoomV = 0f; }
        public static void Slowmo(float scale, float dur)
        {
            if (!T.slowmo) return;
            if (slowT > 0f && scale > slowTarget) return;
            slowTarget = scale; slowT = Mathf.Max(dur, slowT);
        }
        public static void ImpactFrame(Vector2 at, float dur, params Combatant[] silh)
        {
            if (!T.impactFrame) return;
            impact = new Impact { t = dur, max = dur, x = at.x, y = at.y, seed = Random.value * 1000f };
            foreach (var c in silh) if (c != null) impact.silh.Add(c);
        }
        public static void Chroma(float a, Vector2 dir) { if (!T.chroma) return; chroma = Mathf.Max(chroma, a); chromaDir = dir.x < 0 ? -1f : 1f; }
        public static void ScreenFlash(Color c, float a, float dur) { flashColor = c; flashA = a; flashT = dur; flashMax = dur; }
        public static void Banner(string text, Color32 color, float dur, string sub = null) { bannerText = text; bannerColor = color; bannerSub = sub; bannerT = dur; bannerMax = dur; }

        public static void PopText(float x, float y, string str, string color, int s, bool number = false, float z = 16f, float vx = 0f, float vz = 70f, float life = 0.75f, float grav = 260f, float pop = 1.3f)
        {
            if (number && !T.numbers) return;
            if (number)
            {
                int stack = 0;
                foreach (var q in parts) if (q.type == PT.Text && q.max - q.life < 0.35f && Mathf.Abs(q.x - x) < 1f && Mathf.Abs(q.y - y) < 1f) stack++;
                z += stack * 9f; x += M.Rand(-0.25f, 0.25f);
            }
            PF(new Part { type = PT.Text, x = x, y = y, z = z, vx = vx, vz = vz, img = PixelFont.Spr(str, Col.H(color), s), life = life, max = life, grav = grav, pop = pop });
        }

        public static void P(Part p) { if (T.particles && parts.Count < 1600) parts.Add(p); }
        public static void PF(Part p) { if (parts.Count < 1700) parts.Add(p); }

        public static void Sparks(Vector2 pt, Vector2 dir, int n, float speed, float spread, string ramp = "fire", float lifeMul = 1f, float drag = 6f, float g = 10f)
        {
            float b = M.Ang(dir);
            for (int i = 0; i < n; i++)
            {
                float a = b + M.Rand(-spread / 2f, spread / 2f) * M.D2R, sp = M.Rand(0.45f, 1f) * speed, life = M.Rand(0.14f, 0.34f) * lifeMul;
                P(new Part { type = PT.Spark, x = pt.x, y = pt.y, vx = Mathf.Cos(a) * sp, vy = Mathf.Sin(a) * sp, life = life, max = life, drag = drag, g = g, ramp = ramp });
            }
        }
        public static void StarFlash(Vector2 pt, Vector2 dir, float size, string ramp = "fire", float life = 0.09f)
        {
            P(new Part { type = PT.Star, x = pt.x, y = pt.y, ang = M.Ang(dir), size = size, life = life, max = life, ramp = ramp });
        }
        public static void RingFx(Vector2 pt, float r0, float r1, int w, float life, string ramp = "fire", float squash = 0.8f)
        {
            P(new Part { type = PT.Ring, x = pt.x, y = pt.y, r0 = r0, r1 = r1, w = w, life = life, max = life, ramp = ramp, squash = squash });
        }
        public static void Smoke(Vector2 pt, int n, float speed = 1.6f, float size = 1f, string col = "#5a5068", float lifeMul = 1f, float rise = 6f)
        {
            for (int i = 0; i < n; i++)
            {
                float a = M.Rand(0, M.TAU), sp = M.Rand(0.3f, 1f) * speed, life = M.Rand(0.35f, 0.7f) * lifeMul;
                P(new Part { type = PT.Smoke, x = pt.x + M.Rand(-0.15f, 0.15f), y = pt.y + M.Rand(-0.1f, 0.1f), vx = Mathf.Cos(a) * sp, vy = Mathf.Sin(a) * sp * 0.6f,
                    r0 = M.Rand(1.5f, 3f) * size, r1 = M.Rand(3f, 5.5f) * size, life = life, max = life, col = Col.H(col), rise = rise });
            }
        }
        public static void Dust(Vector2 pt, Vector2 dir, int n, float size = 1f)
        {
            for (int i = 0; i < n; i++)
            {
                float a = M.Ang(dir) + M.Rand(-0.9f, 0.9f), sp = M.Rand(0.6f, 2.2f), life = M.Rand(0.25f, 0.45f);
                P(new Part { type = PT.Smoke, x = pt.x, y = pt.y, vx = Mathf.Cos(a) * sp, vy = Mathf.Sin(a) * sp * 0.6f, r0 = M.Rand(1f, 2f) * size, r1 = M.Rand(2.5f, 3.5f) * size,
                    life = life, max = life, col = Col.H("#6a6078"), rise = 3f });
            }
        }
        public static void Debris(Vector2 pt, int n, Color32[] cols, float? dir = null, float spread = 1.2f, float speed = 1f, float up = 1f, bool stamp = false, float z = -1f)
        {
            for (int i = 0; i < n; i++)
            {
                float a = dir.HasValue ? dir.Value + M.Rand(-spread, spread) : M.Rand(0, M.TAU), sp = M.Rand(1.5f, 5.5f) * speed, life = M.Rand(0.8f, 1.6f);
                P(new Part { type = PT.Debris, x = pt.x, y = pt.y, z = z >= 0 ? z : M.Rand(4, 10), vx = Mathf.Cos(a) * sp, vy = Mathf.Sin(a) * sp, vz = M.Rand(60, 170) * up,
                    col = M.Pick(cols), size = Random.value < 0.3f ? 2 : 1, life = life, max = life, stamp = stamp });
            }
        }
        public static void Embers(Vector2 pt, int n, string ramp = "fire", float spread = 1f, float speed = 1f)
        {
            for (int i = 0; i < n; i++)
            {
                float life = M.Rand(0.5f, 1.2f);
                P(new Part { type = PT.Ember, x = pt.x + M.Rand(-0.3f, 0.3f) * spread, y = pt.y + M.Rand(-0.2f, 0.2f) * spread, vx = M.Rand(-1.5f, 1.5f) * speed,
                    vy = M.Rand(0.5f, 2.5f) * speed, life = life, max = life, ramp = ramp, seed = M.Rand(0, 10) });
            }
        }
        public static void Converge(Vector2 pt, int n, float radius, string ramp = "gold", float life = 0.22f)
        {
            for (int i = 0; i < n; i++)
            {
                float a = M.Rand(0, M.TAU), r = radius * M.Rand(0.7f, 1.2f);
                P(new Part { type = PT.Spark, x = pt.x + Mathf.Cos(a) * r, y = pt.y + Mathf.Sin(a) * r, vx = -Mathf.Cos(a) * r / life, vy = -Mathf.Sin(a) * r / life,
                    life = life, max = life, drag = 0, g = 0, ramp = ramp, inward = true });
            }
        }
        public static void SpeedLines(Vector2 pt, Vector2 dir, int n)
        {
            for (int i = 0; i < n; i++)
            {
                float off = M.Rand(-0.5f, 0.5f), life = M.Rand(0.08f, 0.16f);
                var perp = new Vector2(-dir.y, dir.x);
                float back = M.Rand(0, 0.6f), sp = M.Rand(4, 8);
                P(new Part { type = PT.Line, x = pt.x + perp.x * off - dir.x * back, y = pt.y + perp.y * off - dir.y * back + 0.3f, vx = -dir.x * sp, vy = -dir.y * sp,
                    len = M.Rand(4, 9), life = life, max = life });
            }
        }

        // ================================================================== decals
        public static void Splat(Vector2 pt, Color32[] cols, float size = 1f)
        {
            if (!T.decals) return;
            int x, y; Art.DecalPos(pt.x, pt.y, out x, out y);
            for (int i = 0; i < 9 * size; i++)
            {
                float a = M.Rand(0, M.TAU), r = Mathf.Pow(Random.value, 0.7f) * 6f * size;
                int s = Random.value < 0.4f ? 2 : 1;
                Art.Decals.Rect(Mathf.RoundToInt(x + Mathf.Cos(a) * r), Mathf.RoundToInt(y + Mathf.Sin(a) * r * 0.7f), s, s, M.Pick(cols), M.Rand(0.45f, 0.8f));
            }
            Art.DecalsDirty = true;
        }
        public static void Scorch(Vector2 pt, int r)
        {
            if (!T.decals) return;
            int x, y; Art.DecalPos(pt.x, pt.y, out x, out y);
            for (int py = -r; py <= r; py++)
                for (int px = -r; px <= r; px++)
                {
                    float d = Mathf.Sqrt(px * px + (py / 0.75f) * (py / 0.75f)) / r;
                    if (d > 1f) continue;
                    if (((px + py) & 1) == 1 && d > 0.6f) continue;
                    Art.Decals.Blend(x + px, y + py, new Color32(10, 6, 12, 255), d < 0.5f ? 0.55f : 0.35f);
                }
            Art.DecalsDirty = true;
        }
        public static void Crack(Vector2 pt, float ang, float length, int branches = 2)
        {
            if (!T.decals) return;
            int sx, sy; Art.DecalPos(pt.x, pt.y, out sx, out sy);
            for (int b = 0; b < branches; b++) Walk(sx, sy, ang + M.Rand(-0.4f, 0.4f) + (b > 0 ? M.Rand(-1.2f, 1.2f) : 0f), length, 0);
            Art.DecalsDirty = true;
        }
        static void Walk(float x, float y, float a, float n, int depth)
        {
            for (int i = 0; i < n; i++)
            {
                Art.Decals.Blend(Mathf.RoundToInt(x), Mathf.RoundToInt(y), new Color32(18, 14, 24, 255), 0.75f);
                if (i < 3 && depth == 0) Art.Decals.Blend(Mathf.RoundToInt(x), Mathf.RoundToInt(y) + 1, new Color32(255, 140, 60, 255), 0.35f);
                a += M.Rand(-0.5f, 0.5f); x += Mathf.Cos(a); y -= Mathf.Sin(a) * 0.8f;
                if (depth < 1 && Random.value < 0.05f) Walk(x, y, a + M.Rand(-1f, 1f), (n - i) * 0.45f, depth + 1);
            }
        }
        public static void FadeDecals(float k) { Art.Decals.Fade(k); Art.DecalsDirty = true; }

        // ================================================================== combat
        public static Vector2 AimAssist(Vector2 from, Vector2 dir, float maxAngle, float range)
        {
            Enemy best = null; float bestScore = float.MaxValue;
            foreach (var e in enemies)
            {
                if (!e.Hittable) continue;
                Vector2 to = e.Center - from; float d = to.magnitude;
                if (d > range || d < 0.001f) continue;
                float ang = M.AngleBetween(dir, to);
                if (ang > maxAngle) continue;
                float score = ang + d * 10f;
                if (score < bestScore) { bestScore = score; best = e; }
            }
            return best != null ? M.Norm(best.Center - from) : dir;
        }
        static float ComboPitch() { return Mathf.Pow(2f, Mathf.Min(combo, 16) / 24f); }

        public static void HitEnemy(Enemy e, Attack atk, Vector2 dir, Combatant attacker = null, bool forceCrit = false, Vector2? point = null, bool byPlayer = false)
        {
            bool crit = forceCrit || Random.value < 0.1f;
            bool armored = e.SuperArmor;
            float dmgF = atk.damage * (crit ? 1.75f : 1f) * (e.broken > 0 ? 1.5f : 1f) * (armored ? 0.8f : 1f);
            int dmg = Mathf.Max(1, Mathf.RoundToInt(dmgF * M.Rand(0.92f, 1.08f)));
            bool killed = e.TakeDamage(dmg);
            bool stagger = !armored;
            if (armored && !killed)
            {
                e.poise -= atk.heavy ? 2 : 1;
                if (e.poise <= 0) { BreakArmor(e, dir); stagger = true; }
            }
            float hsF = atk.hitstop * (crit ? 1.4f : 1f) * (killed ? 1.6f : 1f) * (armored && !killed ? 0.6f : 1f);
            float hs = T.hitstop ? hsF / 60f * T.hitstopScale : 0f;
            e.DoFreeze(hs, true); if (attacker != null) attacker.DoFreeze(hs, false);
            if (T.hitFlash) e.DoFlash(hs + 3f / 60f, armored && !killed && !stagger ? Col.H("#ffc070") : (Color32)Color.white);
            if (T.knockback && (stagger || killed)) e.DoKnock(dir * (atk.knockback * T.knockbackScale * (killed ? 1.5f : 1f) / e.K.mass));
            if (stagger && !killed && e.state != "Stagger") e.Stagger(atk.heavy ? 26 : 16);
            else if (stagger && !killed) e.stateTime = 0f;
            e.Punch(atk.heavy || killed || crit ? 0.45f : 0.3f);
            Vector2 pt = point ?? (e.Center - dir * (e.radius * 0.6f));
            bool big = atk.heavy || killed || crit;
            string ramp = crit ? "gold" : armored && !stagger ? "steel" : "fire";
            StarFlash(pt, dir, big ? 12 : 8, ramp, big ? 0.11f : 0.08f);
            Sparks(pt, dir, big ? 16 : 9, big ? 15 : 11, big ? 80 : 60, ramp);
            if (big) RingFx(pt, 2, 16, 1, 0.16f, ramp, 0.9f);
            Debris(e.Center, big ? 6 : 3, e.K.ichor, M.Ang(dir), 0.7f, big ? 1.3f : 1f, 1f, true, 8);
            Splat(e.pos + dir * 0.4f, new[] { e.K.ichor[1], e.K.ichor[2] }, big ? 1f : 0.6f);
            AddShake(atk.shake * (crit ? 1.25f : 1f) * (killed ? 1.4f : 1f), dir, big ? 4 : 2);
            if (big) ZoomPunch(killed ? 0.06f : 0.035f);
            if (crit) Chroma(0.6f, dir);
            if (crit) PopText(e.pos.x, e.pos.y + 1.1f, dmg + "!", "#ffe066", 3, true, 16, dir.x * 2f, 90, 0.9f, 260, 1.6f);
            else PopText(e.pos.x, e.pos.y + 1.1f, dmg.ToString(), armored && !stagger ? "#c8d0e0" : "#ffffff", 2, true, 16, dir.x * 2f + M.Rand(-0.8f, 0.8f), 70, 0.6f);
            float pr = ComboPitch();
            if (armored && !stagger) Sfx("armor", pr, 0.05f, 0.8f);
            Sfx(big ? "hitHeavy" : "hit", big ? 1f : pr, 0.06f, 1f);
            if (crit) Sfx("crit", 1f, 0.05f, 0.8f);
            Rumble(big ? 0.8f : 0.35f, big ? 0.6f : 0.4f, big ? 140 : 70);
            combo++; comboTimer = 2.5f; comboJolt = 1f; bestCombo = Mathf.Max(bestCombo, combo);
            if (attacker == player || byPlayer) GainMeter(crit ? 5 : 3);
            if (killed) RegisterKill(e, dir, crit || atk.heavy, attacker);
        }

        public static void RegisterKill(Enemy e, Vector2 dir, bool big, Combatant attacker)
        {
            kills++; killsThisSwing++;
            Ench.OnKill(e);
            e.dieDir = dir;
            Sfx("kill", 1f, 0.08f, 0.8f);
            int remaining = 0;
            foreach (var o in enemies) if (o.alive && !o.dying) remaining++;
            bool last = remaining == 0 && queue.Count == 0 && waveState == "fight";
            if (last)
            {
                Slowmo(0.15f, 0.75f); ZoomPunch(0.14f); hold = 0.75f; holdAt = e.Center; ImpactFrame(e.Center, 0.09f, e, player);
                Chroma(1f, dir); ScreenFlash(Color.white, 0.35f, 0.12f); Muffle(true); Rumble(1f, 1f, 300);
            }
            else if (big) { ImpactFrame(e.Center, 0.05f, e, attacker ?? player); Slowmo(0.4f, 0.12f); }
            if (killsThisSwing == 2) { PopText(player.pos.x, player.pos.y + 1.8f, "DOUBLE", "#ffd166", 2, false, 26, 0, 70, 0.9f); Slowmo(0.3f, 0.25f); }
            if (killsThisSwing == 3) PopText(player.pos.x, player.pos.y + 1.8f, "TRIPLE", "#ff9a3c", 2, false, 30, 0, 70, 1f);
        }

        public static void BreakArmor(Enemy e, Vector2 dir)
        {
            e.broken = 1.5f; e.poise = 0;
            PopText(e.pos.x, e.pos.y + 1.6f, "BREAK!", "#ff9a3c", 2, false, 26, 0, 70, 1f, 260, 1.8f);
            Sparks(e.Center, dir, 24, 14, 360, "steel"); RingFx(e.Center, 3, 26, 2, 0.25f, "steel");
            Sfx("break"); AddShake(0.4f, dir, 4); Slowmo(0.35f, 0.18f); Chroma(0.6f, dir);
            e.z = 0f; e.Stagger(84);
        }

        public static void PerfectDodge(Combatant src)
        {
            var p = player;
            if (p.perfectUsed) return;
            p.perfectUsed = true; p.perfectT = 10f / 60f;
            Slowmo(0.22f, 0.55f); Muffle(true);
            ScreenFlash(new Color(0.62f, 0.91f, 1f), 0.3f, 0.15f); RingFx(p.Center, 3, 34, 2, 0.35f, "ice"); Sparks(p.Center, Vector2.up, 18, 10, 360, "ice");
            PopText(p.pos.x, p.pos.y + 1.6f, "PERFECT", "#8fdcff", 2, false, 24, 0, 70, 1.1f, 120, 1.8f);
            Sfx("perfect", 1f, 0f); Rumble(0.3f, 0.8f, 120); Chroma(0.5f, p.dashDir);
            p.empowered = 4f; p.dashCd = 0f; GainMeter(20); ZoomPunch(0.05f);
            if (src != null) src.DoFlash(0.15f, Col.H("#8fdcff"));
        }

        public static void Deflect(Projectile pr, Player p)
        {
            pr.owner = Owner.Player; pr.t = 0f; pr.life = 3f;
            Enemy target = null; float best = float.MaxValue;
            foreach (var e in enemies)
            {
                if (!e.Hittable) continue;
                Vector2 to = e.Center - pr.pos;
                float s = to.magnitude + M.AngleBetween(p.atkDir, to) * 0.05f;
                if (s < best) { best = s; target = e; }
            }
            Vector2 dir = target != null ? M.Norm(target.Center - pr.pos) : p.atkDir;
            pr.vel = dir * 15f; pr.target = target;
            p.DoFreeze(T.hitstop ? 6f / 60f * T.hitstopScale : 0f, false);
            StarFlash(pr.pos, dir, 12, "ice", 0.12f); RingFx(pr.pos, 2, 18, 1, 0.2f, "ice"); Sparks(pr.pos, dir, 14, 13, 90, "ice");
            PopText(pr.pos.x, pr.pos.y + 1f, "DEFLECT", "#8fdcff", 1, false, 18, 0, 70, 0.8f);
            Sfx("deflect"); AddShake(0.25f, dir, 3); Slowmo(0.4f, 0.12f); Rumble(0.4f, 0.7f, 90);
            GainMeter(8); combo++; comboTimer = 2.5f; comboJolt = 1f; bestCombo = Mathf.Max(bestCombo, combo);
        }

        public static void GainMeter(float n)
        {
            var p = player;
            float before = p.meter;
            p.meter = Mathf.Min(100f, p.meter + n);
            if (before < 100f && p.meter >= 100f) { Sfx("ready"); PopText(p.pos.x, p.pos.y + 1.8f, "BURST READY", "#ff9a3c", 1, false, 22, 0, 70, 1.1f); }
        }

        public static void Muffle(bool on) { if (AshAudio.I != null) AshAudio.I.Muffle(on); }

        public static readonly Color32[] Rubble = { Col.H("#4a4260"), Col.H("#3a3450"), Col.H("#6a6080"), Col.H("#2a2436") };

        public static void AshBurst(Player p)
        {
            Vector2 c = p.pos; float R = T.burst.range;
            Ench.OnBurst(p, false);
            Muffle(true);
            var silh = new List<Combatant> { p };
            foreach (var e in enemies) if (e.Hittable && (e.pos - c).magnitude < R + 1f) silh.Add(e);
            ImpactFrame(p.Center, 0.1f, silh.ToArray());
            RingFx(c, 6, R * Art.PPU, 4, 0.45f, "fire", 0.75f); RingFx(c, 3, R * Art.PPU * 0.7f, 2, 0.35f, "gold", 0.75f); RingFx(c, 2, R * Art.PPU * 1.15f, 1, 0.55f, "steel", 0.75f);
            Sparks(p.Center, Vector2.up, 50, 22, 360, "fire", 1.4f); Embers(c, 40, "fire", 6, 2);
            Debris(c, 30, Rubble, null, 1.2f, 2f, 1.5f);
            Smoke(c, 18, 5, 1.6f, "#3a2c3c", 1.4f);
            for (int i = 0; i < 9; i++) Crack(c, i / 9f * M.TAU + M.Rand(-0.2f, 0.2f), 30 + M.Rand(0, 20), 1);
            Scorch(c, 22);
            AddShake(1f, Vector2.down, 7); ZoomPunch(0.16f); Chroma(1.2f, Vector2.right); ScreenFlash(new Color(1f, 0.94f, 0.82f), 0.55f, 0.2f);
            Slowmo(0.3f, 0.35f); Sfx("burst", 1f, 0f); Rumble(1f, 1f, 450);
            foreach (var e in enemies.ToArray())
            {
                if (!e.Hittable) continue;
                Vector2 to = e.pos - c; float d = to.magnitude;
                if (d > R + e.radius) continue;
                HitEnemy(e, T.burst, d > 0.05f ? to / d : Vector2.right, null, false, e.Center, true);
                Ench.OnHit(e, T.burst, d > 0.05f ? to / d : Vector2.right, Ench.Skill, 0);
            }
            foreach (var pr in projectiles) if (pr.owner == Owner.Enemy && (pr.pos - c).magnitude < R) PopProjectile(pr);
        }

        public static void ExplodeEnemy(Enemy e)
        {
            e.alive = false;
            Vector2 c = e.Center; var cols = e.K.ichor; bool big = e.kind == EnemyKind.Brute;
            string ramp = e.kind == EnemyKind.Wisp ? "violet" : "fire";
            RingFx(c, 2, big ? 30 : 20, 2, 0.24f, ramp, 0.8f);
            StarFlash(c, Vector2.right, big ? 16 : 11, ramp, 0.1f);
            Smoke(e.pos, big ? 12 : 7, 1.6f, big ? 1.5f : 1f, "#3a2c40");
            Color32[] sprCols = e.kind == EnemyKind.Grunt ? new[] { Col.H("#d4404a"), Col.H("#8a1e2e"), Col.H("#f0d0a0") }
                : e.kind == EnemyKind.Wisp ? new[] { Col.H("#8a4ad0"), Col.H("#c08af0"), Col.H("#4e2a8a") }
                : new[] { Col.H("#8a5a3a"), Col.H("#7a7a8c"), Col.H("#5a3a2a"), Col.H("#a07050") };
            Debris(c, big ? 22 : 12, sprCols, null, 1.2f, 1.3f, 1.3f, false, 6);
            Debris(c, big ? 10 : 6, cols, null, 1.2f, 1.4f, 1f, true, 6);
            Sparks(c, Vector2.up, big ? 24 : 14, 12, 360, ramp);
            Embers(e.pos, 8, ramp);
            Splat(e.pos, cols, big ? 2f : 1.3f); Scorch(e.pos, big ? 9 : 6);
            Sfx("pop", big ? 0.6f : 1f, 0.05f, 0.8f); AddShake(big ? 0.3f : 0.12f, e.dieDir, 2);
            int souls = big ? 7 : 3 + Random.Range(0, 2);
            for (int i = 0; i < souls; i++) SpawnPickup(false, c);
            if (Random.value < (big ? 0.6f : 0.16f)) SpawnPickup(true, c);
        }

        public static void SpawnPickup(bool heart, Vector2 at)
        {
            float a = M.Rand(0, M.TAU), sp = M.Rand(2f, 4.5f);
            pickups.Add(new Pickup { heart = heart, pos = new Vector2(at.x, at.y - 0.3f), z = 6f, vz = M.Rand(80, 140), vel = new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * sp });
        }

        public static void PopProjectile(Projectile pr)
        {
            pr.dead = true;
            string ramp = pr.owner == Owner.Enemy ? "violet" : "ice";
            Sparks(pr.pos, Vector2.up, 10, 8, 360, ramp); RingFx(pr.pos, 2, 10, 1, 0.15f, ramp); Sfx("pop", 1.4f, 0.05f, 0.5f);
        }

        // ================================================================== waves
        static readonly EnemyKind[][] Waves =
        {
            new[] { EnemyKind.Grunt, EnemyKind.Grunt, EnemyKind.Grunt },
            new[] { EnemyKind.Grunt, EnemyKind.Wisp, EnemyKind.Grunt, EnemyKind.Grunt, EnemyKind.Wisp },
            new[] { EnemyKind.Brute, EnemyKind.Grunt, EnemyKind.Grunt, EnemyKind.Wisp },
            new[] { EnemyKind.Grunt, EnemyKind.Grunt, EnemyKind.Wisp, EnemyKind.Grunt, EnemyKind.Wisp, EnemyKind.Grunt },
            new[] { EnemyKind.Brute, EnemyKind.Grunt, EnemyKind.Wisp, EnemyKind.Brute, EnemyKind.Grunt, EnemyKind.Wisp },
        };

        public static void StartWave(int n)
        {
            waveN = n; queue.Clear();
            if (n - 1 < Waves.Length) queue.AddRange(Waves[n - 1]);
            else
            {
                int count = 5 + Mathf.Min(6, n - 4);
                for (int i = 0; i < count; i++) queue.Add(Random.value < 0.18f + n * 0.015f ? EnemyKind.Brute : Random.value < 0.35f ? EnemyKind.Wisp : EnemyKind.Grunt);
            }
            spawnT = 0.5f; waveState = "fight";
            Banner("WAVE " + n, Col.H("#ff9a3c"), 1.4f);
            FadeDecals(0.35f);
        }

        public static void SpawnEnemy(EnemyKind kind)
        {
            Vector2 at = Vector2.zero;
            for (int i = 0; i < 40; i++)
            {
                at = new Vector2(M.Rand(Arena.xMin + 1.5f, Arena.xMax - 1.5f), M.Rand(Arena.yMin + 1.2f, Arena.yMax - 1.2f));
                bool ok = (at - player.pos).magnitude > 5f;
                foreach (var e in enemies) if (e.alive && (e.pos - at).magnitude <= 2f) ok = false;
                if (ok) break;
            }
            enemies.Add(new Enemy(kind, at));
        }

        public static void ResetAll()
        {
            player.Reset();
            enemies.Clear(); projectiles.Clear(); pickups.Clear(); parts.Clear();
            kills = combo = bestCombo = 0; comboTimer = 0f; gradeIdx = -1;
            Art.Decals.Clear(new Color32(0, 0, 0, 0)); Art.DecalsDirty = true;
            waveN = 0; queue.Clear(); waveState = "intro"; waveT = 0.8f; Ench.ResetFx();
            bannerText = null; impact = null; slowT = 0f; slowTarget = 1f; hold = 0f;
            camX = player.pos.x; camY = player.pos.y; Muffle(false); if (AshAudio.I != null) AshAudio.I.Charge(false);
        }

        public static void UpdateWaves(float dt, float rdt)
        {
            if (player.state == "Dead") return;
            if (waveState == "intro") { waveT -= rdt; if (waveT <= 0f) StartWave(1); return; }
            if (waveState == "fight")
            {
                if (queue.Count > 0) { spawnT -= dt; if (spawnT <= 0f) { var k = queue[0]; queue.RemoveAt(0); SpawnEnemy(k); spawnT = 0.38f; } }
                else
                {
                    bool any = false;
                    foreach (var e in enemies) if (e.alive) any = true;
                    if (!any)
                    {
                        waveState = "clear"; waveT = 2.8f; player.victoryAnim = 36f / 60f;
                        Banner("WAVE CLEAR", Col.H("#8be3a6"), 2.2f, "HP +20");
                        if (Ench.cards && Ench.OfferCards()) { waveState = "reward"; bannerT = Mathf.Min(bannerT, 1.1f); bannerMax = 1.1f; }
                        Sfx("clear"); player.hp = Mathf.Min(player.maxHp, player.hp + 20f);
                        PopText(player.pos.x, player.pos.y + 1.4f, "+20", "#8be3a6", 2, false, 20);
                    }
                }
            }
            else if (waveState == "clear") { waveT -= rdt; if (waveT <= 0f) StartWave(waveN + 1); }
            else if (waveState == "reward")
            {
                Ench.offerT += rdt;
                if (Ench.picked >= 0 && Ench.offerT > 0.7f) { Ench.offer.Clear(); waveState = "clear"; waveT = 0.9f; }
            }
        }

        // ================================================================== updates
        public static void UpdateProjectiles(float dt)
        {
            var p = player;
            foreach (var pr in projectiles)
            {
                if (pr.dead) continue;
                pr.t += dt; pr.life -= dt;
                if (pr.owner == Owner.Player && pr.target != null && pr.target.Hittable)
                {
                    Vector2 want = M.Norm(pr.target.Center - pr.pos) * 15f;
                    pr.vel += (want - pr.vel) * (1f - Mathf.Exp(-6f * dt));
                }
                pr.pos += pr.vel * dt;
                if (Random.value < 0.8f)
                    P(new Part { type = PT.Spark, x = pr.pos.x + M.Rand(-0.08f, 0.08f), y = pr.pos.y + pr.h / Art.PPU + M.Rand(-0.08f, 0.08f), vx = -pr.vel.x * 0.1f, vy = -pr.vel.y * 0.1f,
                        life = 0.2f, max = 0.2f, drag = 3, g = 0, ramp = pr.owner == Owner.Enemy ? "violet" : "ice" });
                if (pr.life <= 0f || pr.pos.x < Arena.xMin || pr.pos.x > Arena.xMax || pr.pos.y < Arena.yMin || pr.pos.y > Arena.yMax) { PopProjectile(pr); continue; }
                if (pr.owner == Owner.Enemy)
                {
                    float d = (p.pos - pr.pos).magnitude;
                    if (d < pr.r + p.radius + 0.05f && p.state != "Dead")
                    {
                        if (p.state == "Dash" && p.Invulnerable) { if (!pr.perfectChecked) { pr.perfectChecked = true; PerfectDodge(pr.src); } }
                        else if (p.HurtBy(null, M.Norm(pr.vel), pr.dmg)) PopProjectile(pr);
                    }
                }
                else
                {
                    foreach (var e in enemies.ToArray())
                    {
                        if (!e.Hittable) continue;
                        if ((e.Center - (pr.pos + new Vector2(0, pr.h / Art.PPU))).magnitude < e.radius + pr.r + 0.2f || (e.pos - pr.pos).magnitude < e.radius + pr.r)
                        {
                            HitEnemy(e, T.deflected, M.Norm(pr.vel), null, true, e.Center, true);
                            PopProjectile(pr); break;
                        }
                    }
                }
            }
            projectiles.RemoveAll(x => x.dead);
        }

        public static void UpdatePickups(float dt)
        {
            var p = player;
            if (pickupChainT > 0f) { pickupChainT -= dt; if (pickupChainT <= 0f) pickupChain = 0; }
            for (int i = pickups.Count - 1; i >= 0; i--)
            {
                var k = pickups[i];
                k.t += dt;
                if (k.z > 0f || k.vz > 0f) { k.vz -= 520f * dt; k.z += k.vz * dt; if (k.z <= 0f) { k.z = 0f; k.vz = k.vz < -50f ? -k.vz * 0.4f : 0f; } }
                if (k.t > 0.45f && p.state != "Dead")
                {
                    Vector2 to = p.Center - k.pos; float d = to.magnitude;
                    Vector2 want = M.Norm(to) * Mathf.Min(16f, 4f + (k.t - 0.45f) * 26f);
                    k.vel += (want - k.vel) * (1f - Mathf.Exp(-8f * dt));
                    if (d < 0.45f)
                    {
                        pickups.RemoveAt(i);
                        pickupChain++; pickupChainT = 0.6f;
                        if (!k.heart) { GainMeter(4); Sfx("pickup", Mathf.Pow(2f, Mathf.Min(pickupChain, 12) / 12f), 0f, 0.7f); }
                        else { p.hp = Mathf.Min(p.maxHp, p.hp + 12f); PopText(p.pos.x, p.pos.y + 1.3f, "+12", "#8be3a6", 2, false, 18); Sfx("chargeFull", 0.8f, 0.05f, 0.7f); RingFx(p.Center, 2, 14, 1, 0.2f, "ice"); }
                        Sparks(p.Center, Vector2.up, 4, 6, 360, k.heart ? "ice" : "gold");
                        continue;
                    }
                }
                else k.vel *= Mathf.Exp(-4f * dt);
                k.pos += k.vel * dt;
            }
        }

        public static void UpdateParts(float dt)
        {
            for (int i = parts.Count - 1; i >= 0; i--)
            {
                var p = parts[i];
                p.life -= dt;
                if (p.life <= 0f) { parts[i] = parts[parts.Count - 1]; parts.RemoveAt(parts.Count - 1); continue; }
                switch (p.type)
                {
                    case PT.Spark: { float k = Mathf.Exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; break; }
                    case PT.Debris:
                        p.vz -= 520f * dt; p.z += p.vz * dt; p.x += p.vx * dt; p.y += p.vy * dt;
                        if (p.z <= 0f)
                        {
                            p.z = 0f;
                            if (p.vz < -45f) { p.vz *= -0.42f; p.vx *= 0.6f; p.vy *= 0.6f; }
                            else
                            {
                                p.vz = 0f; p.vx *= Mathf.Exp(-10f * dt); p.vy *= Mathf.Exp(-10f * dt);
                                if (p.stamp && !p.stamped && T.decals)
                                {
                                    p.stamped = true;
                                    int x, y; Art.DecalPos(p.x, p.y, out x, out y);
                                    Art.Decals.Rect(x, y, (int)p.size, (int)p.size, p.col, 0.7f); Art.DecalsDirty = true;
                                }
                            }
                        }
                        break;
                    case PT.Smoke: { float k = Mathf.Exp(-4f * dt); p.vx *= k; p.vy *= k; p.x += p.vx * dt; p.y += p.vy * dt + p.rise * dt / Art.PPU; break; }
                    case PT.Ember: p.x += (p.vx + Mathf.Sin(realTime * 3f + p.seed) * 0.6f) * dt; p.y += p.vy * dt; break;
                    case PT.Line: p.x += p.vx * dt; p.y += p.vy * dt; break;
                    case PT.Text: p.x += p.vx * dt; p.vz -= p.grav * dt; p.z = Mathf.Max(4f, p.z + p.vz * dt); p.vx *= Mathf.Exp(-4f * dt); break;
                }
            }
        }

        public static void UpdateCamera(float rdt)
        {
            var p = player;
            Vector2 target = p.pos + new Vector2(0, 0.5f) + p.aimDir * T.lookAhead;
            if (hold > 0f && holdAt.HasValue && T.zoom) target = Vector2.Lerp(target, holdAt.Value, 0.6f);
            target.x = Mathf.Clamp(target.x, Arena.xMin + 9f, Arena.xMax - 9f);
            target.y = Mathf.Clamp(target.y, Arena.yMin + 4.7f, Arena.yMax - 3.4f);
            float kf = 1f - Mathf.Exp(-7f * rdt);
            camX += (target.x - camX) * kf; camY += (target.y - camY) * kf;
            trauma = Mathf.Max(0f, trauma - 1.5f * rdt);
            kickV += (kick * -500f + kickV * -26f) * rdt;
            kick += kickV * rdt;
            if (hold > 0f) hold -= rdt;
            float zt = hold > 0f && T.zoom ? 1.12f : 1f;
            zoomV += (-(zoom - zt) * 260f - zoomV * 20f) * rdt; zoom += zoomV * rdt;
            float tr = trauma * trauma * 7f, tt = realTime;
            float sx = tr * (Mathf.Sin(tt * 61f) * 0.6f + Mathf.Sin(tt * 97f + 1.7f) * 0.4f), sy = tr * (Mathf.Sin(tt * 73f + 0.5f) * 0.6f + Mathf.Sin(tt * 113f + 2.1f) * 0.4f);
            View.camX = Mathf.RoundToInt(camX * Art.PPU + sx + kick.x);
            View.camY = Mathf.RoundToInt(camY * Art.PPU + sy - kick.y);
        }

        public static void UpdateFx(float rdt)
        {
            if (slowT > 0f) { slowT -= rdt; if (slowT <= 0f) { slowTarget = 1f; if (player.state != "Dead") Muffle(false); } }
            float goal = slowT > 0f ? slowTarget : 1f;
            slowScale += (goal - slowScale) * (1f - Mathf.Exp(-rdt * (goal < slowScale ? 60f : 7f)));
            if (Mathf.Abs(slowScale - 1f) < 0.01f && goal == 1f) slowScale = 1f;
            if (impact != null) { impact.t -= rdt; if (impact.t <= 0f) impact = null; }
            chroma = Mathf.Max(0f, chroma - rdt * 4f);
            if (flashT > 0f) flashT -= rdt;
            if (bannerT > 0f) bannerT -= rdt;
            comboJolt = Mathf.Max(0f, comboJolt - rdt * 6f);
            if (gradePop > 0f) gradePop -= rdt;
            var pl = player;
            pl.hpGhost = pl.hpGhost > pl.hp ? Mathf.Max(pl.hp, pl.hpGhost - rdt * (pl.freeze > 0f ? 0f : 40f)) : pl.hp;
            foreach (var e in enemies) e.hpGhost = e.hpGhost > e.hp ? Mathf.Max(e.hp, e.hpGhost - rdt * e.maxHp * 0.8f) : e.hp;
        }
    }

    public static class Arena
    {
        public const float xMin = -15f, xMax = 15f, yMin = -8.5f, yMax = 8.5f;
    }
}
