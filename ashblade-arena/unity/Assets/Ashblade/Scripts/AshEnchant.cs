using System.Collections.Generic;
using UnityEngine;

namespace Ashblade
{
    public enum EnchKey { Pierce, Fire, Frost, Chain, Split, Echo }

    /// <summary>Burn / chill / freeze state that enchants put on an enemy.</summary>
    public class EnchStatus
    {
        public int burn, chill, burnLv, frostLv;
        public float burnT, burnTick, chillT, frozen, frozenMax;
    }

    public class EnchWave { public Vector2 pos, dir; public float speed, dist, max, t; public int dmg, slot; public string ramp; public bool big, dead; public readonly HashSet<Enemy> hit = new HashSet<Enemy>(); }
    public class EnchShard { public Vector2 pos, vel; public Enemy target; public float life, t; public int dmg, slot; public bool dead; public readonly List<Vector2> trail = new List<Vector2>(); }
    public class EnchBolt { public Vector2 a, b; public float life, max, seed; }
    public class EnchEcho { public Vector2 pos, dir; public bool flip, burst; public Spr spr; public float life, max, r, arc; }
    public class EnchPending { public float t, mult; public Attack atk; public int slot; public Vector2 origin, dir; public bool flip, burst; public Spr spr; }

    /// <summary>
    /// Keyword enchants on two slots: 0 = basic (3-hit combo, dash strike), 1 = skill (spin slash, ash burst).
    /// Each keyword has a level 0..3. Effects started by an enchant (waves, shards, lightning, blasts) carry the
    /// elements (fire, frost) but do not start new chains, so combinations never run away.
    /// </summary>
    public static class Ench
    {
        public const int Basic = 0, Skill = 1, Count = 6;
        public static readonly int[,] lv = new int[2, Count];
        public static bool cards = true;

        public static readonly string[] Tag = { "PIERCE", "FIRE", "FROST", "CHAIN", "SPLIT", "ECHO" };
        public static readonly string[] Desc = { "SLASH WAVE", "BURN + BLAST", "SLOW + FREEZE", "ARC LIGHTNING", "SEEKER SHARDS", "SHADOW REPEAT" };
        public static readonly string[] Hex = { "#e8f4ff", "#ff8a3a", "#8fdcff", "#ffe066", "#a8f070", "#c08af0" };
        public static readonly string[] Ramp = { "steel", "fire", "ice", "gold", "acid", "violet" };

        public static readonly List<EnchWave> waves = new List<EnchWave>();
        public static readonly List<EnchShard> shards = new List<EnchShard>();
        public static readonly List<EnchBolt> bolts = new List<EnchBolt>();
        public static readonly List<EnchEcho> echoes = new List<EnchEcho>();
        static readonly List<EnchPending> pending = new List<EnchPending>();
        static int swingSplits;

        // wave reward: pick 1 of 3
        public static readonly List<Vector2Int> offer = new List<Vector2Int>(); // x = slot, y = key
        public static float offerT; public static int picked = -1;
        public static bool Offering { get { return offer.Count > 0; } }

        static AshTuning T { get { return AshTuning.I; } }
        public static int L(int slot, EnchKey k) { return lv[slot, (int)k]; }
        public static int SlotOf(int comboIndex) { return comboIndex == -2 ? Skill : Basic; }
        public static string ElementRamp(int slot)
        {
            return L(slot, EnchKey.Fire) > 0 ? "fire" : L(slot, EnchKey.Frost) > 0 ? "ice" : L(slot, EnchKey.Chain) > 0 ? "gold" : L(slot, EnchKey.Split) > 0 ? "acid" : "steel";
        }
        static Attack Atk(float dmg, float kb = 3f, int hs = 2, float shake = 0.08f)
        {
            return new Attack { name = "Enchant", damage = dmg, knockback = kb, hitstop = hs, shake = shake, heavy = false, kind = AttackKind.Slash };
        }
        public static void SetAll(int v) { for (int s = 0; s < 2; s++) for (int k = 0; k < Count; k++) lv[s, k] = v; }

        // ------------------------------------------------------------ statuses
        public static EnchStatus St(Enemy e) { if (e.st == null) e.st = new EnchStatus(); return e.st; }
        public static float TimeScale(Enemy e)
        {
            var s = e.st;
            if (s == null || e.dying || e.state == "Dead") return 1f;
            if (s.frozen > 0f) return 0f;
            return 1f - 0.12f * s.chill;
        }

