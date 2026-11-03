using System;
using System.Collections.Generic;
using UnityEngine;
using Random = UnityEngine.Random;

namespace Ashblade
{
    public class MenuItem
    {
        public string name, col; public string[] d; public int cost; public bool sold, leave;
        public Action act, after;
        public MenuItem(string name, string col, int cost, Action act, params string[] d) { this.name = name; this.col = col; this.cost = cost; this.act = act; this.d = d; }
    }
    public class Menu { public string kind, title, sub; public List<MenuItem> items; public float t = -0.15f, denyT; public int picked = -1, deny = -1; }
    public class Beam { public Enemy a, b; public float life, max; }
    public class AugSet { public string key, name, col, bonus, ko; public string[] ids; }
    public class RunResults { public int floor, kills, combo, boss, limbs, augs, shards, gain, total; public List<int> fresh = new List<int>(); }

    /// <summary>
    /// The run around the fights: shards, room types picked at a fork between floors (battle, elite, cursed, shop,
    /// sanctuary), the boss every 5th floor, augment set bonuses, moves a broken body still has, and the results
    /// screen with permanent unlocks (saved in PlayerPrefs).
    /// </summary>
    public static class Run
    {
        static AshTuning T { get { return AshTuning.I; } }

        public static int shards, bossKills, limbsLost, eliteLeft;
        public static string mod = "fight";
        public static float shardFlash;
        public static readonly List<Beam> beams = new List<Beam>();
        public static Menu menu;
        public static RunResults results;

        public static void Reset() { shards = bossKills = limbsLost = eliteLeft = 0; mod = "fight"; shardFlash = 0f; beams.Clear(); menu = null; results = null; }

        public static void GainShards(int n, Vector2? at = null)
        {
            shards += n; shardFlash = 0.35f;
            if (at.HasValue && n >= 5) W.PopText(at.Value.x, at.Value.y + 1.6f, "+" + n + " SHARDS", "#ffe066", 1, false, 22, 0, 70, 0.9f);
        }

        // ---------------------------------------------------------------- room modifiers
        public static void ApplyRoomMods(Enemy e)
        {
            e.dmgMul = 1f; e.spdMul = 1f; e.size = 1f;
            if (e.kind == EnemyKind.Boss) { float m = 1f + Mathf.Max(0f, W.waveN / 5f - 1f) * 0.6f; e.maxHp = e.hp = e.hpGhost = Mathf.Round(e.K.hp * m); e.phase = 1; e.summonCd = 0; }
            if (mod == "cursed") { e.maxHp = e.hp = e.hpGhost = Mathf.Round(e.hp * 1.5f); e.dmgMul *= 1.3f; e.cursed = true; }
            if (eliteLeft > 0 && e.kind != EnemyKind.Boss)
            {
                eliteLeft--;
                e.elite = true; e.maxHp = e.hp = e.hpGhost = Mathf.Round(e.hp * 2.4f); e.dmgMul *= 1.4f; e.spdMul = 1.15f; e.size = 1.22f;
            }
        }

        // ---------------------------------------------------------------- shield bearer
        public static bool ShieldCheck(Enemy e, Attack atk, Vector2 dir, Combatant attacker)
        {
            if (!e.shield || e.dying) return false;
            Vector2 facing = M.Norm(W.player.pos - e.pos);
            if (Vector2.Dot(-dir, facing) < 0.45f) return false; // side or back: goes through
            if (atk.heavy || atk.kind == AttackKind.Thrust || atk == T.burst)
            {
                e.shield = false; e.spr = Art.ShieldBroken;
                W.PopText(e.pos.x, e.pos.y + 1.6f, "SHIELD BREAK", "#c8d0dc", 1, false, 26, 0, 70, 0.9f, 260, 1.8f);
                W.Sparks(e.Center, -dir, 20, 12, 120, "steel"); W.Debris(e.Center, 8, new[] { Col.H("#c8d0dc"), Col.H("#7884a0"), Col.H("#4a5468") }, null, 1.2f, 1f, 1.2f);
                W.Sfx("break", 1.2f); W.Slowmo(0.35f, 0.12f); W.AddShake(0.3f, dir, 3);
                return false;
            }
            Vector2 at = e.Center + facing * 0.35f;
            W.Sparks(at, -dir, 10, 10, 90, "steel"); W.StarFlash(at, -dir, 7, "steel");
            W.PopText(e.pos.x, e.pos.y + 1.3f, "BLOCK", "#9aa4b8", 1, false, 20, 0, 70, 0.6f);
            W.Sfx("armor", 1f, 0.05f, 0.9f); e.DoFlash(0.06f, Col.H("#c8d0e0")); e.Punch(0.2f); e.DoKnock(dir * 3f);
            if (attacker != null) attacker.DoFreeze(T.hitstop ? 3f / 60f : 0f, false);
            W.AddShake(0.1f, dir, 1);
            return true;
        }

