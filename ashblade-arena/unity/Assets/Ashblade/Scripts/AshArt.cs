using System.Collections.Generic;
using UnityEngine;

namespace Ashblade
{
    /// <summary>A pixel sprite (pivot at the feet) and its white silhouette, used for flashes and tints.</summary>
    public class Spr
    {
        public Sprite sprite, white;
        public int w, h;
    }

    /// <summary>All placeholder art, made in code: characters, floor, decal layer, glow, vignette, shadows.</summary>
    public static class Art
    {
        public const float PPU = 16f;
        public const int VW = 320, VH = 180;
        public const float FloorX0 = -16f, FloorY0 = 11.5f;
        public const int FloorW = 32 * 16, FloorH = 21 * 16;
        public static readonly float[] Torches = { -11f, -4f, 4f, 11f };
        public static readonly Color32 Outline = new Color32(13, 8, 20, 255);

        public static Spr PlayerStand, PlayerRunA, PlayerRunB, Grunt, Wisp, Brute, Shield, ShieldBroken, Bomber, Healer, Boss;
        public static Sprite Floor, Glow, Vignette, RedVignette;
        public static PixBuf Decals;
        public static Texture2D DecalTex;
        public static Sprite DecalSprite;
        public static bool DecalsDirty;
        public static readonly Dictionary<int, Sprite> Shadows = new Dictionary<int, Sprite>();
        static bool ready;

        public static Sprite Make(Texture2D t, Vector2 pivot)
        {
            return Sprite.Create(t, new Rect(0, 0, t.width, t.height), pivot, PPU, 0, SpriteMeshType.FullRect);
        }

        static Dictionary<char, Color32> Pal(params string[] kv)
        {
            var d = new Dictionary<char, Color32>();
            for (int i = 0; i < kv.Length; i += 2) d[kv[i][0]] = M.Hex(kv[i + 1]);
            return d;
        }

        /// <summary>Rows top to bottom, '.' is empty. Adds a 1 px dark outline like the web build.</summary>
        public static Spr FromRows(string[] rows, Dictionary<char, Color32> pal)
        {
            int h = rows.Length, w = 0;
            foreach (string r in rows) w = Mathf.Max(w, r.Length);
            int W = w + 2, H = h + 2;
            var b = new PixBuf(W, H);
            var solid = new bool[W, H];
            for (int y = 0; y < h; y++)
                for (int x = 0; x < rows[y].Length; x++)
                {
                    Color32 c;
                    if (rows[y][x] != '.' && pal.TryGetValue(rows[y][x], out c)) { b.Set(x + 1, y + 1, c); solid[x + 1, y + 1] = true; }
                }
            var outline = new List<Vector2Int>();
            for (int y = 0; y < H; y++)
                for (int x = 0; x < W; x++)
                {
                    if (solid[x, y]) continue;
                    bool n = (x > 0 && solid[x - 1, y]) || (x < W - 1 && solid[x + 1, y]) || (y > 0 && solid[x, y - 1]) || (y < H - 1 && solid[x, y + 1]);
                    if (n) outline.Add(new Vector2Int(x, y));
                }
            foreach (var p in outline) b.Set(p.x, p.y, Outline);
            var wb = new PixBuf(W, H);
            for (int y = 0; y < H; y++)
                for (int x = 0; x < W; x++)
                    if (b.Get(x, y).a > 0) wb.Set(x, y, new Color32(255, 255, 255, 255));
            var pivot = new Vector2(Mathf.Floor(W / 2f) / W, 1f / H);
            return new Spr { sprite = Make(b.MakeTexture(), pivot), white = Make(wb.MakeTexture(), pivot), w = W, h = H };
        }

        static readonly string[] PBody =
        {
            "...hhhh...",
            "..hHHHHh..",
            ".hHHHHHHh.",
            ".hHHHssss.",
            ".hHHsssws.",
            ".hHHHssss.",
            "..rRRRRr..",
            ".cCRRRCCc.",
            ".cCCRCCCc.",
            ".cCCCCCCc.",
            "..cCCCCc..",
            "..bbBbbb..",
        };

