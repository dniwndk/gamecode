using System.Collections.Generic;
using UnityEngine;

namespace Ashblade
{
    public enum EnchKey { Pierce, Fire, Frost, Chain, Split, Echo }

    /// <summary>Burn / chill / freeze state that enchants put on an enemy.</summary>
    public class EnchStatus
    {
        public int burn, chill, burnLv, frostLv, wild;
        public float burnT, burnTick, chillT, frozen, frozenMax, shockCd;
    }

    /// <summary>The element levels a hit carries, plus the keywords that change how elements stack (echo) or spread (split).</summary>
    public struct El
    {
        public int fire, frost, echo, split;
        public static El Of(int slot) { return new El { fire = Ench.L(slot, EnchKey.Fire), frost = Ench.L(slot, EnchKey.Frost), echo = Ench.L(slot, EnchKey.Echo), split = Ench.L(slot, EnchKey.Split) }; }
    }

    public class SynDef { public EnchKey a, b; public string tag, ko; }
    public class EnchPatch { public Vector2 pos; public float r, life, max, tick, seed; public int fire, frost; }
    public class EnchAfter { public float t; public Vector2 a; public Enemy target; public int dmg; public El el; public string ramp; }

    public class EnchWave
    {
        public Vector2 pos, dir; public float speed, dist, max, t, dropAcc, zapT = 0.08f; public int dmg, slot, fire, frost, storm, shrap, zaps; public string ramp; public bool big, dead;
        public readonly HashSet<Enemy> hit = new HashSet<Enemy>();
    }
    public class EnchShard { public Vector2 pos, vel; public Enemy target; public float life, t; public int dmg, slot; public string kind = "acid"; public bool dead; public readonly List<Vector2> trail = new List<Vector2>(); }
    public class EnchBolt { public Vector2 a, b; public float life, max, seed; public string ramp = "gold"; }
    public class EnchEcho { public Vector2 pos, dir; public bool flip, burst; public Spr spr; public float life, max, r, arc; }
    public class EnchPending { public float t, mult; public Attack atk; public int slot; public Vector2 origin, dir; public bool flip, burst; public Spr spr; }

    /// <summary>
    /// Keyword enchants on two slots: 0 = basic (3-hit combo, dash strike), 1 = skill (spin slash, ash burst).
    /// Each keyword has a level 0..3. Effects started by an enchant (waves, shards, lightning, blasts) carry the
    /// elements (fire, frost) but do not start new chains, so combinations never run away.
    /// Any two keywords in the same slot also form a synergy (15 pairs, see Syn).
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
        public static readonly List<EnchPatch> patches = new List<EnchPatch>();
        static readonly List<EnchAfter> after = new List<EnchAfter>();
        static readonly Dictionary<string, float> synPopT = new Dictionary<string, float>();

