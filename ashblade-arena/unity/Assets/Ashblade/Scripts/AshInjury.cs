using System.Collections.Generic;
using UnityEngine;

namespace Ashblade
{
    /// <summary>Every gameplay multiplier that wounds and augments put on the player. Rebuilt each frame.</summary>
    public class Mods
    {
        public float atk = 1f, dmg = 1f, charge = 1f, meter = 1f, move = 1f, dash = 1f, dashCdMul = 1f, dashCd, assist = 1f, buffer = 1f, bleed;
        public bool noSpin;
        public int grip; // 0 = sword hand, 1 = off hand, 2 = in the teeth
    }

    /// <summary>
    /// Body-part wounds. Each hit lands on a part (weighted by who hit you) and builds wound points there.
    /// Parts go cut, broken, severed (head and body stop at 2). Penalties come from the level; a severed limb stays
    /// gone unless the Iron Limbs augment rebuilds it. Clearing a floor patches the worst open wound by one level.
    /// </summary>
    public static class Inj
    {
        public const int Head = 0, Torso = 1, ArmS = 2, ArmO = 3, Legs = 4, Count = 5;
        public static bool enabled = true;
        public static readonly string[] Name = { "HEAD", "BODY", "SWORD ARM", "OFF ARM", "LEG" };
        public static readonly string[] Ko = { "Head", "Body", "Sword arm", "Off arm", "Leg" };
        public static readonly int[] Max = { 2, 2, 3, 3, 3 };
        static readonly float[][] Th = { new[] { 10f, 26f }, new[] { 12f, 30f }, new[] { 10f, 24f, 40f }, new[] { 10f, 24f, 40f }, new[] { 10f, 24f, 40f } };
        public static readonly string[][] St =
        {
            new[] { "", "DAZED", "CONCUSSED" }, new[] { "", "GASHED", "PIERCED" },
            new[] { "", "CUT", "BROKEN", "SEVERED" }, new[] { "", "CUT", "BROKEN", "SEVERED" }, new[] { "", "CUT", "BROKEN", "SEVERED" },
        };
        // hit weights per attacker: head, torso, sword arm, off arm, legs
        static readonly float[] WGrunt = { 10, 20, 30, 25, 15 }, WWisp = { 30, 35, 12, 13, 10 }, WBrute = { 15, 25, 10, 10, 40 };
        // sprite-space anchors (32x30 cell, feet on row 29)
        public static readonly Vector2Int[] At = { new Vector2Int(19, 15), new Vector2Int(16, 23), new Vector2Int(21, 22), new Vector2Int(11, 22), new Vector2Int(14, 28) };

        public static readonly int[] lv = new int[Count];
        public static readonly float[] pts = new float[Count], flash = new float[Count];
        public static readonly bool[] iron = new bool[Count];
        public static float bleedT, dripT, trailT, hpAcc;
        public static Mods Mod = new Mods();

        static AshTuning T { get { return AshTuning.I; } }

        public static void Reset()
        {
            for (int k = 0; k < Count; k++) { lv[k] = 0; pts[k] = 0f; flash[k] = 0f; iron[k] = false; }
            bleedT = hpAcc = 0f; Mod = Calc();
        }
        public static bool Severed(int k) { return lv[k] >= 3 && !iron[k]; }
        public static int Eff(int k) { return iron[k] ? 1 : lv[k]; }
        public static int WoundTotal() { int n = 0; for (int k = 0; k < Count; k++) n += Eff(k); return n; }
        static int Cap(int k) { return Aug.Has("unbreakable") && Max[k] == 3 ? 2 : Max[k]; }

        static readonly float[] AtkS = { 1f, 0.88f, 0.76f, 0.62f }, DmgS = { 1f, 1f, 0.85f, 0.7f }, ChargeO = { 1f, 1.25f, 1.6f, 1f }, MeterO = { 1f, 1f, 0.8f, 0.6f };
        static readonly float[] MoveL = { 1f, 0.88f, 0.72f, 0.5f }, DashL = { 1f, 1f, 0.8f, 0.55f }, DashCdL = { 0f, 0f, 0.12f, 0.35f };
        static readonly float[] AssistH = { 1f, 0.5f, 0f }, BufferH = { 1f, 1f, 0.5f }, BleedT = { 0f, 0.6f, 1.4f };