        static void ApplyElements(Enemy e, int fire, int frost, Vector2 dir)
        {
            if (!e.Hittable && !e.dying) return;
            var s = St(e);
            if (fire > 0)
            {
                s.burn = Mathf.Min(2 + fire * 2, s.burn + fire); s.burnT = 3f; s.burnLv = Mathf.Max(s.burnLv, fire);
                if (s.burnTick <= 0f) s.burnTick = 0.45f;
                W.Embers(e.Center, 3, "fire", 0.6f);
            }
            if (frost > 0 && s.frozen <= 0f && !e.dying)
            {
                s.chill = Mathf.Min(4, s.chill + 1); s.chillT = 2.5f; s.frostLv = Mathf.Max(s.frostLv, frost);
                W.Sparks(e.Center, Vector2.up, 4, 5, 360, "ice", 1f, 6f, 4f);
                if (s.chill >= 4)
                {
                    s.chill = 0; s.frozen = s.frozenMax = 0.9f + 0.4f * frost;
                    e.knock = Vector2.zero; e.pendingKnock = null;
                    if (e.state == "Windup" || e.state == "Attack") { e.state = "Stagger"; e.stateTime = 0f; e.staggerF = 1; }
                    W.RingFx(e.Center, 2, 16, 2, 0.25f, "ice", 0.8f); W.Sparks(e.Center, Vector2.up, 14, 9, 360, "ice");
                    W.PopText(e.pos.x, e.pos.y + 1.5f, "FROZEN", "#8fdcff", 1, false, 30, 0, 70, 0.8f);
                    W.Sfx("deflect", 1.4f, 0.05f, 0.7f); W.AddShake(0.12f, dir, 2);
                }
            }
        }

        static void Dot(Enemy e, int dmg)
        {
            if (!e.Hittable) return;
            bool killed = e.TakeDamage(dmg);
            e.DoFlash(0.05f, Col.H("#ff9a4a"));
            W.PopText(e.pos.x + M.Rand(-0.3f, 0.3f), e.pos.y + 0.9f, dmg.ToString(), "#ff9a4a", 1, true, 16, 0, 50, 0.5f, 260, 1.1f);
            W.Sparks(e.Center, Vector2.up, 4, 5, 90, "fire", 1f, 6f, -6f);
            if (killed) W.RegisterKill(e, Vector2.up, false, null);
        }

        static void UpdateStatus(Enemy e, float dt)
        {
            var s = e.st; if (s == null) return;
            if (s.burn > 0)
            {
                s.burnT -= dt; s.burnTick -= dt;
                if (Random.value < 0.5f + s.burn * 0.06f)
                    W.P(new Part { type = PT.Spark, x = e.pos.x + M.Rand(-0.3f, 0.3f), y = e.Center.y + M.Rand(-0.3f, 0.2f), vx = M.Rand(-0.4f, 0.4f), vy = M.Rand(1.5f, 3f), life = 0.3f, max = 0.3f, drag = 2, g = -2, ramp = "fire" });
                if (s.burnTick <= 0f && e.Hittable) { s.burnTick = 0.45f; Dot(e, 1 + s.burn); W.Sfx("hit", 1.9f, 0.1f, 0.25f); }
                if (s.burnT <= 0f) s.burn = 0;
            }
            if (s.chill > 0)
            {
                s.chillT -= dt; if (s.chillT <= 0f) s.chill = 0;
                if (Random.value < 0.15f * s.chill) W.P(new Part { type = PT.Ember, x = e.pos.x + M.Rand(-0.4f, 0.4f), y = e.Center.y + M.Rand(-0.2f, 0.4f), vy = -0.3f, life = 0.5f, max = 0.5f, ramp = "ice", seed = M.Rand(0, 9) });
            }
            if (s.frozen > 0f) { s.frozen -= dt; if (s.frozen <= 0f) { W.Sparks(e.Center, Vector2.up, 8, 6, 360, "ice"); W.Sfx("pop", 1.6f, 0.05f, 0.4f); } }
        }