        // ------------------------------------------------------------ synergies
        static SynDef S(EnchKey a, EnchKey b, string tag, string ko) { return new SynDef { a = a, b = b, tag = tag, ko = ko }; }
        public static readonly SynDef[] Syn =
        {
            S(EnchKey.Pierce, EnchKey.Fire, "FLAME TRAIL", "Waves leave burning ground"),
            S(EnchKey.Pierce, EnchKey.Frost, "FROST TRAIL", "Waves leave icy ground that chills"),
            S(EnchKey.Pierce, EnchKey.Chain, "STORM WAVE", "Waves drop lightning on nearby foes"),
            S(EnchKey.Pierce, EnchKey.Split, "SHRAPNEL", "Waves burst into seeker shards at the end"),
            S(EnchKey.Pierce, EnchKey.Echo, "TWIN WAVE", "Shadow waves hit at full power, +1 wave"),
            S(EnchKey.Fire, EnchKey.Frost, "THERMAL SHOCK", "Burning + chilled foes burst in steam"),
            S(EnchKey.Fire, EnchKey.Chain, "OVERLOAD", "Lightning carries burn, +damage per burn stack"),
            S(EnchKey.Fire, EnchKey.Split, "WILDFIRE", "Burn spreads to nearby foes on its own"),
            S(EnchKey.Fire, EnchKey.Echo, "DOUBLE BURN", "Burn stacks twice, max stacks +2"),
            S(EnchKey.Frost, EnchKey.Chain, "SUPERCONDUCT", "Lightning from cold foes +2 jumps, shatters frozen"),
            S(EnchKey.Frost, EnchKey.Split, "ICE SHARDS", "Shatter throws ice seeker shards"),
            S(EnchKey.Frost, EnchKey.Echo, "DOUBLE CHILL", "Chill stacks twice"),
            S(EnchKey.Chain, EnchKey.Split, "SPARK SHARDS", "Shards arc lightning once more"),
            S(EnchKey.Chain, EnchKey.Echo, "AFTERSHOCK", "Lightning strikes again 0.25 s later"),
            S(EnchKey.Split, EnchKey.Echo, "MIRROR SHARDS", "Shadows throw seeker shards"),
        };
        public static bool On(int slot, EnchKey a, EnchKey b) { return L(slot, a) > 0 && L(slot, b) > 0; }
        public static List<SynDef> Active(int slot) { var o = new List<SynDef>(); foreach (var x in Syn) if (On(slot, x.a, x.b)) o.Add(x); return o; }
        /// <summary>Synergies that taking keyword k into slot would switch on.</summary>
        public static List<SynDef> NewIf(int slot, int k)
        {
            var o = new List<SynDef>();
            if (lv[slot, k] > 0) return o;
            foreach (var x in Syn) if (((int)x.a == k && L(slot, x.b) > 0) || ((int)x.b == k && L(slot, x.a) > 0)) o.Add(x);
            return o;
        }
        static void SynPop(Enemy e, string tag, string col)
        {
            float last; if (synPopT.TryGetValue(tag, out last) && last > W.realTime - 0.5f) return;
            synPopT[tag] = W.realTime; W.PopText(e.pos.x, e.pos.y + 1.9f, tag, col, 1, false, 30, 0, 70, 0.7f);
        }
        static void SpawnShards(Vector2 c, int n, int dmg, int slot, Enemy exclude, string kind)
        {
            var others = new List<Enemy>();
            foreach (var o in W.enemies) if (o != exclude && o.Hittable) others.Add(o);
            others.Sort((a, b) => (a.pos - c).sqrMagnitude.CompareTo((b.pos - c).sqrMagnitude));
            for (int i = 0; i < n && shards.Count < 60; i++)
                shards.Add(new EnchShard { pos = c, vel = M.FromAng(M.Rand(0, M.TAU)) * 7f, target = others.Count > 0 ? others[i % others.Count] : null, life = 1.6f, dmg = dmg, slot = slot, kind = kind });
        }
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