        // ---------------------------------------------------------------- bomber
        static readonly Attack BombAtk = new Attack { name = "Bomb", damage = 30f, knockback = 14f, hitstop = 6, shake = 0.3f, heavy = true, range = 1.9f, arc = 360f };
        public static void BomberBlast(Enemy e, bool hurtPlayer)
        {
            Vector2 c = e.pos; float R = e.K.blastR; var p = W.player;
            W.RingFx(c, 3, R * Art.PPU, 3, 0.35f, "fire", 0.75f); W.RingFx(c, 2, R * Art.PPU * 0.6f, 2, 0.25f, "gold", 0.75f);
            W.Sparks(e.Center, Vector2.up, 30, 14, 360, "fire"); W.Smoke(c, 10, 4f, 1.3f, "#3a2c3c"); W.Scorch(c, 12);
            for (int i = 0; i < 5; i++) W.Crack(c, M.Rand(0, M.TAU), 12, 1);
            W.AddShake(0.5f, Vector2.down, 4); W.Sfx("burst", 1.5f, 0.05f, 0.7f); W.ScreenFlash(new Color(1f, 0.82f, 0.63f), 0.2f, 0.1f);
            foreach (var o in W.enemies.ToArray())
            {
                if (o == e || !o.Hittable) continue;
                Vector2 to = o.pos - c; float d = to.magnitude;
                if (d > R + o.radius) continue;
                W.HitEnemy(o, BombAtk, d > 0.05f ? to / d : Vector2.right, null, false, o.Center, !hurtPlayer);
            }
            if (hurtPlayer && p.state != "Dead")
            {
                float dp = (p.pos - c).magnitude;
                if (dp < R + p.radius)
                {
                    if (p.state == "Dash" && p.Invulnerable) W.PerfectDodge(e);
                    else p.HurtBy(e, dp > 0.1f ? (p.pos - c) / dp : Vector2.right, e.K.dmg * e.dmgMul);
                }
            }
        }

        // ---------------------------------------------------------------- healer
        public static void HealerPulse(Enemy e)
        {
            int n = 0;
            foreach (var o in W.enemies)
            {
                if (o == e || !o.Hittable || o.hp >= o.maxHp || (o.pos - e.pos).magnitude > 7f) continue;
                float amt = Mathf.Round(Mathf.Min(o.maxHp - o.hp, 25f + o.maxHp * 0.1f));
                o.hp += amt; o.hpShowT = 2f; n++;
                W.PopText(o.pos.x, o.pos.y + 1.3f, "+" + amt, "#8be3a6", 1, true);
                beams.Add(new Beam { a = e, b = o, life = 0.45f, max = 0.45f });
                W.Sparks(o.Center, Vector2.up, 8, 6, 360, "acid");
            }
            W.RingFx(e.Center, 2, 20, 1, 0.3f, "acid"); W.Sfx("chargeFull", 1.5f, 0.05f, 0.5f);
            if (n > 0) W.PopText(e.pos.x, e.pos.y + 1.6f, "HEAL", "#8be3a6", 1, false, 22, 0, 70, 0.7f);
        }
        public static bool AnyHurtAlly(Enemy e)
        {
            foreach (var o in W.enemies) if (o != e && o.Hittable && o.hp < o.maxHp && (o.pos - e.pos).magnitude < 7f) return true;
            return false;
        }

