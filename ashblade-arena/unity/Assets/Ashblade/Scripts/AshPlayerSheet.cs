using System.Collections.Generic;
using UnityEngine;

namespace Ashblade
{
    /// <summary>
    /// The player sprite sheet (32x32 cells, feet at pixel 16,29, one row per motion), embedded as PNG bytes so the
    /// game still needs no imported assets. Pick() turns the player's state and timers into a frame.
    /// </summary>
    public static class PlayerSheet
    {
        const string Png = "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";

        static readonly string[] Names = { "idle", "run", "slash1", "slash2", "finisher", "dash", "dash_strike", "charge", "spin", "burst", "hurt", "death", "charge_walk", "dash_end", "perfect", "spawn", "victory" };
        static readonly int[] Counts = { 4, 6, 6, 6, 8, 4, 5, 6, 8, 7, 3, 7, 4, 2, 2, 6, 6 };
        static readonly Dictionary<string, Spr[]> anims = new Dictionary<string, Spr[]>();
        static readonly Dictionary<Spr, PixBuf> source = new Dictionary<Spr, PixBuf>();
        static readonly Dictionary<Spr, Dictionary<string, Spr>> masked = new Dictionary<Spr, Dictionary<string, Spr>>();
        public static bool Ready;

        public static void Init()
        {
            if (Ready) return;
            var tex = new Texture2D(2, 2, TextureFormat.RGBA32, false);
            if (!ImageConversion.LoadImage(tex, System.Convert.FromBase64String(Png))) return;
            Color32[] src = tex.GetPixels32();
            int TW = tex.width, TH = tex.height;
            const int CW = 32, CH = 30; // rows 30 and 31 of each cell are always empty
            var pivot = new Vector2(16f / CW, 1f / CH);
            for (int a = 0; a < Names.Length; a++)
            {
                var arr = new Spr[Counts[a]];
                for (int i = 0; i < arr.Length; i++)
                {
                    var b = new PixBuf(CW, CH); var wb = new PixBuf(CW, CH);
                    for (int y = 0; y < CH; y++)
                        for (int x = 0; x < CW; x++)
                        {
                            int sx = i * 32 + x, syDown = a * 32 + y;
                            Color32 c = src[(TH - 1 - syDown) * TW + sx];
                            if (c.a < 128) continue;
                            c.a = 255; b.Set(x, y, c); wb.Set(x, y, new Color32(255, 255, 255, 255));
                        }
                    arr[i] = new Spr { sprite = Art.Make(b.MakeTexture(), pivot), white = Art.Make(wb.MakeTexture(), pivot), w = CW, h = CH };
                    source[arr[i]] = b;
                }
                anims[Names[a]] = arr;
            }
            Object.Destroy(tex);
            Ready = true;
        }

        // attack frames split by phase as (frame, relative length); stretched to the attack's real startup / active / recovery
        static readonly int[][] S1 = { new[] { 0, 3 }, new[] { 1, 2 } }, A1 = { new[] { 2, 2 }, new[] { 3, 1 } }, R1 = { new[] { 4, 6 }, new[] { 5, 7 } };
        static readonly int[][] S2 = { new[] { 0, 2 }, new[] { 1, 2 } };
        static readonly int[][] SF = { new[] { 0, 4 }, new[] { 1, 3 }, new[] { 2, 3 } }, AF = { new[] { 3, 2 }, new[] { 4, 2 } }, RF = { new[] { 5, 10 }, new[] { 6, 8 }, new[] { 7, 6 } };
        static readonly int[][] SD = { new[] { 0, 2 } }, AD = { new[] { 1, 3 }, new[] { 2, 2 } }, RD = { new[] { 3, 7 }, new[] { 4, 7 } };
        static readonly int[][] SS = { new[] { 0, 3 } }, AS = { new[] { 1, 2 }, new[] { 2, 2 }, new[] { 3, 2 }, new[] { 4, 2 }, new[] { 5, 2 } }, RS = { new[] { 6, 9 }, new[] { 7, 9 } };