        static string[] Concat(string[] a, string[] b)
        {
            var r = new string[a.Length + b.Length];
            a.CopyTo(r, 0); b.CopyTo(r, a.Length);
            return r;
        }

        public static void Init()
        {
            if (ready) return;
            ready = true;
            var pp = Pal("h", "#1d4660", "H", "#2f7aa0", "s", "#f4cfa6", "w", "#1a1020", "r", "#9c2236", "R", "#ec4a5a",
                "c", "#22345a", "C", "#3a5a8e", "b", "#5a3a22", "B", "#e8b84a", "d", "#2a2440", "o", "#4a3020");
            PlayerStand = FromRows(Concat(PBody, new[] { "..dd.dd...", "..dd.dd...", "..oo.oo..." }), pp);
            PlayerRunA = FromRows(Concat(PBody, new[] { ".dd...dd..", ".dd....dd.", ".oo....oo." }), pp);
            PlayerRunB = FromRows(Concat(PBody, new[] { "...ddd....", "...dd.d...", "...oo.o..." }), pp);

            Grunt = FromRows(new[]
            {
                "..o......o..",
                "..oo....oo..",
                "...rrrrrr...",
                "..rRRRRRRr..",
                ".rRRwRRwRRr.",
                ".rRRkRRkRRr.",
                ".rRRRRRRRRr.",
                ".rRRmmmmRRr.",
                "..rRRRRRRr..",
                "...rr..rr...",
            }, Pal("o", "#f0d0a0", "r", "#8a1e2e", "R", "#d4404a", "w", "#fff4e0", "k", "#2a0a10", "m", "#4a0a18"));
            Wisp = FromRows(new[]
            {
                "....yy....",
                "...yYYy...",
                "..yYPPYy..",
                "..PPPPPP..",
                ".PPwPPwPP.",
                ".PPkPPkPP.",
                ".PPPPPPPP.",
                "..PPPPPP..",
                "..pPPPPp..",
                "...pPPp...",
                "...p..p...",
                "....p.....",
            }, Pal("y", "#f2dcff", "Y", "#c08af0", "P", "#8a4ad0", "p", "#4e2a8a", "w", "#ffffff", "k", "#1a0830"));
            Brute = FromRows(new[]
            {
                ".....hhhhhhh......",
                "....hHHHHHHHh.....",
                "...hHHHHHHHHHh....",
                "...hHeeHHHeeHh....",
                "...hHHHHHHHHHh....",
                "..gghhhhhhhhhgg...",
                ".gGGGGGGGGGGGGGg..",
                "gGGGGgGGGGGgGGGGg.",
                "gGGGGgGGGGGgGGGGg.",
                "sSSgGGGGGGGGGGgSSs",
                "sSSsgGGGGGGGGgsSSs",
                ".ss..gGGGGGGGg.ss.",
                ".....gGGg.gGGg....",
                ".....gGGg.gGGg....",
                ".....ddd...ddd....",
            }, Pal("h", "#4a4a5a", "H", "#7a7a8c", "e", "#ff7a2a", "g", "#5a3a2a", "G", "#8a5a3a", "s", "#6a4a3a", "S", "#a07050", "d", "#2a1a14"));

            var shp = Pal("b", "#2a4a8a", "B", "#4a7ad0", "w", "#fff4e0", "k", "#0a1430", "m", "#102040", "S", "#c8d0dc", "s", "#7884a0");
            Shield = FromRows(new[] { "...bbbbbb...", "..bBBBBBBbSS", ".bBBwBBwBbSs", ".bBBkBBkBbSs", ".bBBBBBBBbSs", ".bBBmmmmBbSs", "..bBBBBBBbSS", "...bb..bb..." }, shp);
            ShieldBroken = FromRows(new[] { "...bbbbbb...", "..bBBBBBBb..", ".bBBwBBwBb..", ".bBBkBBkBb..", ".bBBBBBBBbs.", ".bBBmmmmBb..", "..bBBBBBBb..", "...bb..bb..." }, shp);
            Bomber = FromRows(new[] { "....f.....", "....y.....", "...rrrr...", "..rRRRRr..", ".rRwRRwRr.", ".rRkRRkRr.", ".rRRRRRRr.", "..rRRRRr..", "...r..r..." },
                Pal("f", "#ffffff", "y", "#ffe066", "r", "#8a3a10", "R", "#e87a2a", "w", "#fff4e0", "k", "#2a0a04"));
            Healer = FromRows(new[] { "....gg....", "...gGGg...", "..gGwwGg..", "..GGGGGG..", ".GGwGGwGG.", ".GGkGGkGG.", ".GGGGGGGG.", "..GG++GG..", "..gG++Gg..", "...g..g..." },
                Pal("g", "#2a7a3a", "G", "#5ad06a", "w", "#e0ffd0", "k", "#0a2a10", "+", "#ffffff"));
            Boss = FromRows(new[]
            {
                "......hh..........hh......",
                ".....hHh..........hHh.....",
                ".....hHHh........hHHh.....",
                "......hHHhhhhhhhhHHh......",
                ".......hHHHHHHHHHHh.......",
                "......hHHeeHHHHeeHHh......",
                "......hHHHHHHHHHHHHh......",
                "....ggghhhhhhhhhhhhggg....",
                "...gGGGGGGGGGGGGGGGGGGg...",
                "..gGGGGGGGgooooGGGGGGGGg..",
                ".sSSgGGGGGgoOOogGGGGGgSSs.",
                "sSSSsgGGGGgoOOogGGGGgsSSSs",
                "sSSSsgGGGGGgoogGGGGGgsSSSs",
                ".sSs.gGGGGGGGGGGGGGGg.sSs.",
                ".kk..gGGGGGGGGGGGGGGg..kk.",
                ".....gGGGGg....gGGGGg.....",
                ".....gGGGGg....gGGGGg.....",
                ".....dddddd....dddddd.....",
            }, Pal("h", "#4a4a5a", "H", "#8a8a9c", "e", "#ff5a2a", "g", "#3a2a2a", "G", "#6a3a2a", "o", "#c8321e", "O", "#ffb43c", "s", "#5a4a3a", "S", "#8a6a4a", "k", "#c8c8d8", "d", "#1a1014"));
            Shadows[28] = Ellipse(28, 9, new Color32(0, 0, 0, 115));
            Shadows[10] = Ellipse(10, 4, new Color32(0, 0, 0, 102));
            Shadows[12] = Ellipse(12, 5, new Color32(0, 0, 0, 102));
            Shadows[20] = Ellipse(20, 7, new Color32(0, 0, 0, 115));
            Shadows[6] = Ellipse(6, 3, new Color32(0, 0, 0, 90));

            Floor = Make(BuildFloor().MakeTexture(), new Vector2(0f, 1f));
            Decals = new PixBuf(FloorW, FloorH);
            DecalTex = Decals.MakeTexture();
            DecalSprite = Make(DecalTex, new Vector2(0f, 1f));

            var gb = new PixBuf(64, 64);
            for (int y = 0; y < 64; y++)
                for (int x = 0; x < 64; x++)
                {
                    float d = Mathf.Sqrt((x + 0.5f - 32f) * (x + 0.5f - 32f) + (y + 0.5f - 32f) * (y + 0.5f - 32f)) / 32f;
                    float a = d < 0.35f ? Mathf.Lerp(1f, 0.35f, d / 0.35f) : Mathf.Lerp(0.35f, 0f, Mathf.Clamp01((d - 0.35f) / 0.65f));
                    gb.Set(x, y, M.WithA(new Color32(255, 255, 255, 255), a));
                }
            Glow = Make(gb.MakeTexture(FilterMode.Bilinear), new Vector2(0.5f, 0.5f));
            Vignette = Make(VignetteBuf(new Color32(6, 3, 14, 255), 0.35f, 0.62f, 0.62f).MakeTexture(FilterMode.Bilinear), new Vector2(0f, 1f));
            RedVignette = Make(VignetteBuf(new Color32(200, 20, 40, 255), 0.3f, 0.6f, 0.75f).MakeTexture(FilterMode.Bilinear), new Vector2(0f, 1f));
        }