        // ---------------------------------------------------------------- boss: the Ash Warden
        public static void BossPickMove(Enemy e, float dist)
        {
            var opts = new List<string>();
            if (dist < 3.2f) { opts.Add("slam"); opts.Add("slam"); }
            opts.Add("charge");
            if (e.phase >= 2) { opts.Add("volley"); opts.Add("volley"); }
            if (e.phase >= 3 && e.summonCd <= 0) { opts.Add("summon"); opts.Add("summon"); }
            e.move = opts[Random.Range(0, opts.Count)];
            if (e.move == "summon") e.summonCd = 3; else e.summonCd--;
            e.windF = (e.move == "volley" ? 40 : e.move == "summon" ? 36 : e.move == "charge" ? 38 : e.K.windup) * (e.phase >= 3 ? 0.72f : 1f);
        }
        public static void BossVolley(Enemy e)
        {
            int n = e.phase >= 3 ? 14 : 10; float off = M.Rand(0, M.TAU);
            for (int i = 0; i < n; i++)
            {
                float a = off + i / (float)n * M.TAU; Vector2 d = new Vector2(Mathf.Cos(a), Mathf.Sin(a));
                W.projectiles.Add(new Projectile { pos = e.pos + d * 0.8f, h = 12f, vel = d * 4.2f, owner = Owner.Enemy, dmg = Mathf.Round(12f * e.dmgMul), life = 4f, src = e });
            }
            W.RingFx(e.Center, 3, 30, 2, 0.3f, "fire"); W.Sparks(e.Center, Vector2.up, 20, 10, 360, "fire"); W.Sfx("shoot", 0.7f, 0.05f, 1f); W.AddShake(0.25f, Vector2.up, 2);
        }
        public static void BossSummon(Enemy e)
        {
            for (int i = 0; i < 2; i++)
            {
                float a = M.Rand(0, M.TAU);
                var at = new Vector2(Mathf.Clamp(e.pos.x + Mathf.Cos(a) * 2.2f, Arena.xMin + 1, Arena.xMax - 1), Mathf.Clamp(e.pos.y + Mathf.Sin(a) * 1.6f, Arena.yMin + 1, Arena.yMax - 1));
                W.enemies.Add(new Enemy(i == 0 && e.phase >= 3 ? EnemyKind.Bomber : EnemyKind.Grunt, at));
            }
            W.RingFx(e.Center, 3, 34, 2, 0.4f, "violet"); W.Sfx("spawn", 0.7f); W.PopText(e.pos.x, e.pos.y + 2.2f, "RISE", "#c08af0", 2, false, 30, 0, 70, 0.8f);
        }
        public static void BossPhaseCheck(Enemy e)
        {
            float k = e.hp / e.maxHp; int ph = k > 0.66f ? 1 : k > 0.33f ? 2 : 3;
            if (ph <= e.phase || e.dying) return;
            e.phase = ph; e.state = "Recover"; e.stateTime = 0f; e.broken = 0f; e.poise = e.K.poise;
            W.Banner("PHASE " + ph, Col.H("#ff6a5a"), 1.3f, ph == 2 ? "THE WARDEN SPITS EMBERS" : "THE WARDEN CALLS ITS DEAD");
            W.Slowmo(0.25f, 0.4f); W.ZoomPunch(0.1f); W.AddShake(0.8f, Vector2.down, 6); W.Chroma(1f, Vector2.right); W.ScreenFlash(new Color(1f, 0.42f, 0.25f), 0.3f, 0.2f);
            W.RingFx(e.pos, 4, 60, 3, 0.5f, "fire", 0.75f); W.Sparks(e.Center, Vector2.up, 40, 16, 360, "fire"); W.Sfx("burst", 0.6f);
            Vector2 to = W.player.pos - e.pos;
            if (to.magnitude < 3.5f && W.player.state != "Dead") W.player.DoKnock(M.Norm(to) * 14f);
        }
        public static Enemy Boss()
        {
            foreach (var e in W.enemies) if (e.kind == EnemyKind.Boss && e.alive && e.state != "Spawn") return e;
            return null;
        }