        static void Shatter(Enemy e, int frostLv, Vector2 dir)
        {
            e.st.frozen = 0f;
            W.HitEnemy(e, Atk(10 + 8 * frostLv, 9f, 6, 0.3f), dir, null, true, e.Center, true);
            for (int i = 0; i < 10; i++)
            {
                float a = M.Rand(0, M.TAU);
                W.P(new Part { type = PT.Debris, x = e.Center.x, y = e.pos.y, z = 10, vx = Mathf.Cos(a) * M.Rand(2f, 5f), vy = Mathf.Sin(a) * M.Rand(1f, 3f), vz = M.Rand(80f, 160f), life = 0.7f, max = 0.7f, size = Random.value < 0.4f ? 2 : 1, col = Random.value < 0.5f ? Col.H("#dff8ff") : Col.H("#8fdcff") });
            }
            W.RingFx(e.Center, 3, 22, 2, 0.25f, "ice", 0.8f); W.StarFlash(e.Center, dir, 14, "ice", 0.12f);
            W.PopText(e.pos.x, e.pos.y + 1.7f, "SHATTER", "#dff8ff", 2, false, 34, 0, 70, 0.9f, 260, 1.6f);
            W.Sfx("crit", 1.3f); W.Sfx("deflect", 0.8f, 0.05f, 0.7f); W.Chroma(0.5f, dir);
        }

        /// <summary>Called from RegisterKill: a burning enemy blows up and spreads the fire.</summary>
        public static void OnKill(Enemy e)
        {
            var s = e.st;
            if (s == null || s.burn <= 0 || s.burnLv <= 0) return;
            int lvl = s.burnLv; s.burn = 0;
            Vector2 c = e.Center; float R = 1.5f + 0.3f * lvl;
            W.RingFx(e.pos, 2, R * Art.PPU, 3, 0.3f, "fire", 0.75f); W.Sparks(c, Vector2.up, 18, 12, 360, "fire"); W.Smoke(e.pos, 5, 1.6f, 1f, "#3a2422");
            W.Scorch(e.pos, 8 + lvl * 2); W.AddShake(0.25f, Vector2.down, 3); W.Sfx("slam", 1.5f, 0.05f, 0.6f);
            W.PopText(e.pos.x, e.pos.y + 1.6f, "BLAST", "#ff8a3a", 1, false, 30, 0, 70, 0.7f);
            foreach (var o in W.enemies.ToArray())
            {
                if (o == e || !o.Hittable) continue;
                Vector2 to = o.pos - e.pos; float d = to.magnitude;
                if (d > R + o.radius) continue;
                Vector2 dir = d > 0.05f ? to / d : Vector2.right;
                W.HitEnemy(o, Atk(6 + 6 * lvl, 8f, 3), dir, null, false, o.Center, true);
                ApplyElements(o, lvl, 0, dir);
            }
        }

        // ------------------------------------------------------------ hooks
        public static void OnHit(Enemy e, Attack atk, Vector2 dir, int slot, int gen)
        {
            int fire = L(slot, EnchKey.Fire), frost = L(slot, EnchKey.Frost);
            if (e.st != null && e.st.frozen > 0f && frost > 0 && gen == 0 && !e.dying) Shatter(e, frost, dir);
            ApplyElements(e, fire, frost, dir);
            if (gen > 0) return;
            if (L(slot, EnchKey.Chain) > 0) Chain(e, atk, slot);
            if (L(slot, EnchKey.Split) > 0 && swingSplits < 4) { swingSplits++; Split(e, atk, slot); }
        }