        static void ApplyElements(Enemy e, int fire, int frost, Vector2 dir) { ApplyElements(e, new El { fire = fire, frost = frost }, dir); }
        static void ApplyElements(Enemy e, El el, Vector2 dir)
        {
            if (!e.Hittable && !e.dying) return;
            var s = St(e);
            int fire = el.fire, frost = el.frost, twice = el.echo > 0 ? 2 : 1; // DOUBLE BURN / DOUBLE CHILL
            if (fire > 0)
            {
                s.burn = Mathf.Min(2 + fire * 2 + (el.echo > 0 ? 2 : 0), s.burn + fire * twice); s.burnT = 3f; s.burnLv = Mathf.Max(s.burnLv, fire);
                if (el.split > 0) s.wild = Mathf.Max(s.wild, el.split); // WILDFIRE
                if (s.burnTick <= 0f) s.burnTick = 0.45f;
                W.Embers(e.Center, 3 * twice, "fire", 0.6f);
            }
            if (frost > 0 && s.frozen <= 0f && !e.dying)
            {
                s.chill = Mathf.Min(4, s.chill + twice); s.chillT = 2.5f; s.frostLv = Mathf.Max(s.frostLv, frost);
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
            if (fire > 0 && frost > 0 && s.burn > 0 && (s.chill > 0 || s.frozen > 0f) && s.shockCd <= 0f && !e.dying) ThermalShock(e, el, dir);
        }

        // THERMAL SHOCK: fire meets frost on one body and bursts into steam
        static void ThermalShock(Enemy e, El el, Vector2 dir)
        {
            var s = e.st; Vector2 c = e.Center; const float R = 1.7f;
            s.shockCd = 1.4f; s.chill = 0;
            W.RingFx(e.pos, 3, R * Art.PPU, 2, 0.3f, "steel", 0.75f); W.RingFx(e.pos, 2, R * Art.PPU * 0.6f, 2, 0.25f, "fire", 0.75f);
            W.Smoke(e.pos, 10, 3f, 1.3f, "#c8d0dc", 1f, 14f); W.Sparks(c, Vector2.up, 14, 10, 360, "ice"); W.Sparks(c, Vector2.up, 10, 10, 360, "fire");
            SynPop(e, "THERMAL SHOCK", "#e8eef8"); W.Sfx("burst", 1.8f, 0.05f, 0.5f); W.AddShake(0.25f, Vector2.down, 3);
            int dmg = 6 + 5 * (el.fire + el.frost);
            foreach (var o in W.enemies.ToArray())
            {
                if (!o.Hittable) continue;
                Vector2 to = o.pos - e.pos; float d = to.magnitude;
                if (d > R + o.radius) continue;
                W.HitEnemy(o, Atk(dmg, 7f, 4, 0.15f), d > 0.05f ? to / d : dir, null, false, o.Center, true);
            }
        }

        static void WildfireSpread(Enemy e)
        {
            var s = e.st; Enemy best = null; float bd = 2.2f + 0.4f * s.wild;
            foreach (var o in W.enemies) { if (o == e || !o.Hittable || (o.st != null && o.st.burn >= s.burn)) continue; float d = (o.pos - e.pos).magnitude; if (d < bd) { bd = d; best = o; } }
            if (best == null) return;
            bolts.Add(new EnchBolt { a = e.Center, b = best.Center, life = 0.22f, max = 0.22f, seed = Random.value * 1000f, ramp = "fire" });
            ApplyElements(best, new El { fire = s.burnLv, split = s.wild }, M.Norm(best.pos - e.pos));
            W.Embers(best.Center, 5, "fire", 0.8f);
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
            if (s.shockCd > 0f) s.shockCd -= dt;
            if (s.burn > 0)
            {
                s.burnT -= dt; s.burnTick -= dt;
                if (Random.value < 0.5f + s.burn * 0.06f)
                    W.P(new Part { type = PT.Spark, x = e.pos.x + M.Rand(-0.3f, 0.3f), y = e.Center.y + M.Rand(-0.3f, 0.2f), vx = M.Rand(-0.4f, 0.4f), vy = M.Rand(1.5f, 3f), life = 0.3f, max = 0.3f, drag = 2, g = -2, ramp = "fire" });
                if (s.burnTick <= 0f && e.Hittable)
                {
                    s.burnTick = 0.45f; Dot(e, 1 + s.burn); W.Sfx("hit", 1.9f, 0.1f, 0.25f);
                    if (s.wild > 0 && e.Hittable) WildfireSpread(e);
                }
                if (s.burnT <= 0f) { s.burn = 0; s.wild = 0; }
            }
            if (s.chill > 0)
            {
                s.chillT -= dt; if (s.chillT <= 0f) s.chill = 0;
                if (Random.value < 0.15f * s.chill) W.P(new Part { type = PT.Ember, x = e.pos.x + M.Rand(-0.4f, 0.4f), y = e.Center.y + M.Rand(-0.2f, 0.4f), vy = -0.3f, life = 0.5f, max = 0.5f, ramp = "ice", seed = M.Rand(0, 9) });
            }
            if (s.frozen > 0f) { s.frozen -= dt; if (s.frozen <= 0f) { W.Sparks(e.Center, Vector2.up, 8, 6, 360, "ice"); W.Sfx("pop", 1.6f, 0.05f, 0.4f); } }
        }

        static void Shatter(Enemy e, int frostLv, Vector2 dir, int slot = -1)
        {
            e.st.frozen = 0f;
            if (slot >= 0 && L(slot, EnchKey.Split) > 0) // ICE SHARDS
            {
                int sp = L(slot, EnchKey.Split);
                SpawnShards(e.Center, 2 + sp, 6 + 3 * sp, slot, e, "ice"); SynPop(e, "ICE SHARDS", "#bfe8ff");
            }
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
            int frost = L(slot, EnchKey.Frost);
            if (e.st != null && e.st.frozen > 0f && frost > 0 && gen == 0 && !e.dying) Shatter(e, frost, dir, slot);
            ApplyElements(e, El.Of(slot), dir);
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
                int n = (spin ? 4 + 2 * (pierce - 1) : 1 + (pierce >= 3 ? 2 : 0)) + (isEcho && echo > 0 ? 1 : 0); // TWIN WAVE
                float b = M.Ang(dir);
                for (int i = 0; i < n; i++)
                {
                    float a = spin ? b + (float)i / n * M.TAU : b + (i - (n - 1) / 2f) * 0.28f;
                    waves.Add(MakeWave(origin, a, 14f, 4f + 1.5f * pierce, Mathf.RoundToInt(atk.damage * (0.35f + 0.15f * pierce) * (isEcho && echo == 0 ? 0.6f : 1f)), slot, atk.heavy));
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

        static EnchWave MakeWave(Vector2 origin, float a, float speed, float max, int dmg, int slot, bool big)
        {
            return new EnchWave
            {
                pos = origin, dir = M.FromAng(a), speed = speed, max = max, dmg = dmg, slot = slot, ramp = ElementRamp(slot), big = big,
                fire = L(slot, EnchKey.Fire), frost = L(slot, EnchKey.Frost), storm = L(slot, EnchKey.Chain), shrap = L(slot, EnchKey.Split),
            };
        }

        public static void OnBurst(Player p, bool isEcho)
        {
            swingSplits = 0;
            int pierce = L(Skill, EnchKey.Pierce), echo = L(Skill, EnchKey.Echo);
            if (pierce > 0)
            {
                int n = 6 + 2 * pierce;
                for (int i = 0; i < n; i++)
                    waves.Add(MakeWave(p.pos, (float)i / n * M.TAU, 13f, 6f + 1.5f * pierce, 12 + 6 * pierce, Skill, true));
            }
            if (echo > 0 && !isEcho)
                pending.Add(new EnchPending { t = 0.35f, burst = true, slot = Skill, origin = p.pos, dir = Vector2.right, mult = 0.35f + 0.15f * echo, flip = p.flip, spr = PlayerSheet.Pick(p) ?? Art.PlayerRunA });
        }

        static void Chain(Enemy src, Attack atk, int slot, int maxJumps = 0)
        {
            var el = El.Of(slot);
            bool cold = el.frost > 0 && src.st != null && (src.st.chill > 0 || src.st.frozen > 0f); // SUPERCONDUCT
            int chain = Mathf.Max(1, L(slot, EnchKey.Chain)), jumps = maxJumps > 0 ? maxJumps : 1 + chain + (cold ? 2 : 0);
            string ramp = el.fire > 0 ? "fire" : el.frost > 0 ? "ice" : "gold";
            var seen = new HashSet<Enemy> { src };
            Enemy from = src;
            for (int j = 0; j < jumps; j++)
            {
                Enemy best = null; float bd = 3.6f;
                foreach (var o in W.enemies) { if (!o.Hittable || seen.Contains(o)) continue; float d = (o.Center - from.Center).magnitude; if (d < bd) { bd = d; best = o; } }
                if (best == null) break;
                seen.Add(best);
                bolts.Add(new EnchBolt { a = from.Center, b = best.Center, life = 0.16f, max = 0.16f, seed = Random.value * 1000f, ramp = ramp });
                Vector2 dir = M.Norm(best.Center - from.Center);
                int dmg = Mathf.Max(2, Mathf.RoundToInt(atk.damage * (0.25f + 0.1f * chain)));
                if (el.fire > 0 && best.st != null && best.st.burn > 0) { dmg += Mathf.RoundToInt(best.st.burn * 1.5f); W.Sparks(best.Center, Vector2.up, 8, 9, 360, "fire"); SynPop(best, "OVERLOAD", "#ffb43c"); }
                bool wasFrozen = el.frost > 0 && best.st != null && best.st.frozen > 0f;
                W.HitEnemy(best, Atk(dmg, 2f, 3), dir, null, false, best.Center, true);
                if (wasFrozen && best.Hittable) Shatter(best, el.frost, dir, slot);
                if (best.Hittable && !best.SuperArmor && best.state != "Stagger") best.Stagger(10);
                ApplyElements(best, el, dir);
                if (el.echo > 0) after.Add(new EnchAfter { t = 0.25f, a = from.Center, target = best, dmg = Mathf.RoundToInt(dmg * 0.6f), el = el, ramp = ramp }); // AFTERSHOCK
                W.Sparks(best.Center, Vector2.up, 6, 9, 360, ramp); W.StarFlash(best.Center, Vector2.right, 6, ramp, 0.07f);
                from = best;
            }
            if (seen.Count > 1) { W.Sfx("shoot", 2.2f, 0.05f, 0.7f); W.Sfx("hit", 2.4f, 0.05f, 0.4f); }
            if (cold && seen.Count > 1 && maxJumps == 0) SynPop(src, "SUPERCONDUCT", "#bfe8ff");
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
            int msp = L(q.slot, EnchKey.Split);
            if (msp > 0) SpawnShards(c, 1 + msp, Mathf.Max(2, Mathf.RoundToInt(atk.damage * (0.2f + 0.08f * msp))), q.slot, null, "violet"); // MIRROR SHARDS
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
            for (int i = after.Count - 1; i >= 0; i--)
            {
                var q = after[i]; q.t -= dt; if (q.t > 0f) continue;
                after.RemoveAt(i);
                var e = q.target; if (!e.Hittable) continue;
                bolts.Add(new EnchBolt { a = q.a, b = e.Center, life = 0.14f, max = 0.14f, seed = Random.value * 1000f, ramp = q.ramp });
                W.HitEnemy(e, Atk(Mathf.Max(1, q.dmg), 1f, 2), M.Norm(e.Center - q.a), null, false, e.Center, true);
                ApplyElements(e, new El { fire = q.el.fire, frost = q.el.frost, split = q.el.split }, Vector2.up);
                W.Sfx("shoot", 2.6f, 0.05f, 0.4f);
            }
            foreach (var pt in patches)
            {
                pt.life -= dt; pt.tick -= dt;
                if (pt.tick > 0f) continue;
                pt.tick = 0.5f;
                foreach (var e in W.enemies.ToArray()) if (e.Hittable && (e.pos - pt.pos).magnitude < pt.r + e.radius) ApplyElements(e, new El { fire = pt.fire, frost = pt.frost }, Vector2.up);
            }
            patches.RemoveAll(pt => pt.life <= 0f);
            for (int i = pending.Count - 1; i >= 0; i--)
            {
                var q = pending[i]; q.t -= dt;
                if (q.t <= 0f) { pending.RemoveAt(i); if (W.player.state != "Dead") EchoStrike(q); }
            }
            foreach (var w in waves.ToArray())
            {
                float step = w.speed * dt; w.pos += w.dir * step; w.dist += step; w.t += dt;
                if (Random.value < 0.7f) W.P(new Part { type = PT.Spark, x = w.pos.x + M.Rand(-0.2f, 0.2f), y = w.pos.y + M.Rand(-0.2f, 0.2f), vx = -w.dir.x * 2, vy = -w.dir.y * 2, life = 0.18f, max = 0.18f, drag = 4, ramp = w.ramp });
                if (w.fire > 0 || w.frost > 0) // FLAME TRAIL / FROST TRAIL
                {
                    w.dropAcc += step;
                    if (w.dropAcc >= 0.7f && patches.Count < 40) { w.dropAcc = 0f; patches.Add(new EnchPatch { pos = w.pos, r = 0.6f, life = 2.4f, max = 2.4f, tick = 0.1f, fire = w.fire, frost = w.frost, seed = Random.value * 100f }); }
                }
                if (w.storm > 0 && w.zaps < 3) // STORM WAVE
                {
                    w.zapT -= dt;
                    if (w.zapT <= 0f)
                    {
                        Enemy best = null; float bd = 2.4f;
                        foreach (var e in W.enemies) { if (!e.Hittable || w.hit.Contains(e)) continue; float d = (e.pos - w.pos).magnitude; if (d < bd) { bd = d; best = e; } }
                        if (best != null)
                        {
                            w.zapT = 0.18f; w.zaps++;
                            bolts.Add(new EnchBolt { a = w.pos + new Vector2(0, 0.4f), b = best.Center, life = 0.14f, max = 0.14f, seed = Random.value * 1000f, ramp = "gold" });
                            W.HitEnemy(best, Atk(Mathf.Max(2, Mathf.RoundToInt(w.dmg * 0.5f)), 2f, 2), M.Norm(best.pos - w.pos), null, false, best.Center, true);
                            ApplyElements(best, El.Of(w.slot), Vector2.up);
                            W.Sfx("shoot", 2.4f, 0.05f, 0.4f);
                        }
                    }
                }
                foreach (var e in W.enemies.ToArray())
                {
                    if (!e.Hittable || w.hit.Contains(e)) continue;
                    if ((e.Center - w.pos).magnitude > e.radius + 0.55f && (e.pos - w.pos).magnitude > e.radius + 0.55f) continue;
                    w.hit.Add(e);
                    W.HitEnemy(e, Atk(w.dmg, 5f, 3, 0.12f), w.dir, null, false, e.Center, true);
                    OnHit(e, Atk(w.dmg), w.dir, w.slot, 1);
                }
                foreach (var pr in W.projectiles) if (pr.owner == Owner.Enemy && !pr.dead && (pr.pos - w.pos).magnitude < 0.6f) W.PopProjectile(pr);
                if (w.dist >= w.max || w.pos.x < Arena.xMin || w.pos.x > Arena.xMax || w.pos.y < Arena.yMin || w.pos.y > Arena.yMax)
                {
                    w.dead = true; W.Sparks(w.pos, w.dir, 6, 6, 120, w.ramp);
                    if (w.shrap > 0) { SpawnShards(w.pos, 1 + w.shrap, Mathf.Max(2, Mathf.RoundToInt(w.dmg * 0.5f)), w.slot, null, "acid"); W.Sfx("pickup", 1.8f, 0.05f, 0.4f); } // SHRAPNEL
                }
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
                        if (On(s.slot, EnchKey.Chain, EnchKey.Split)) Chain(e, Atk(s.dmg * 2), s.slot, 1); // SPARK SHARDS
                        W.Sparks(s.pos, dir, 6, 8, 90, s.kind == "ice" ? "ice" : s.kind == "violet" ? "violet" : "acid"); s.dead = true; break;
                    }
                if (s.life <= 0f && !s.dead) { s.dead = true; W.Sparks(s.pos, Vector2.up, 4, 4, 360, "acid"); }
            }
            shards.RemoveAll(s => s.dead);
            foreach (var b in bolts) b.life -= dt;
            bolts.RemoveAll(b => b.life <= 0f);
            foreach (var g in echoes) g.life -= dt;
            echoes.RemoveAll(g => g.life <= 0f);
        }

        public static void ResetFx() { waves.Clear(); shards.Clear(); bolts.Clear(); echoes.Clear(); pending.Clear(); patches.Clear(); after.Clear(); offer.Clear(); picked = -1; }

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
            var fresh = NewIf(c.x, c.y);
            lv[c.x, c.y] = Mathf.Min(3, lv[c.x, c.y] + 1); picked = i; offerT = 0f;
            if (fresh.Count > 0)
            {
                var names = new List<string>(); foreach (var x in fresh) names.Add(x.tag);
                W.Banner("SYNERGY", Col.H("#ffd166"), 1.6f, string.Join(" + ", names.ToArray())); W.Sfx("perfect", 1.3f, 0.05f, 0.6f);
            }
            var p = W.player; string ramp = Ramp[c.y] == "acid" ? "gold" : Ramp[c.y];
            W.Sfx("chargeFull"); W.Sfx("clear", 1.3f, 0.05f, 0.5f);
            W.RingFx(p.Center, 3, 30, 2, 0.35f, ramp); W.Sparks(p.Center, Vector2.up, 20, 12, 360, Ramp[c.y]);
            W.PopText(p.pos.x, p.pos.y + 1.8f, Tag[c.y] + " " + lv[c.x, c.y], Hex[c.y], 2, false, 26, 0, 70, 1.1f, 260, 1.8f);
        }

        /// <summary>Card rectangle in 320x180 screen pixels.</summary>
        public static Rect CardRect(int i) { const float w = 82f, h = 70f; return new Rect(Art.VW / 2f - w * 1.5f - 8f + i * (w + 8f), 62f, w, h); }
    }
}