        // ---------------------------------------------------------------- moves a broken body still has
        public static bool StumpArm { get { return Inj.enabled && (Inj.Severed(Inj.ArmS) || Inj.Severed(Inj.ArmO)); } }
        public static bool StumpLeg { get { return Inj.enabled && Inj.Severed(Inj.Legs); } }
        public static readonly Attack Shoulder = Attack.Make("Shoulder Charge", 2, 6, 16, 24, 1.6f, 120, 20, 8, 0.45f, 2.2f, 0, 0, true, AttackKind.Thrust, false);
        static readonly Attack HopAtk = new Attack { name = "Hop Slam", damage = 16f, knockback = 12f, hitstop = 5, shake = 0.3f, heavy = true, range = 1.8f, arc = 360f };
        public static void HopSlam(Player p)
        {
            Vector2 c = p.pos; const float R = 1.8f;
            W.RingFx(c, 3, R * Art.PPU, 2, 0.28f, "steel", 0.75f); W.Dust(c, Vector2.right, 6, 1.3f); W.Dust(c, Vector2.left, 6, 1.3f); W.Crack(c, M.Rand(0, M.TAU), 10, 2);
            W.AddShake(0.3f, Vector2.down, 3); W.Sfx("slam", 1.2f, 0.05f, 0.8f);
            foreach (var e in W.enemies.ToArray())
            {
                if (!e.Hittable) continue;
                Vector2 to = e.pos - c; float d = to.magnitude;
                if (d > R + e.radius) continue;
                W.HitEnemy(e, HopAtk, d > 0.05f ? to / d : Vector2.right, p, false, e.Center);
            }
        }

        // ---------------------------------------------------------------- augment families
        public static readonly AugSet[] Sets =
        {
            new AugSet { key = "blood", name = "BLOOD", col = "#ff4a5a", ids = new[] { "bloodrage", "leech", "spite", "hemomancy", "tourniquet" }, bonus = "KILLS BURST IN A BLOOD NOVA", ko = "Kills burst for 15 damage around them" },
            new AugSet { key = "iron", name = "IRON", col = "#c8d0dc", ids = new[] { "ironhide", "thickskin", "ironlimbs", "unbreakable" }, bonus = "TAKE 25% LESS DAMAGE", ko = "Take 25% less damage" },
            new AugSet { key = "swift", name = "SWIFT", col = "#8fdcff", ids = new[] { "fleet", "twindash", "frenzy", "adrenaline" }, bonus = "DASHING THROUGH FOES CUTS THEM", ko = "Dashing through an enemy deals 15" },
            new AugSet { key = "ash", name = "ASH", col = "#ff9a3c", ids = new[] { "emberhoard", "ashheart", "arcana", "whetstone" }, bonus = "BURST RESETS DASH AND READIES A CRIT", ko = "Burst resets dash and readies a crit" },
            new AugSet { key = "fate", name = "FATE", col = "#ffd166", ids = new[] { "executioner", "undying", "medic" }, bonus = "CRIT CHANCE +20%", ko = "Crit chance +20%" },
        };
        public static AugSet SetOf(string augId) { foreach (var s in Sets) if (Array.IndexOf(s.ids, augId) >= 0) return s; return null; }
        public static AugSet SetByKey(string key) { foreach (var s in Sets) if (s.key == key) return s; return null; }
        public static int SetCount(AugSet s) { int n = 0; foreach (var id in s.ids) if (Aug.Has(id)) n++; return n; }
        public static bool SetOn(string key) { return SetCount(SetByKey(key)) >= 3; }
        public static void CheckSetUnlock(string augId)
        {
            var s = SetOf(augId);
            if (s == null || SetCount(s) != 3) return;
            W.Banner(s.name + " SET", Col.H(s.col), 1.8f, s.bonus);
            W.RingFx(W.player.Center, 3, 50, 3, 0.5f, "gold"); W.Sfx("grade", 1.4f); W.Sfx("perfect", 1.2f, 0.05f, 0.6f);
        }
        static readonly Attack NovaAtk = new Attack { name = "Blood Nova", damage = 15f, knockback = 8f, hitstop = 3, shake = 0.15f, range = 2f, arc = 360f };
        static readonly Attack SlipAtk = new Attack { name = "Slipstream", damage = 15f, knockback = 5f, hitstop = 3, shake = 0.12f, range = 0.6f, arc = 360f };
        static int novaDepth;
        public static void BloodNova(Enemy e)
        {
            if (novaDepth > 0) return;
            novaDepth++;
            W.RingFx(e.pos, 2, 2 * Art.PPU, 2, 0.3f, "blood", 0.75f); W.Sparks(e.Center, Vector2.up, 16, 10, 360, "blood");
            W.Splat(e.pos, new[] { Col.H("#7a0a14"), Col.H("#b0141e"), Col.H("#4a0610") }, 1.2f);
            foreach (var o in W.enemies.ToArray())
            {
                if (o == e || !o.Hittable) continue;
                Vector2 to = o.pos - e.pos; float d = to.magnitude;
                if (d > 2f + o.radius) continue;
                W.HitEnemy(o, NovaAtk, d > 0.05f ? to / d : Vector2.right, null, false, o.Center, true);
            }
            novaDepth--;
        }
        public static void Slipstream(Player p)
        {
            foreach (var e in W.enemies.ToArray())
            {
                if (!e.Hittable || p.dashHit.Contains(e)) continue;
                if ((e.pos - p.pos).magnitude > e.radius + 0.55f) continue;
                p.dashHit.Add(e);
                W.HitEnemy(e, SlipAtk, p.dashDir, null, false, e.Center, true);
                W.SpeedLines(e.Center, p.dashDir, 4);
            }
        }