        public static Mods Calc()
        {
            var m = new Mods();
            if (enabled)
            {
                int s = Eff(ArmS), o = Eff(ArmO), l = Eff(Legs), hd = Eff(Head), t = Eff(Torso);
                m.atk *= AtkS[s]; m.dmg *= DmgS[s];
                m.charge *= ChargeO[o]; m.meter *= MeterO[o];
                if (Severed(ArmO)) m.noSpin = true;
                if (Severed(ArmS) && Severed(ArmO)) { m.grip = 2; m.atk = 0.55f; m.dmg = 0.45f; m.noSpin = true; }
                else if (Severed(ArmS)) m.grip = 1;
                m.move *= MoveL[l]; m.dash *= DashL[l]; m.dashCd += DashCdL[l];
                m.assist = AssistH[hd]; m.buffer = BufferH[hd];
                m.bleed = BleedT[t] + (bleedT > 0f ? 2.5f : 0f);
            }
            if (Aug.Has("whetstone")) m.dmg *= 1.15f;
            if (Aug.Has("bloodrage")) m.dmg *= 1f + 0.06f * WoundTotal();
            if (Aug.Has("fleet")) { m.move *= 1.12f; m.dashCdMul *= 0.6f; }
            if (Aug.Has("emberhoard")) m.meter *= 1.4f;
            if (Aug.Has("frenzy")) m.atk *= 1.35f;
            if (Aug.Has("adrenaline") && W.player != null && W.player.hp / W.player.maxHp < 0.4f) m.atk *= 1.3f;
            if (Aug.Has("tourniquet")) m.bleed = 0f;
            return m;
        }

        /// <summary>Penalty lines for the HUD, as (text, hex colour).</summary>
        public static List<KeyValuePair<string, string>> PenaltyLines()
        {
            var o = new List<KeyValuePair<string, string>>();
            System.Func<float, int> pct = v => Mathf.RoundToInt((v - 1f) * 100f);
            System.Action<string, string> add = (s, c) => o.Add(new KeyValuePair<string, string>(s, c));
            if (Mod.atk < 0.995f) add("ATK SPD " + pct(Mod.atk) + "%", "#ffb070");
            if (Mod.dmg < 0.995f) add("DMG " + pct(Mod.dmg) + "%", "#ffb070");
            if (Mod.grip == 1) add("OFF HAND GRIP", "#ff8a7a");
            if (Mod.grip == 2) add("BLADE IN TEETH", "#ff6a6a");
            if (Mod.noSpin) add("NO SPIN", "#ff8a7a");
            else if (Mod.charge > 1.01f) add("CHARGE +" + pct(Mod.charge) + "%", "#ffb070");
            if (Mod.move < 0.995f) add("MOVE " + pct(Mod.move) + "%", "#ffb070");
            if (Mod.assist < 1f) add(Mod.assist > 0f ? "AIM BLUR" : "NO AIM ASSIST", "#c8a0ff");
            if (Run.StumpArm) add("+SHOULDER CHARGE", "#8be3a6");
            if (Run.StumpLeg) add("+HOP SLAM", "#8be3a6");
            if (Mod.bleed > 0f) add(Aug.Has("hemomancy") ? "BLOOD HEALS" : "BLEEDING", Aug.Has("hemomancy") ? "#ff8af0" : "#ff4a5a");
            return o;
        }

        public static Vector2 PartWorld(int k)
        {
            var p = W.player; var a = At[k];
            float dx = (a.x - 16) * (p.flip ? -1f : 1f);
            return new Vector2(p.pos.x + dx / Art.PPU, p.pos.y + (29 - a.y) / (float)Art.PPU + p.z / Art.PPU);
        }
        static void Spray(Vector2 pt, Vector2 dir, int n, float speed = 7f) { W.Sparks(pt, dir, n, speed, 110, "blood", 1.3f, 4f, 16f); }
        static readonly Color32[] Blood = { Col.H("#7a0a14"), Col.H("#b0141e"), Col.H("#4a0610") };
        static readonly Color32[] BloodBig = { Col.H("#7a0a14"), Col.H("#b0141e"), Col.H("#4a0610"), Col.H("#e8303c") };