        public static void OnSwing(Player p, Attack atk, int slot, Vector2 origin, Vector2 dir, bool isEcho)
        {
            swingSplits = 0;
            int pierce = L(slot, EnchKey.Pierce), echo = L(slot, EnchKey.Echo);
            if (pierce > 0)
            {
                bool spin = atk.kind == AttackKind.Spin;
                int n = spin ? 4 + 2 * (pierce - 1) : 1 + (pierce >= 3 ? 2 : 0);
                float b = M.Ang(dir);
                for (int i = 0; i < n; i++)
                {
                    float a = spin ? b + (float)i / n * M.TAU : b + (i - (n - 1) / 2f) * 0.28f;
                    waves.Add(new EnchWave { pos = origin, dir = M.FromAng(a), speed = 14f, max = 4f + 1.5f * pierce, dmg = Mathf.RoundToInt(atk.damage * (0.35f + 0.15f * pierce) * (isEcho ? 0.6f : 1f)), slot = slot, ramp = ElementRamp(slot), big = atk.heavy });
                }
                W.Sfx("thrust", 1.4f, 0.05f, 0.6f);
            }
            if (echo > 0 && !isEcho)
            {
                Spr spr = PlayerSheet.Pick(p) ?? Art.PlayerRunA;
                pending.Add(new EnchPending { t = 0.22f, atk = atk, slot = slot, origin = origin, dir = dir, mult = 0.4f + 0.15f * echo, flip = p.flip, spr = spr });
                if (echo >= 3) pending.Add(new EnchPending { t = 0.44f, atk = atk, slot = slot, origin = origin, dir = dir, mult = 0.4f, flip = p.flip, spr = spr });
            }
        }

        public static void OnBurst(Player p, bool isEcho)
        {
            swingSplits = 0;
            int pierce = L(Skill, EnchKey.Pierce), echo = L(Skill, EnchKey.Echo);
            if (pierce > 0)
            {
                int n = 6 + 2 * pierce;
                for (int i = 0; i < n; i++)
                    waves.Add(new EnchWave { pos = p.pos, dir = M.FromAng((float)i / n * M.TAU), speed = 13f, max = 6f + 1.5f * pierce, dmg = 12 + 6 * pierce, slot = Skill, ramp = ElementRamp(Skill), big = true });
            }
            if (echo > 0 && !isEcho)
                pending.Add(new EnchPending { t = 0.35f, burst = true, slot = Skill, origin = p.pos, dir = Vector2.right, mult = 0.35f + 0.15f * echo, flip = p.flip, spr = PlayerSheet.Pick(p) ?? Art.PlayerRunA });
        }

        static void Chain(Enemy src, Attack atk, int slot)
        {
            int chain = L(slot, EnchKey.Chain), jumps = 1 + chain;
            var seen = new HashSet<Enemy> { src };
            Enemy from = src;
            for (int j = 0; j < jumps; j++)
            {
                Enemy best = null; float bd = 3.6f;
                foreach (var o in W.enemies) { if (!o.Hittable || seen.Contains(o)) continue; float d = (o.Center - from.Center).magnitude; if (d < bd) { bd = d; best = o; } }
                if (best == null) break;
                seen.Add(best);
                bolts.Add(new EnchBolt { a = from.Center, b = best.Center, life = 0.16f, max = 0.16f, seed = Random.value * 1000f });
                Vector2 dir = M.Norm(best.Center - from.Center);
                W.HitEnemy(best, Atk(Mathf.Max(2, Mathf.Round(atk.damage * (0.25f + 0.1f * chain))), 2f, 3), dir, null, false, best.Center, true);
                if (best.Hittable && !best.SuperArmor && best.state != "Stagger") best.Stagger(10);
                ApplyElements(best, L(slot, EnchKey.Fire), L(slot, EnchKey.Frost), dir);
                W.Sparks(best.Center, Vector2.up, 6, 9, 360, "gold"); W.StarFlash(best.Center, Vector2.right, 6, "gold", 0.07f);
                from = best;
            }
            if (seen.Count > 1) { W.Sfx("shoot", 2.2f, 0.05f, 0.7f); W.Sfx("hit", 2.4f, 0.05f, 0.4f); }
        }

        static void Split(Enemy src, Attack atk, int slot)
        {
            int split = L(slot, EnchKey.Split), n = 1 + split;
            Vector2 c = src.Center;
            var others = new List<Enemy>();
            foreach (var o in W.enemies) if (o != src && o.Hittable) others.Add(o);
            others.Sort((a, b) => (a.pos - src.pos).sqrMagnitude.CompareTo((b.pos - src.pos).sqrMagnitude));
            for (int i = 0; i < n; i++)
            {
                float a = M.Rand(0, M.TAU);
                shards.Add(new EnchShard { pos = c, vel = M.FromAng(a) * 7f, target = others.Count > 0 ? others[i % others.Count] : null, life = 1.6f, dmg = Mathf.Max(2, Mathf.RoundToInt(atk.damage * (0.2f + 0.08f * split))), slot = slot });
            }
            W.Sparks(c, Vector2.up, 8, 8, 360, "acid"); W.Sfx("pickup", 1.6f, 0.05f, 0.5f);
        }