        // ---------------------------------------------------------------- menus between floors
        public static bool Choosing { get { return W.waveState == "menu" && menu != null && menu.picked < 0; } }

        static MenuItem Room(string k, Action act)
        {
            switch (k)
            {
                case "elite": return new MenuItem("ELITE", "#ffd166", 0, act, "ONE FOE IS EMPOWERED", "+15 SHARDS ON CLEAR");
                case "cursed": return new MenuItem("CURSED", "#c08af0", 0, act, "FOES +50% HP +30% DMG", "TWO ENCHANT PICKS");
                case "shop": return new MenuItem("SHOP", "#8be3a6", 0, act, "SPEND YOUR SHARDS");
                case "sanct": return new MenuItem("SANCTUARY", "#8fdcff", 0, act, "MEND YOUR BODY");
                case "boss": return new MenuItem("BOSS", "#ff6a5a", 0, act, "THE ASH WARDEN", "WAITS BELOW");
                default: return new MenuItem("BATTLE", "#c8bcd8", 0, act, "A NORMAL FLOOR");
            }
        }

        static void Open(string kind, string title, string sub, List<MenuItem> items)
        {
            menu = new Menu { kind = kind, title = title, sub = sub, items = items };
            W.waveState = "menu"; W.Sfx("grade", 0.7f, 0.05f, 0.6f);
        }
        public static void GoNextFloor(string m) { mod = m; menu = null; W.waveState = "clear"; W.waveT = 0.5f; }

        public static void OpenRoute()
        {
            int next = W.waveN + 1;
            if (next % 5 == 0) { Open("route", "THE NEXT DOOR", "FLOOR " + next, new List<MenuItem> { Room("boss", () => GoNextFloor("boss")) }); return; }
            var keys = new List<string> { "fight", "elite", "cursed", "shop", "sanct" };
            var wts = new List<float> { 3f, next <= 2 ? 0.6f : 2f, next <= 2 ? 0f : 1.5f, 1.6f, 1.3f };
            var chosen = new List<string>();
            while (chosen.Count < 2)
            {
                float tot = 0f; for (int i = 0; i < keys.Count; i++) if (!chosen.Contains(keys[i])) tot += wts[i];
                float r = Random.value * tot;
                for (int i = 0; i < keys.Count; i++) { if (chosen.Contains(keys[i])) continue; r -= wts[i]; if (r <= 0f) { chosen.Add(keys[i]); break; } }
            }
            var items = new List<MenuItem>();
            foreach (var k in chosen)
            {
                string kk = k;
                items.Add(Room(kk, () => { if (kk == "shop") OpenShop(); else if (kk == "sanct") OpenSanct(); else GoNextFloor(kk); }));
            }
            Open("route", "CHOOSE A DOOR", "FLOOR " + next, items);
        }