        static int Phase(int[][] list, float t, float len)
        {
            int tot = 0; foreach (var e in list) tot += e[1];
            float x = Mathf.Clamp(t / Mathf.Max(1e-4f, len), 0f, 0.9999f) * tot, acc = 0f;
            foreach (var e in list) { acc += e[1]; if (x < acc) return e[0]; }
            return list[list.Length - 1][0];
        }

        static int Seq(int n, float each, float f, bool loop) { return Seq(null, n, each, f, loop); }
        static int Seq(int[] durs, int n, float each, float f, bool loop)
        {
            int count = durs != null ? durs.Length : n;
            float tot = 0f; for (int i = 0; i < count; i++) tot += durs != null ? durs[i] : each;
            if (loop) f = ((f % tot) + tot) % tot;
            float acc = 0f;
            for (int i = 0; i < count; i++) { acc += durs != null ? durs[i] : each; if (f < acc) return i; }
            return count - 1;
        }

        static readonly int[] BurstDur = { 4, 6, 8, 4, 6, 5, 4 }, DashDur = { 2, 3, 3, 2 }, HurtDur = { 4, 4, 4 };

        static readonly Color32[] Steel = { M.Hex("#5a6478"), M.Hex("#8a94a8"), M.Hex("#c8d0dc"), M.Hex("#eef2f8") };
        static readonly Color32 StumpA = M.Hex("#e8303c"), StumpB = M.Hex("#b0141e"), StumpC = M.Hex("#7a0a14");

        /// <summary>
        /// The frame with severed limbs cut away (and a bloody stump) or rebuilt in iron. Key is one char per limb
        /// (sword arm, off arm, leg): '-' intact, 'x' severed, 'i' iron. Results are cached per frame and key.
        /// </summary>
        public static Spr Masked(Spr spr)
        {
            string key = "";
            for (int k = Inj.ArmS; k <= Inj.Legs; k++) key += Inj.lv[k] >= 3 ? (Inj.iron[k] ? "i" : "x") : "-";
            PixBuf src;
            if (key == "---" || spr == null || !source.TryGetValue(spr, out src)) return spr;
            Dictionary<string, Spr> cache;
            if (!masked.TryGetValue(spr, out cache)) { cache = new Dictionary<string, Spr>(); masked[spr] = cache; }
            Spr done;
            if (cache.TryGetValue(key, out done)) return done;
            int Wd = src.w, Hd = src.h;
            var b = new PixBuf(Wd, Hd);
            for (int y = 0; y < Hd; y++) for (int x = 0; x < Wd; x++) b.Set(x, y, src.Get(x, y));
            System.Func<int, int, bool> solid = (x, y) => x >= 0 && y >= 0 && x < Wd && y < Hd && b.Get(x, y).a > 0;
            int hs = 0, hn = 0;
            for (int y = 12; y <= 18; y++) for (int x = 0; x < Wd; x++) if (solid(x, y)) { hs += x; hn++; }
            int cx = hn > 0 ? Mathf.RoundToInt((float)hs / hn) : 16;
            System.Action<int, int, int, int, char, int[]> zone = (x0, x1, y0, y1, mode, stump) =>
            {
                for (int y = y0; y <= y1; y++)
                    for (int x = Mathf.Max(0, x0); x <= Mathf.Min(Wd - 1, x1); x++)
                    {
                        if (!solid(x, y)) continue;
                        if (mode == 'x') { b.Set(x, y, new Color32(0, 0, 0, 0)); continue; }
                        var c = b.Get(x, y); float l = (c.r * 0.3f + c.g * 0.55f + c.b * 0.15f) / 255f;
                        b.Set(x, y, l < 0.12f ? Art.Outline : Steel[Mathf.Min(3, Mathf.FloorToInt(l * 4.2f))]);
                    }
                if (mode != 'x') return;
                for (int i = 0; i < stump.Length; i += 2)
                {
                    int x = stump[i], y = stump[i + 1];
                    if (solid(x, y) || solid(x - 1, y) || solid(x + 1, y)) b.Set(x, y, i == 0 ? StumpA : i == 2 ? StumpB : StumpC);
                }
            };
            if (key[0] != '-') zone(cx + 4, Wd - 1, 19, 26, key[0], new[] { cx + 3, 21, cx + 3, 22, cx + 3, 23 });
            if (key[1] != '-') zone(0, cx - 5, 19, 26, key[1], new[] { cx - 4, 21, cx - 4, 22, cx - 4, 23 });
            if (key[2] != '-') zone(0, cx - 1, 27, Hd - 1, key[2], new[] { cx - 3, 26, cx - 2, 26, cx - 1, 26 });
            var wb = new PixBuf(Wd, Hd);
            for (int y = 0; y < Hd; y++) for (int x = 0; x < Wd; x++) if (b.Get(x, y).a > 0) wb.Set(x, y, new Color32(255, 255, 255, 255));
            var pivot = new Vector2(16f / Wd, 1f / Hd);
            done = new Spr { sprite = Art.Make(b.MakeTexture(), pivot), white = Art.Make(wb.MakeTexture(), pivot), w = Wd, h = Hd };
            cache[key] = done;
            return done;
        }