        static void EchoStrike(EnchPending q)
        {
            var p = W.player;
            echoes.Add(new EnchEcho { pos = q.origin, dir = q.dir, flip = q.flip, spr = q.spr, life = 0.28f, max = 0.28f, burst = q.burst, r = q.burst ? 4.6f * Art.PPU * q.mult * 1.6f : q.atk.range * Art.PPU, arc = q.burst ? 360f : q.atk.arc });
            W.Sfx("swing", 0.7f, 0.05f, 0.6f); W.Sfx("perfect", 1.6f, 0.05f, 0.25f);
            if (q.burst)
            {
                float R = 4.6f * 0.8f;
                W.RingFx(q.origin, 4, R * Art.PPU, 3, 0.35f, "violet", 0.75f); W.Sparks(q.origin + new Vector2(0, 0.5f), Vector2.up, 24, 16, 360, "violet");
                W.AddShake(0.5f, Vector2.down, 4);
                foreach (var e in W.enemies.ToArray())
                {
                    if (!e.Hittable) continue;
                    Vector2 to = e.pos - q.origin; float d = to.magnitude; if (d > R + e.radius) continue;
                    Vector2 dir = d > 0.05f ? to / d : Vector2.right;
                    W.HitEnemy(e, Atk(Mathf.Round(T.burst.damage * q.mult), 12f, 5, 0.3f), dir, null, false, e.Center, true);
                    OnHit(e, T.burst, dir, Skill, 1);
                }
                OnBurst(p, true);
                return;
            }
            Attack atk = q.atk;
            Vector2 c = q.origin + new Vector2(0, p.bodyH);
            swingSplits = 0;
            foreach (var e in W.enemies.ToArray())
            {
                if (!e.Hittable) continue;
                Vector2 to = e.Center - c; float d = to.magnitude;
                if (d - e.radius > atk.range) continue;
                if (atk.arc < 360f && d > 0.3f && M.AngleBetween(q.dir, to) > atk.arc / 2f) continue;
                Vector2 dir = d > 0.01f ? to / d : q.dir;
                W.HitEnemy(e, Atk(Mathf.Max(2, Mathf.Round(atk.damage * q.mult)), atk.knockback * 0.7f, 3, atk.shake * 0.6f), M.Norm(q.dir + dir), null, false, e.Center, true);
                W.Sparks(e.Center, dir, 8, 10, 70, "violet");
                OnHit(e, atk, dir, q.slot, 0);
            }
            OnSwing(p, atk, q.slot, q.origin, q.dir, true);
        }