        static string RandomEnchUp()
        {
            var pool = new List<Vector2Int>();
            for (int s = 0; s < 2; s++) for (int k = 0; k < Ench.Count; k++) if (Ench.lv[s, k] < 3) pool.Add(new Vector2Int(s, k));
            if (pool.Count == 0) return null;
            var c = pool[Random.Range(0, pool.Count)]; Ench.lv[c.x, c.y]++;
            return Ench.Tag[c.y] + " " + Ench.lv[c.x, c.y];
        }
        static bool AnyOpenWound() { for (int k = 0; k < Inj.Count; k++) if (Inj.lv[k] > 0 && Inj.lv[k] < 3) return true; return false; }
        static bool AnyCut() { for (int k = Inj.ArmS; k <= Inj.Legs; k++) if (Inj.Severed(k)) return true; return false; }
        static void GiveAug(string tier)
        {
            var a = Aug.RollOne(tier, new List<AugDef>());
            if (a == null) return;
            Aug.owned.Add(a.id); Aug.Apply(a.id); CheckSetUnlock(a.id);
            var p = W.player; W.PopText(p.pos.x, p.pos.y + 1.8f, a.name, Aug.TierHex(a.tier), 1, false, 26);
        }

        public static void OpenShop()
        {
            var p = W.player;
            var pool = new List<MenuItem>
            {
                new MenuItem("ENCHANT UP", "#ffd166", 25, () => { string s = RandomEnchUp(); if (s != null) W.PopText(p.pos.x, p.pos.y + 1.8f, s, "#ffd166", 1, false, 26); }, "A RANDOM ENCHANT", "GAINS A LEVEL"),
                new MenuItem("SALVE", "#8be3a6", 12, () => p.hp = Mathf.Min(p.maxHp, p.hp + 40f), "HEAL 40 HP"),
                new MenuItem("VIGOR", "#ff8a9a", 20, () => { p.maxHp += 15f; p.hp += 15f; }, "MAX HP +15"),
                new MenuItem("EMBER FLASK", "#ff9a3c", 10, () => W.GainMeter(100f), "FILL THE", "BURST GAUGE"),
                new MenuItem("CURIO", "#d8e0ec", 55, () => GiveAug("silver"), "A RANDOM", "SILVER AUGMENT"),
            };
            if (AnyOpenWound()) pool.Add(new MenuItem("SPLINT", "#8fdcff", 15, () => MendWorst(1), "MEND THE WORST", "WOUND ONE LEVEL"));
            if (AnyCut()) pool.Add(new MenuItem("IRON LIMB", "#c8d0dc", 40, FitOneIron, "REBUILD ONE", "LOST LIMB IN IRON"));
            var items = new List<MenuItem>();
            while (items.Count < 4 && pool.Count > 0) { int j = Random.Range(0, pool.Count); items.Add(pool[j]); pool.RemoveAt(j); }
            items.Add(new MenuItem("LEAVE", "#9a92b3", 0, () => GoNextFloor("fight"), "ON TO THE", "NEXT FLOOR") { leave = true });
            Open("shop", "SHOP", "", items);
        }
        static void MendWorst(int n)
        {
            var open = new List<int>();
            for (int k = 0; k < Inj.Count; k++) if (Inj.lv[k] > 0 && Inj.lv[k] < 3) open.Add(k);
            open.Sort((a, b) => Inj.lv[b].CompareTo(Inj.lv[a]));
            for (int i = 0; i < Mathf.Min(n, open.Count); i++) { int k = open[i]; Inj.lv[k]--; Inj.SetPtsToLevel(k); Inj.flash[k] = 0.6f; }
            Inj.Mod = Inj.Calc();
        }
        static void FitOneIron()
        {
            for (int k = Inj.ArmS; k <= Inj.Legs; k++)
            {
                if (!Inj.Severed(k)) continue;
                Inj.iron[k] = true; Inj.flash[k] = 1f; Inj.Mod = Inj.Calc();
                W.RingFx(W.player.Center, 3, 28, 2, 0.35f, "steel"); W.Sfx("break", 1.6f, 0.05f, 0.7f);
                return;
            }
        }
        public static void OpenSanct()
        {
            var p = W.player;
            var items = new List<MenuItem>
            {
                new MenuItem("REST", "#8be3a6", 0, () => p.hp = p.maxHp, "HEAL TO FULL HP"),
                new MenuItem("SURGEON", "#8fdcff", 0, () => MendWorst(9), "HEAL EVERY", "OPEN WOUND"),
                AnyCut() ? new MenuItem("SMITH", "#c8d0dc", 0, () => Inj.FitIron(), "IRON FOR EVERY", "LOST LIMB")
                         : new MenuItem("BLESSING", "#ffd166", 0, () => RandomEnchUp(), "A RANDOM ENCHANT", "GAINS A LEVEL"),
            };
            foreach (var it in items) it.after = () => GoNextFloor("fight");
            Open("sanct", "SANCTUARY", "TAKE ONE BLESSING", items);
        }