        static PixBuf VignetteBuf(Color32 c, float inner, float outer, float maxA)
        {
            var b = new PixBuf(VW, VH);
            float r0 = VH * inner, r1 = VW * outer;
            for (int y = 0; y < VH; y++)
                for (int x = 0; x < VW; x++)
                {
                    float d = Mathf.Sqrt((x - VW / 2f) * (x - VW / 2f) + (y - VH / 2f) * (y - VH / 2f));
                    b.Set(x, y, M.WithA(c, Mathf.Clamp01((d - r0) / (r1 - r0)) * maxA));
                }
            return b;
        }

        static Sprite Ellipse(int w, int h, Color32 c)
        {
            var b = new PixBuf(w, h);
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    float dx = (x + 0.5f - w / 2f) / (w / 2f), dy = (y + 0.5f - h / 2f) / (h / 2f);
                    if (dx * dx + dy * dy <= 1f) b.Set(x, y, c);
                }
            return Make(b.MakeTexture(), new Vector2(0f, 1f));
        }

        static PixBuf BuildFloor()
        {
            var g = new PixBuf(FloorW, FloorH);
            double seed = 11;
            System.Func<float> rnd = () => { seed = (seed * 16807) % 2147483647; return (float)(seed / 2147483647); };
            g.Clear(M.Hex("#0b0912"));
            int fx0 = 16, fx1 = 496, fy0 = 48, fy1 = 320;
            Color32 a1 = M.Hex("#2a2536"), a2 = M.Hex("#2d2839"), a3 = M.Hex("#282338"), hi = M.Hex("#363049"), lo = M.Hex("#1d1928");
            Color32 sp1 = M.Hex("#332e43"), sp2 = M.Hex("#221e2f"), crack = M.Hex("#1a1624"), moss = M.Hex("#2c4636");
            for (int ty = fy0; ty < fy1; ty += 16)
                for (int tx = fx0; tx < fx1; tx += 16)
                {
                    float v = rnd();
                    g.Rect(tx, ty, 16, 16, v < 0.5f ? a1 : v < 0.85f ? a2 : a3);
                    g.Rect(tx, ty, 15, 1, hi); g.Rect(tx, ty, 1, 15, hi);
                    g.Rect(tx, ty + 15, 16, 1, lo); g.Rect(tx + 15, ty, 1, 16, lo);
                    for (int k = 0; k < 4; k++) g.Set(tx + 1 + (int)(rnd() * 14), ty + 1 + (int)(rnd() * 14), sp1);
                    for (int k = 0; k < 3; k++) g.Set(tx + 1 + (int)(rnd() * 14), ty + 1 + (int)(rnd() * 14), sp2);
                    if (rnd() < 0.14f)
                    {
                        int x = tx + 3 + (int)(rnd() * 10), y = ty + 3 + (int)(rnd() * 10);
                        for (int k = 0; k < 6; k++) { g.Set(x, y, crack); x += rnd() < 0.5f ? 1 : 0; y += rnd() < 0.6f ? 1 : -1; }
                    }
                    if (rnd() < 0.06f) for (int k = 0; k < 5; k++) g.Set(tx + (int)(rnd() * 4), ty + 13 + (int)(rnd() * 3), moss);
                }
            float cx = 256, cy = 184;
            Color32 rune = M.Hex("#3a3250"), rune2 = M.Hex("#332c47");
            foreach (float R in new[] { 74f, 66f })
                for (float a = 0; a < M.TAU; a += 1f / R) g.Set(Mathf.RoundToInt(cx + Mathf.Cos(a) * R), Mathf.RoundToInt(cy + Mathf.Sin(a) * R), rune);
            for (int k = 0; k < 24; k++)
            {
                float a = k / 24f * M.TAU;
                for (int r = 67; r < 74; r++)
                    if (k % 2 == 0 || r % 2 == 0) g.Set(Mathf.RoundToInt(cx + Mathf.Cos(a) * r), Mathf.RoundToInt(cy + Mathf.Sin(a) * r), rune2);
            }
            for (int k = 0; k < 6; k++)
            {
                float a1r = k / 6f * M.TAU, a2r = (k + 2) / 6f * M.TAU;
                float x1 = cx + Mathf.Cos(a1r) * 64, y1 = cy + Mathf.Sin(a1r) * 64, x2 = cx + Mathf.Cos(a2r) * 64, y2 = cy + Mathf.Sin(a2r) * 64;
                for (float t = 0; t <= 1f; t += 1f / 120f) g.Set(Mathf.RoundToInt(Mathf.Lerp(x1, x2, t)), Mathf.RoundToInt(Mathf.Lerp(y1, y2, t)), rune);
            }
            g.Rect(0, 0, FloorW, 8, M.Hex("#14111c"));
            for (int row = 0; row < 5; row++)
            {
                int y = 8 + row * 8, off = row % 2 == 1 ? 8 : 0;
                for (int x = -off; x < FloorW; x += 16)
                {
                    g.Rect(x, y, 16, 8, rnd() < 0.5f ? M.Hex("#3a3249") : M.Hex("#342d43"));
                    g.Rect(x, y, 15, 1, M.Hex("#463d58"));
                    g.Rect(x, y + 7, 16, 1, M.Hex("#1f1a2b")); g.Rect(x + 15, y, 1, 8, M.Hex("#1f1a2b"));
                    if (rnd() < 0.2f) g.Rect(x + 3 + (int)(rnd() * 9), y + 2 + (int)(rnd() * 4), 2, 1, M.Hex("#2a2338"));
                }
            }
            g.Rect(0, 8, FloorW, 2, M.Hex("#544a6c"));
            g.Rect(0, fy0 - 2, FloorW, 2, M.Hex("#1a1624"));
            for (int i = 0; i < 7; i++) g.Rect(fx0, fy0 + i, fx1 - fx0, 1, new Color32(5, 3, 10, 255), 0.55f - i * 0.075f);
            g.Rect(0, 8, fx0, FloorH, M.Hex("#17131f")); g.Rect(fx1, 8, FloorW - fx1, FloorH, M.Hex("#17131f"));
            g.Rect(fx0 - 1, fy0, 1, fy1 - fy0, M.Hex("#2e2840")); g.Rect(fx1, fy0, 1, fy1 - fy0, M.Hex("#2e2840"));
            g.Rect(0, fy1, FloorW, FloorH - fy1, M.Hex("#17131f"));
            g.Rect(fx0, fy1, fx1 - fx0, 1, M.Hex("#3a3450"));
            foreach (float tx in Torches)
            {
                int bx = (int)((tx - FloorX0) * PPU), by = (int)((FloorY0 - 10.1f) * PPU);
                g.Rect(bx - 3, by, 7, 9, M.Hex("#120d0a"));
                g.Rect(bx - 2, by + 1, 5, 2, M.Hex("#6a5440"));
                g.Rect(bx - 1, by + 3, 3, 5, M.Hex("#3a2c22"));
                g.Rect(bx - 2, by - 1, 5, 1, M.Hex("#2a1d14"));
            }
            return g;
        }

        // ---- decals (canvas-style coordinates on the floor texture) ----
        public static void DecalPos(float wx, float wy, out int x, out int y)
        {
            x = Mathf.RoundToInt((wx - FloorX0) * PPU);
            y = Mathf.RoundToInt((FloorY0 - wy) * PPU);
        }
    }
}