        // ------------------------------------------------------------ update
        public static void Update(float dt)
        {
            foreach (var e in W.enemies.ToArray()) UpdateStatus(e, dt);
            for (int i = pending.Count - 1; i >= 0; i--)
            {
                var q = pending[i]; q.t -= dt;
                if (q.t <= 0f) { pending.RemoveAt(i); if (W.player.state != "Dead") EchoStrike(q); }
            }
            foreach (var w in waves.ToArray())
            {
                float step = w.speed * dt; w.pos += w.dir * step; w.dist += step; w.t += dt;
                if (Random.value < 0.7f) W.P(new Part { type = PT.Spark, x = w.pos.x + M.Rand(-0.2f, 0.2f), y = w.pos.y + M.Rand(-0.2f, 0.2f), vx = -w.dir.x * 2, vy = -w.dir.y * 2, life = 0.18f, max = 0.18f, drag = 4, ramp = w.ramp });
                foreach (var e in W.enemies.ToArray())
                {
                    if (!e.Hittable || w.hit.Contains(e)) continue;
                    if ((e.Center - w.pos).magnitude > e.radius + 0.55f && (e.pos - w.pos).magnitude > e.radius + 0.55f) continue;
                    w.hit.Add(e);
                    W.HitEnemy(e, Atk(w.dmg, 5f, 3, 0.12f), w.dir, null, false, e.Center, true);
                    OnHit(e, Atk(w.dmg), w.dir, w.slot, 1);
                }
                foreach (var pr in W.projectiles) if (pr.owner == Owner.Enemy && !pr.dead && (pr.pos - w.pos).magnitude < 0.6f) W.PopProjectile(pr);
                if (w.dist >= w.max || w.pos.x < Arena.xMin || w.pos.x > Arena.xMax || w.pos.y < Arena.yMin || w.pos.y > Arena.yMax) { w.dead = true; W.Sparks(w.pos, w.dir, 6, 6, 120, w.ramp); }
            }
            waves.RemoveAll(w => w.dead);
            foreach (var s in shards.ToArray())
            {
                s.t += dt; s.life -= dt;
                if (s.target != null && !s.target.Hittable)
                {
                    s.target = null;
                    foreach (var o in W.enemies) if (o.Hittable && (o.pos - s.pos).magnitude < 6f) { s.target = o; break; }
                }
                if (s.target != null && s.t > 0.12f) { Vector2 want = M.Norm(s.target.Center - s.pos) * 13f; s.vel += (want - s.vel) * (1f - Mathf.Exp(-8f * dt)); }
                else s.vel *= Mathf.Exp(-2f * dt);
                s.trail.Add(s.pos); if (s.trail.Count > 5) s.trail.RemoveAt(0);
                s.pos += s.vel * dt;
                if (s.t >= 0.12f)
                    foreach (var e in W.enemies.ToArray())
                    {
                        if (!e.Hittable || (e.Center - s.pos).magnitude > e.radius + 0.25f) continue;
                        Vector2 dir = M.Norm(s.vel);
                        W.HitEnemy(e, Atk(s.dmg, 2f, 2, 0.05f), dir, null, false, s.pos, true);
                        OnHit(e, Atk(s.dmg), dir, s.slot, 1);
                        W.Sparks(s.pos, dir, 6, 8, 90, "acid"); s.dead = true; break;
                    }
                if (s.life <= 0f && !s.dead) { s.dead = true; W.Sparks(s.pos, Vector2.up, 4, 4, 360, "acid"); }
            }
            shards.RemoveAll(s => s.dead);
            foreach (var b in bolts) b.life -= dt;
            bolts.RemoveAll(b => b.life <= 0f);
            foreach (var g in echoes) g.life -= dt;
            echoes.RemoveAll(g => g.life <= 0f);
        }

        public static void ResetFx() { waves.Clear(); shards.Clear(); bolts.Clear(); echoes.Clear(); pending.Clear(); offer.Clear(); picked = -1; }

        // ------------------------------------------------------------ wave reward cards
        /// <summary>Offers 3 random upgrades. Returns false when everything is already level 3.</summary>
        public static bool OfferCards()
        {
            offer.Clear(); picked = -1; offerT = -1f;
            var pool = new List<Vector2Int>();
            for (int s = 0; s < 2; s++) for (int k = 0; k < Count; k++) if (lv[s, k] < 3) pool.Add(new Vector2Int(s, k));
            while (offer.Count < 3 && pool.Count > 0) { int i = Random.Range(0, pool.Count); offer.Add(pool[i]); pool.RemoveAt(i); }
            if (offer.Count > 0) W.Sfx("grade", 0.8f, 0.05f, 0.7f);
            return offer.Count > 0;
        }

        public static void Pick(int i)
        {
            if (i < 0 || i >= offer.Count || picked >= 0 || offerT < 0.15f) return;
            var c = offer[i];
            lv[c.x, c.y] = Mathf.Min(3, lv[c.x, c.y] + 1); picked = i; offerT = 0f;
            var p = W.player; string ramp = Ramp[c.y] == "acid" ? "gold" : Ramp[c.y];
            W.Sfx("chargeFull"); W.Sfx("clear", 1.3f, 0.05f, 0.5f);
            W.RingFx(p.Center, 3, 30, 2, 0.35f, ramp); W.Sparks(p.Center, Vector2.up, 20, 12, 360, Ramp[c.y]);
            W.PopText(p.pos.x, p.pos.y + 1.8f, Tag[c.y] + " " + lv[c.x, c.y], Hex[c.y], 2, false, 26, 0, 70, 1.1f, 260, 1.8f);
        }

        /// <summary>Card rectangle in 320x180 screen pixels.</summary>
        public static Rect CardRect(int i) { const float w = 82f, h = 70f; return new Rect(Art.VW / 2f - w * 1.5f - 8f + i * (w + 8f), 62f, w, h); }
    }
}