        public static void Pick(int i)
        {
            var m = menu;
            if (m == null || m.picked >= 0 || m.t < 0.15f || i < 0 || i >= m.items.Count) return;
            var it = m.items[i];
            if (it.sold) return;
            if (it.cost > 0 && shards < it.cost) { m.deny = i; m.denyT = 0.3f; W.Sfx("armor", 0.7f); return; }
            if (it.cost > 0)
            {
                shards -= it.cost; it.sold = true; W.Sfx("pickup", 0.7f); W.Sfx("chargeFull", 1.2f, 0.05f, 0.6f);
                W.RingFx(W.player.Center, 2, 24, 2, 0.3f, "gold"); it.act(); Inj.Mod = Inj.Calc();
                return;
            }
            m.picked = i; m.t = 0f;
            W.Sfx("chargeFull"); W.RingFx(W.player.Center, 2, 30, 2, 0.35f, "gold");
        }

        public static void UpdateMenu(float rdt)
        {
            var m = menu; if (m == null) return;
            m.t += rdt; if (m.denyT > 0f) m.denyT -= rdt;
            if (m.picked >= 0 && m.t > 0.45f) { var it = m.items[m.picked]; it.act(); if (it.after != null && menu == m) it.after(); }
        }

        public static Rect MenuRect(int i, int n)
        {
            float w = n > 3 ? 58f : 92f, gap = n > 3 ? 4f : 8f, x0 = Art.VW / 2f - (n * w + (n - 1) * gap) / 2f;
            return new Rect(x0 + i * (w + gap), 48f, w, n > 3 ? 92f : 84f);
        }

        public static void Update(float dt)
        {
            if (shardFlash > 0f) shardFlash -= dt;
            for (int i = beams.Count - 1; i >= 0; i--) { var b = beams[i]; b.life -= dt; if (b.life <= 0f || !b.a.alive || !b.b.alive) beams.RemoveAt(i); }
        }

        // ---------------------------------------------------------------- results + permanent unlocks
        public static readonly int[] UnlockAt = { 15, 40, 80, 150 };
        public static readonly string[] UnlockName = { "START WITH 25 SHARDS", "START WITH A SILVER AUGMENT", "START WITH AN ENCHANT", "START WITH A GOLD AUGMENT" };
        public static int embers, best, runs;
        static bool metaLoaded;
        const string Key = "ashblade_meta_v1";

        public static void LoadMeta()
        {
            if (metaLoaded) return;
            metaLoaded = true;
            embers = PlayerPrefs.GetInt(Key + "_embers", 0); best = PlayerPrefs.GetInt(Key + "_best", 0); runs = PlayerPrefs.GetInt(Key + "_runs", 0);
        }
        public static void SaveMeta()
        {
            PlayerPrefs.SetInt(Key + "_embers", embers); PlayerPrefs.SetInt(Key + "_best", best); PlayerPrefs.SetInt(Key + "_runs", runs); PlayerPrefs.Save();
        }
        public static void ResetMeta() { embers = best = runs = 0; SaveMeta(); }

        public static void ApplyMetaStart()
        {
            LoadMeta();
            if (embers >= 15) shards += 25;
            if (embers >= 40) GiveAug("silver");
            if (embers >= 80) { int k = Random.Range(0, Ench.Count); Ench.lv[Ench.Basic, k] = Mathf.Max(Ench.lv[Ench.Basic, k], 1); }
            if (embers >= 150) GiveAug("gold");
            Inj.Mod = Inj.Calc();
        }

        public static void EndRun()
        {
            LoadMeta();
            int gain = W.waveN * 3 + W.kills / 5 + bossKills * 10, before = embers;
            embers += gain; best = Mathf.Max(best, W.waveN); runs++;
            SaveMeta();
            results = new RunResults { floor = W.waveN, kills = W.kills, combo = W.bestCombo, boss = bossKills, limbs = limbsLost, augs = Aug.owned.Count, shards = shards, gain = gain, total = embers };
            for (int i = 0; i < UnlockAt.Length; i++) if (before < UnlockAt[i] && embers >= UnlockAt[i]) results.fresh.Add(i);
        }
    }
}