        public static void Hit(Combatant src, Vector2 dir, float dmg)
        {
            if (!enabled || dmg <= 0f) return;
            var en = src as Enemy;
            float[] w = en == null ? WWisp : en.kind == EnemyKind.Brute || en.kind == EnemyKind.Boss || en.kind == EnemyKind.Bomber ? WBrute : en.kind == EnemyKind.Wisp ? WWisp : WGrunt;
            float tot = 0f; foreach (float x in w) tot += x;
            float r = Random.value * tot; int k = 0;
            for (int i = 0; i < Count; i++) { r -= w[i]; if (r <= 0f) { k = i; break; } }
            if (iron[k])
            {
                W.Sparks(PartWorld(k), -dir, 10, 9, 140, "steel"); W.Sfx("deflect", 0.7f, 0.05f, 0.6f);
                W.PopText(W.player.pos.x, W.player.pos.y + 1.5f, "CLANG", "#c8d0dc", 1, false, 20, 0, 70, 0.6f);
                return;
            }
            if (lv[k] >= Cap(k))
            {
                var open = new List<int>();
                for (int i = 0; i < Count; i++) if (!iron[i] && lv[i] < Cap(i)) open.Add(i);
                if (open.Count == 0) return;
                k = open[Random.Range(0, open.Count)];
            }
            pts[k] += dmg * (Aug.Has("thickskin") ? 0.65f : 1f) * M.Rand(0.85f, 1.2f);
            if (en != null && en.K.fracture && Cap(k) >= 2) pts[k] = Mathf.Max(pts[k], Th[k][1] + 0.01f); // boss blows always break bone
            int nl = 0; foreach (float t in Th[k]) if (pts[k] >= t) nl++;
            nl = Mathf.Min(nl, Cap(k));
            if (nl >= Cap(k)) pts[k] = Mathf.Min(pts[k], Th[k][Cap(k) - 1] + 0.01f);
            Spray(PartWorld(k), -dir, 6);
            if (nl > lv[k]) LevelUp(k, nl, dir);
        }

        public static void SetPtsToLevel(int k) { pts[k] = lv[k] > 0 ? Th[k][lv[k] - 1] : 0f; }

        public static void Force(int k)
        {
            if (lv[k] >= Max[k]) return;
            pts[k] = Th[k][lv[k]] + 0.01f;
            LevelUp(k, lv[k] + 1, new Vector2(W.player.flip ? 1f : -1f, 0f));
        }

        static void LevelUp(int k, int nl, Vector2 dir)
        {
            var p = W.player;
            lv[k] = nl; flash[k] = 0.8f; Mod = Calc();
            var at = PartWorld(k);
            if (nl >= 3) { Sever(k, dir); return; }
            bool heavy = nl >= 2;
            Spray(at, -dir, heavy ? 22 : 10, heavy ? 10f : 7f);
            W.Splat(p.pos, Blood, heavy ? 1f : 0.6f);
            W.PopText(p.pos.x, p.pos.y + 1.9f, Name[k] + " " + St[k][nl], heavy ? "#ff6a5a" : "#ffb070", heavy ? 2 : 1, false, 28, 0, 70, 1.3f, 90, 1.6f);
            if (heavy)
            {
                W.Sfx("break", 0.75f, 0.05f, 0.9f); W.Slowmo(0.3f, 0.2f); W.AddShake(0.4f, dir, 4); W.Chroma(0.8f, dir);
                if (k == Head) { W.RingFx(at, 2, 18, 1, 0.4f, "steel"); W.ScreenFlash(Color.white, 0.4f, 0.3f); }
            }
            else W.Sfx("slam", 1.8f, 0.05f, 0.45f);
        }