        /// <summary>Current frame of the player, or null if the sheet failed to load.</summary>
        public static Spr Pick(Player p)
        {
            if (!Ready) return null;
            string tag; int i;
            float f = p.stateTime * 60f;
            bool moving = p.vel.magnitude > 1f;
            if (p.state == "Dead") { tag = "death"; i = Seq(7, 4, p.deadT * 60f, false); }
            else if (p.state == "Burst") { tag = "burst"; i = Seq(BurstDur, 0, 0, f, false); }
            else if (p.state == "Attack" && p.cur != null)
            {
                var c = p.cur; float s = c.startup, a = s + c.active;
                int[][] ps, pa, pr;
                switch (p.comboIndex)
                {
                    case 1: tag = "slash2"; ps = S2; pa = A1; pr = R1; break;
                    case 2: tag = "finisher"; ps = SF; pa = AF; pr = RF; break;
                    case -1: tag = "dash_strike"; ps = SD; pa = AD; pr = RD; break;
                    case -2: tag = "spin"; ps = SS; pa = AS; pr = RS; break;
                    default: tag = "slash1"; ps = S1; pa = A1; pr = R1; break;
                }
                i = f < s ? Phase(ps, f, s) : f < a ? Phase(pa, f - s, c.active) : Phase(pr, f - a, c.recovery);
            }
            else if (p.perfectT > 0f) { tag = "perfect"; i = p.perfectT > 5f / 60f ? 0 : 1; }
            else if (p.state == "Dash") { tag = "dash"; i = Seq(DashDur, 0, 0, f, false); }
            else if (p.state == "Charge")
            {
                if (f < 8f) { tag = "charge"; i = f < 4f ? 0 : 1; }
                else if (moving) { tag = "charge_walk"; i = Seq(4, 6, p.runT * 60f, true); }
                else { tag = "charge"; i = 2 + Seq(4, 4, f - 8f, true); }
            }
            else if (p.hurtAnim > 0f) { tag = "hurt"; i = Seq(HurtDur, 0, 0, (12f / 60f - p.hurtAnim) * 60f, false); }
            else if (p.spawnAnim > 0f) { tag = "spawn"; i = Seq(6, 5, (30f / 60f - p.spawnAnim) * 60f, false); }
            else if (moving) { tag = "run"; i = Seq(6, 5, p.runT * 60f, true); }
            else if (p.dashEndT > 0f) { tag = "dash_end"; i = p.dashEndT > 3f / 60f ? 0 : 1; }
            else if (p.victoryAnim > 0f) { tag = "victory"; i = Seq(6, 6, (36f / 60f - p.victoryAnim) * 60f, false); }
            else { tag = "idle"; i = Seq(4, 11, W.realTime * 60f, true); }
            var arr = anims[tag];
            return arr[Mathf.Clamp(i, 0, arr.Length - 1)];
        }
    }
}