        static void Sever(int k, Vector2 dir)
        {
            var p = W.player; var at = PartWorld(k);
            W.Slowmo(0.18f, 0.7f); W.ZoomPunch(0.12f); W.hold = 0.5f; W.holdAt = at;
            W.ImpactFrame(p.Center, 0.09f, p); W.Chroma(1.4f, dir); W.ScreenFlash(new Color(0.69f, 0f, 0.09f), 0.5f, 0.3f); W.AddShake(0.9f, dir, 6); W.Rumble(1f, 1f, 400);
            W.Sfx("break", 0.55f, 0.05f, 1f); W.Sfx("kill", 0.6f, 0.05f, 0.9f);
            Spray(at, -dir, 40, 13f); Spray(at, Vector2.up, 16, 9f);
            for (int i = 0; i < 3; i++) W.Splat(p.pos + new Vector2(M.Rand(-0.6f, 0.6f), M.Rand(-0.4f, 0.4f)), BloodBig, 1.2f);
            Vector2 away = M.Norm(-dir + new Vector2(M.Rand(-0.4f, 0.4f), M.Rand(-0.2f, 0.4f)));
            W.PF(new Part { type = PT.Limb, spr = k == Legs ? LimbLeg.spr : LimbArm.spr, limb = k == Legs ? LimbLeg : LimbArm, x = at.x, y = at.y - 0.5f, z = 10f, vx = away.x * 6f, vy = away.y * 6f, vz = 150f, spin = M.Rand(10f, 18f) * (Random.value < 0.5f ? -1f : 1f), life = 30f, max = 30f });
            bleedT = 6f;
            Run.limbsLost++;
            string sub = k == ArmS ? (Severed(ArmO) ? "NO ARMS LEFT: BLADE IN TEETH" : "OFF HAND GRIP. NEW: SHOULDER CHARGE") : k == ArmO ? "NO SPIN. NEW: SHOULDER CHARGE" : "MOVE HALVED. NEW: HOP SLAM AFTER DASH";
            W.Banner(Name[k] + " SEVERED", Col.H("#ff3a4a"), 1.8f, sub);
            if (Aug.Has("ironlimbs")) W.PopText(p.pos.x, p.pos.y + 2.2f, "IRON LIMB AT FLOOR CLEAR", "#c8d0dc", 1, false, 34, 0, 70, 1.6f, 40);
        }

        public static int FitIron()
        {
            int n = 0;
            for (int k = ArmS; k <= Legs; k++) if (Severed(k)) { iron[k] = true; flash[k] = 1f; n++; }
            if (n > 0)
            {
                var p = W.player;
                W.RingFx(p.Center, 3, 28, 2, 0.35f, "steel"); W.Sparks(p.Center, Vector2.up, 24, 11, 360, "steel");
                W.Sfx("break", 1.6f, 0.05f, 0.7f); W.Sfx("chargeFull", 0.7f);
                W.PopText(p.pos.x, p.pos.y + 1.9f, n > 1 ? "IRON LIMBS FITTED" : "IRON LIMB FITTED", "#e8eef8", 1, false, 30, 0, 70, 1.4f, 60);
            }
            return n;
        }

        public static void FloorHeal()
        {
            var open = new List<int>();
            for (int k = 0; k < Count; k++) if (lv[k] > 0 && lv[k] < 3) open.Add(k);
            open.Sort((a, b) => lv[b].CompareTo(lv[a]));
            bool medic = Aug.Has("medic");
            int healed = 0;
            foreach (int k in open)
            {
                int to = medic ? 0 : lv[k] - 1;
                lv[k] = to; pts[k] = to > 0 ? Th[k][to - 1] : 0f; flash[k] = 0.6f; healed++;
                if (!medic) break;
            }
            bleedT = 0f;
            if (Aug.Has("ironlimbs")) FitIron();
            if (healed > 0) W.PopText(W.player.pos.x, W.player.pos.y + 2.2f, medic ? "WOUNDS TENDED" : "WOUND TENDED", "#8be3a6", 1, false, 30, 0, 70, 1.2f);
            Mod = Calc();
        }

        public static void Update(float dt)
        {
            var p = W.player;
            Mod = Calc();
            for (int k = 0; k < Count; k++) if (flash[k] > 0f) flash[k] -= dt;
            if (bleedT > 0f) bleedT -= dt;
            if (p.state == "Dead") return;
            if (Aug.Has("ashheart") && p.meter < 100f) W.GainMeter(6f * dt / Mod.meter);
            if (Mod.bleed > 0f)
            {
                hpAcc += Mod.bleed * dt;
                if (hpAcc >= 1f)
                {
                    int n = Mathf.FloorToInt(hpAcc); hpAcc -= n;
                    if (Aug.Has("hemomancy")) p.hp = Mathf.Min(p.maxHp, p.hp + n);
                    else if (!T.god) p.hp = Mathf.Max(1f, p.hp - n);
                }
            }
            dripT -= dt;
            if (dripT <= 0f)
            {
                dripT = 0.12f;
                for (int k = 0; k < Count; k++)
                {
                    if (lv[k] == 0 || iron[k]) continue;
                    float chance = lv[k] >= 3 ? (bleedT > 0f ? 1f : 0.35f) : lv[k] * 0.12f;
                    if (Random.value >= chance) continue;
                    var at = PartWorld(k);
                    if (lv[k] >= 3 && bleedT > 0f) W.Sparks(at, new Vector2(p.flip ? 1f : -1f, 0.6f), 3, 5, 60, "blood", 1f, 2f, 18f);
                    else W.P(new Part { type = PT.Spark, x = at.x + M.Rand(-0.05f, 0.05f), y = at.y, vy = -0.4f, life = 0.35f, max = 0.35f, drag = 1f, g = 8f, ramp = "blood" });
                }
            }
            bool moving = p.vel.magnitude > 1f && p.state != "Dash";
            trailT -= dt;
            if (moving && trailT <= 0f && ((lv[Legs] >= 2 && !iron[Legs]) || (Mod.bleed > 0f && !Aug.Has("hemomancy"))))
            {
                trailT = 0.22f;
                if (T.decals)
                {
                    int x, y; Art.DecalPos(p.pos.x + M.Rand(-0.1f, 0.1f), p.pos.y, out x, out y);
                    Art.Decals.Rect(x, y, Random.value < 0.4f ? 2 : 1, 1, Random.value < 0.5f ? Blood[0] : Blood[2], 0.7f); Art.DecalsDirty = true;
                }
            }
        }

        // ------------------------------------------------------------ limbs flying off
        public class LimbArt { public Spr spr; public Color32[,] px; public int w, h; }
        static LimbArt limbArm, limbLeg;
        public static LimbArt LimbArm { get { if (limbArm == null) limbArm = MakeLimb(new[] { "bBcccCh", "bBcCccc" }, "b", "#7a0a14", "B", "#e8303c", "c", "#2a2436", "C", "#c8323c", "h", "#f0c8a0"); return limbArm; } }
        public static LimbArt LimbLeg { get { if (limbLeg == null) limbLeg = MakeLimb(new[] { "bBccgg..", "bBccgggg" }, "b", "#7a0a14", "B", "#e8303c", "c", "#2a2436", "g", "#8a8aa0"); return limbLeg; } }
        static LimbArt MakeLimb(string[] rows, params string[] kv)
        {
            var pal = new Dictionary<char, Color32>();
            for (int i = 0; i < kv.Length; i += 2) pal[kv[i][0]] = M.Hex(kv[i + 1]);
            var spr = Art.FromRows(rows, pal);
            int w = rows[0].Length, h = rows.Length;
            var px = new Color32[w, h];
            for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) { Color32 c; if (rows[y][x] != '.' && pal.TryGetValue(rows[y][x], out c)) px[x, y] = c; }
            return new LimbArt { spr = spr, px = px, w = w, h = h };
        }

        public static void UpdateLimb(Part p, float dt)
        {
            if (p.landed) return;
            p.vz -= 520f * dt; p.z += p.vz * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
            p.bloodT -= dt;
            if (p.bloodT <= 0f) { p.bloodT = 0.03f; W.P(new Part { type = PT.Spark, x = p.x, y = p.y + p.z / Art.PPU, vx = M.Rand(-0.5f, 0.5f), vy = M.Rand(-0.5f, 0.5f), life = 0.4f, max = 0.4f, drag = 2f, g = 10f, ramp = "blood" }); }
            if (p.z > 0f) return;
            p.z = 0f;
            if (p.vz < -60f) { p.vz *= -0.35f; p.vx *= 0.55f; p.vy *= 0.55f; p.spin *= 0.5f; W.Splat(new Vector2(p.x, p.y), Blood, 0.7f); W.Sfx("step", 0.6f, 0.05f, 0.6f); return; }
            p.landed = true;
            int q = ((Mathf.RoundToInt(p.rot / (Mathf.PI / 2f)) % 4) + 4) % 4;
            p.rot = q * Mathf.PI / 2f;
            W.Splat(new Vector2(p.x, p.y), Blood, 1f);
            if (!T.decals || p.limb == null) return;
            int dx0, dy0; Art.DecalPos(p.x, p.y, out dx0, out dy0);
            var L = p.limb;
            for (int y = 0; y < L.h; y++)
                for (int x = 0; x < L.w; x++)
                {
                    var c = L.px[x, y]; if (c.a == 0) continue;
                    int lx = x - L.w / 2, ly = y - L.h / 2, rx = lx, ry = ly;
                    if (q == 1) { rx = -ly; ry = lx; } else if (q == 2) { rx = -lx; ry = -ly; } else if (q == 3) { rx = ly; ry = -lx; }
                    Art.Decals.Set(dx0 + rx, dy0 + ry, c);
                }
            Art.DecalsDirty = true;
            p.life = 0f;
        }
    }

    public class AugDef { public string id, tier, name, ko; public string[] d; }

    /// <summary>
    /// Augments: every 5th floor you pick 1 of 3 cards of one tier (silver, gold, prismatic). Each card can be
    /// rerolled once. Time stops while you choose.
    /// </summary>
    public static class Aug
    {
        public static bool enabled = true;
        public static readonly List<string> owned = new List<string>();
        public static readonly List<AugDef> offer = new List<AugDef>();
        public static string tier = "silver", resume;
        public static float t;
        public static int picked = -1;
        public static readonly bool[] rerolls = new bool[3];
        public static readonly float[] spin = new float[3];
        public static bool undyingUsed;

        static AugDef A(string id, string tier, string name, string ko, params string[] d) { return new AugDef { id = id, tier = tier, name = name, ko = ko, d = d }; }
        public static readonly AugDef[] All =
        {
            A("ironhide", "silver", "IRON HIDE", "Max HP +30 and heal 30", "MAX HP +30", "AND HEAL 30"),
            A("whetstone", "silver", "WHETSTONE", "All damage +15%", "ALL DAMAGE +15%"),
            A("fleet", "silver", "FLEET FOOT", "Move speed +12%, dash cooldown -40%", "MOVE SPEED +12%", "DASH COOLDOWN -40%"),
            A("tourniquet", "silver", "TOURNIQUET", "Bleeding no longer costs HP", "YOU NO LONGER", "LOSE HP TO BLEEDING"),
            A("thickskin", "silver", "THICK SKIN", "Wounds build up 35% slower", "WOUNDS BUILD UP", "35% SLOWER"),
            A("emberhoard", "silver", "EMBER HOARD", "Burst gauge gain +40%", "BURST GAUGE", "FILLS 40% FASTER"),
            A("medic", "silver", "FIELD MEDIC", "Every floor clear heals all open wounds (not severed limbs)", "FLOOR CLEAR HEALS", "EVERY OPEN WOUND"),
            A("ironlimbs", "gold", "IRON LIMBS", "Severed limbs come back as iron (light wound penalties only)", "LOST LIMBS COME", "BACK AS IRON"),
            A("bloodrage", "gold", "BLOOD RAGE", "+6% damage per wound level", "+6% DAMAGE PER", "WOUND LEVEL"),
            A("executioner", "gold", "EXECUTIONER", "Hits finish enemies under 15% HP", "HITS FINISH FOES", "UNDER 15% HP"),
            A("leech", "gold", "LEECH EDGE", "Every kill heals 3 HP", "EVERY KILL", "HEALS 3 HP"),
            A("twindash", "gold", "TWIN DASH", "Two dash charges", "DASH TWICE", "IN A ROW"),
            A("spite", "gold", "SPITE", "Getting hit blasts nearby enemies (20 damage)", "GETTING HIT", "BLASTS FOES AWAY"),
            A("adrenaline", "gold", "ADRENALINE", "Under 40% HP: attack speed +30%", "UNDER 40% HP", "ATTACK SPEED +30%"),
            A("undying", "prism", "UNDYING", "Survive a lethal hit at 1 HP, once every 5 floors", "CHEAT DEATH ONCE", "EVERY 5 FLOORS"),
            A("frenzy", "prism", "FRENZY", "Attack speed +35%", "ATTACK SPEED +35%"),
            A("hemomancy", "prism", "HEMOMANCY", "Bleeding heals you instead of hurting", "BLEEDING HEALS", "INSTEAD OF HURTING"),
            A("ashheart", "prism", "ASH HEART", "Burst gauge fills by itself, burst damage +50%", "GAUGE FILLS ITSELF", "BURST DAMAGE +50%"),
            A("arcana", "prism", "ARCANA", "+1 level to 3 random enchants", "+1 LEVEL TO 3", "RANDOM ENCHANTS"),
            A("unbreakable", "prism", "UNBREAKABLE", "Limbs can break but are never severed", "LIMBS CAN BREAK", "BUT NEVER SEVER"),
        };
        public static AugDef Get(string id) { foreach (var a in All) if (a.id == id) return a; return null; }
        public static bool Has(string id) { return owned.Contains(id); }
        public static bool Offering { get { return offer.Count > 0; } }
        public static bool Choosing { get { return W.waveState == "augment" && Offering && picked < 0; } }

        public static string TierName(string t) { return t == "prism" ? "PRISMATIC" : t == "gold" ? "GOLD" : "SILVER"; }
        public static string TierHex(string t) { return t == "prism" ? "#ff9af0" : t == "gold" ? "#ffd166" : "#d8e0ec"; }
        public static string TierDeep(string t) { return t == "prism" ? "#4a2a6a" : t == "gold" ? "#8a5a10" : "#5a6478"; }
        public static string TierRamp(string t) { return t == "prism" ? "violet" : t == "gold" ? "gold" : "steel"; }

        public static void Reset() { owned.Clear(); offer.Clear(); undyingUsed = false; resume = null; picked = -1; }

        static string RollTier()
        {
            int f = W.waveN; float r = Random.value;
            float s = f <= 5 ? 0.55f : f <= 10 ? 0.3f : 0.15f, g = f <= 5 ? 0.92f : f <= 10 ? 0.8f : 0.65f;
            return r < s ? "silver" : r < g ? "gold" : "prism";
        }
        public static AugDef RollOne(string tr, List<AugDef> exclude)
        {
            var pool = new List<AugDef>();
            foreach (var a in All) if (a.tier == tr && !Has(a.id) && !exclude.Contains(a)) pool.Add(a);
            if (pool.Count == 0) foreach (var a in All) if (!Has(a.id) && !exclude.Contains(a)) pool.Add(a);
            return pool.Count > 0 ? pool[Random.Range(0, pool.Count)] : null;
        }

        public static bool Offer(string resumeState = null)
        {
            string tr = RollTier();
            offer.Clear();
            for (int i = 0; i < 3; i++) { var a = RollOne(tr, offer); if (a != null) offer.Add(a); }
            if (offer.Count == 0) return false;
            tier = tr; t = -1.1f; picked = -1; undyingUsed = false; resume = resumeState;
            for (int i = 0; i < 3; i++) { rerolls[i] = true; spin[i] = 0f; }
            W.Sfx("grade", tr == "prism" ? 1.3f : tr == "gold" ? 1f : 0.8f, 0.05f, 0.9f);
            return true;
        }

        public static void Pick(int i)
        {
            if (i < 0 || i >= offer.Count || picked >= 0 || t < 0.2f) return;
            var a = offer[i];
            owned.Add(a.id); picked = i; t = 0f;
            Apply(a.id);
            Run.CheckSetUnlock(a.id);
            var p = W.player; string ramp = TierRamp(a.tier);
            W.Sfx("chargeFull"); W.Sfx("clear", 1.1f, 0.05f, 0.6f); W.Rumble(0.6f, 0.8f, 200);
            W.RingFx(p.Center, 3, 40, 3, 0.45f, ramp); W.RingFx(p.Center, 2, 26, 2, 0.35f, "gold"); W.Sparks(p.Center, Vector2.up, 30, 14, 360, ramp);
            W.ScreenFlash((Color)Col.H(TierHex(a.tier)), 0.25f, 0.18f);
            W.PopText(p.pos.x, p.pos.y + 2f, a.name, TierHex(a.tier), 2, false, 30, 0, 70, 1.4f, 80, 1.8f);
            Inj.Mod = Inj.Calc();
        }

        public static void Apply(string id)
        {
            var p = W.player;
            switch (id)
            {
                case "ironhide": p.maxHp += 30f; p.hp = Mathf.Min(p.maxHp, p.hp + 30f); break;
                case "medic": Inj.FloorHeal(); break;
                case "ironlimbs": Inj.FitIron(); break;
                case "arcana":
                {
                    var pool = new List<Vector2Int>();
                    for (int s = 0; s < 2; s++) for (int k = 0; k < Ench.Count; k++) if (Ench.lv[s, k] < 3) pool.Add(new Vector2Int(s, k));
                    for (int n = 0; n < 3 && pool.Count > 0; n++) { int j = Random.Range(0, pool.Count); var c = pool[j]; pool.RemoveAt(j); Ench.lv[c.x, c.y]++; }
                    break;
                }
            }
        }

        public static void Reroll(int i)
        {
            if (!Offering || picked >= 0 || t < 0.2f || i < 0 || i >= offer.Count || !rerolls[i]) return;
            var a = RollOne(tier, offer);
            if (a == null) return;
            offer[i] = a; rerolls[i] = false; spin[i] = 0.25f;
            W.Sfx("dash", 1.6f, 0.05f, 0.6f); W.Sfx("pickup", 0.8f, 0.05f, 0.5f);
        }

        public static void OpenNow()
        {
            if (Offering || W.player.state == "Dead") return;
            string prev = W.waveState;
            if (Offer(prev)) { W.waveState = "augment"; t = 0f; }
        }

        /// <summary>Runs while waveState is "augment"; returns true when the pick has played out.</summary>
        public static bool Update(float rdt)
        {
            for (int i = 0; i < 3; i++) if (spin[i] > 0f) spin[i] -= rdt;
            t += rdt;
            if (picked >= 0 && t > 0.8f) { offer.Clear(); return true; }
            return false;
        }

        public const float CardW = 96f, CardH = 84f;
        public static Rect CardRect(int i) { return new Rect(Art.VW / 2f - CardW * 1.5f - 8f + i * (CardW + 8f), 44f, CardW, CardH); }
        public static Rect RerollRect(int i) { var r = CardRect(i); return new Rect(r.x, r.y + r.height + 5f, r.width, 11f); }

        // ------------------------------------------------------------ effects that hook into combat
        static readonly Attack SpiteAtk = new Attack { name = "Spite", damage = 20f, knockback = 16f, hitstop = 5, shake = 0.3f, heavy = true, kind = AttackKind.Slash, range = 2.6f, arc = 360f };
        public static void SpiteBlast(Player p, Vector2 dir)
        {
            W.RingFx(p.pos, 3, 2.6f * Art.PPU, 3, 0.35f, "blood", 0.75f); W.Sparks(p.Center, Vector2.up, 18, 12, 360, "blood");
            W.Sfx("slam", 0.9f, 0.05f, 0.7f);
            foreach (var e in W.enemies.ToArray())
            {
                if (!e.Hittable) continue;
                Vector2 to = e.pos - p.pos; float d = to.magnitude;
                if (d > 2.6f + e.radius) continue;
                W.HitEnemy(e, SpiteAtk, d > 0.05f ? to / d : dir, null, false, e.Center, true);
            }
        }
        public static void UndyingSave(Player p)
        {
            undyingUsed = true; p.hp = 1f; p.hurtInvuln = 2f;
            W.Slowmo(0.15f, 0.9f); W.ZoomPunch(0.12f); W.ImpactFrame(p.Center, 0.1f, p); W.ScreenFlash((Color)Col.H("#ff9af0"), 0.5f, 0.3f);
            W.RingFx(p.Center, 3, 46, 3, 0.6f, "violet"); W.Sparks(p.Center, Vector2.up, 36, 14, 360, "violet");
            W.Sfx("perfect", 0.7f); W.Sfx("spawn", 1.2f); W.Rumble(1f, 1f, 400);
            W.Banner("UNDYING", Col.H("#ff9af0"), 1.6f, "DEATH REFUSED. NEXT SAVE IN 5 FLOORS");
        }
    }
}
