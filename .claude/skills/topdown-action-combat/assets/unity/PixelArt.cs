using System.Collections.Generic;
using UnityEngine;

namespace CombatProto
{
    /// <summary>Placeholder pixel sprites made in code, so the prototype needs no art files.</summary>
    public static class PixelArt
    {
        public const float PPU = 16f;
        public const int SlashSize = 40;
        public const float SlashOuter = 19f;
        public static float SlashRadiusUnits => SlashOuter / PPU;

        static Sprite pixel, slash;

        public static Vector2 Snap(Vector2 v)
        {
            return new Vector2(Mathf.Round(v.x * PPU) / PPU, Mathf.Round(v.y * PPU) / PPU);
        }

        public static Texture2D NewTex(int w, int h)
        {
            var t = new Texture2D(w, h, TextureFormat.RGBA32, false);
            t.filterMode = FilterMode.Point;
            t.wrapMode = TextureWrapMode.Clamp;
            return t;
        }

        public static Sprite FromTexture(Texture2D t, Vector2 pivot)
        {
            return Sprite.Create(t, new Rect(0, 0, t.width, t.height), pivot, PPU, 0, SpriteMeshType.FullRect);
        }

        public static Sprite Pixel
        {
            get
            {
                if (pixel == null)
                {
                    var t = NewTex(1, 1);
                    t.SetPixel(0, 0, Color.white);
                    t.Apply();
                    pixel = FromTexture(t, new Vector2(0.5f, 0.5f));
                }
                return pixel;
            }
        }

        /// <summary>Builds a sprite (pivot at the feet) and a white silhouette for hit flashes.</summary>
        public static void FromRows(string[] rows, Dictionary<char, Color32> pal, out Sprite sprite, out Sprite silhouette)
        {
            int h = rows.Length;
            int w = 0;
            foreach (string r in rows) w = Mathf.Max(w, r.Length);
            var tex = NewTex(w, h);
            var sil = NewTex(w, h);
            var clear = new Color(0f, 0f, 0f, 0f);
            for (int y = 0; y < h; y++)
            {
                string row = rows[h - 1 - y];
                for (int x = 0; x < w; x++)
                {
                    char c = x < row.Length ? row[x] : '.';
                    Color32 col;
                    if (c != '.' && pal.TryGetValue(c, out col))
                    {
                        tex.SetPixel(x, y, col);
                        sil.SetPixel(x, y, Color.white);
                    }
                    else
                    {
                        tex.SetPixel(x, y, clear);
                        sil.SetPixel(x, y, clear);
                    }
                }
            }
            tex.Apply();
            sil.Apply();
            var pivot = new Vector2(0.5f, 1f / h);
            sprite = FromTexture(tex, pivot);
            silhouette = FromTexture(sil, pivot);
        }

        public static Sprite Ellipse(int w, int h, Color c)
        {
            var t = NewTex(w, h);
            float rx = w / 2f, ry = h / 2f;
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    float dx = (x + 0.5f - rx) / rx, dy = (y + 0.5f - ry) / ry;
                    t.SetPixel(x, y, dx * dx + dy * dy <= 1f ? c : new Color(0f, 0f, 0f, 0f));
                }
            t.Apply();
            return FromTexture(t, new Vector2(0.5f, 0.5f));
        }

        /// <summary>A crescent pointing to +X. Rotated to the attack direction at runtime.</summary>
        public static Sprite Slash
        {
            get
            {
                if (slash != null) return slash;
                int s = SlashSize;
                const float inner = 10f, half = 75f;
                var t = NewTex(s, s);
                for (int y = 0; y < s; y++)
                    for (int x = 0; x < s; x++)
                    {
                        float dx = x + 0.5f - s / 2f, dy = y + 0.5f - s / 2f;
                        float r = Mathf.Sqrt(dx * dx + dy * dy);
                        float ang = Mathf.Abs(Mathf.Atan2(dy, dx) * Mathf.Rad2Deg);
                        // the blade edge is thick in the middle of the swing and thin at its ends
                        float edge = 1f - ang / half;
                        float innerHere = Mathf.Lerp(SlashOuter - 2f, inner, Mathf.Clamp01(edge * 1.6f));
                        if (ang > half || r > SlashOuter || r < innerHere)
                        {
                            t.SetPixel(x, y, new Color(0f, 0f, 0f, 0f));
                            continue;
                        }
                        float k = (r - innerHere) / Mathf.Max(1f, SlashOuter - innerHere);
                        Color c;
                        if (k > 0.66f) c = new Color(1f, 1f, 1f, 1f);
                        else if (k > 0.33f) c = new Color(0.75f, 0.92f, 1f, 0.8f);
                        else c = new Color(0.45f, 0.7f, 1f, 0.45f);
                        t.SetPixel(x, y, c);
                    }
                t.Apply();
                slash = FromTexture(t, new Vector2(0.5f, 0.5f));
                return slash;
            }
        }

        /// <summary>24 x 14 tiles: a 1-tile wall around a 22 x 12 floor, centred on the origin.</summary>
        public static Sprite Arena()
        {
            const int tw = 24, th = 14, ts = 16;
            var t = NewTex(tw * ts, th * ts);
            var rnd = new System.Random(3);
            Color floorA = new Color32(52, 48, 66, 255), floorB = new Color32(57, 53, 72, 255);
            Color dot = new Color32(68, 63, 85, 255), wall = new Color32(30, 27, 40, 255), wallTop = new Color32(84, 76, 104, 255);
            for (int y = 0; y < th * ts; y++)
                for (int x = 0; x < tw * ts; x++)
                {
                    int tx = x / ts, ty = y / ts;
                    bool isWall = tx == 0 || ty == 0 || tx == tw - 1 || ty == th - 1;
                    Color c;
                    if (isWall)
                    {
                        bool rim = (ty == 0 && y % ts == ts - 1) || (ty == th - 1 && y % ts == 0)
                            || (tx == 0 && x % ts == ts - 1) || (tx == tw - 1 && x % ts == 0);
                        c = rim ? wallTop : wall;
                    }
                    else
                    {
                        c = ((tx + ty) & 1) == 0 ? floorA : floorB;
                        if (rnd.NextDouble() < 0.015) c = dot;
                    }
                    t.SetPixel(x, y, c);
                }
            t.Apply();
            return FromTexture(t, new Vector2(0.5f, 0.5f));
        }

        // ---- placeholder characters -------------------------------------------------------

        public static readonly string[] PlayerRows =
        {
            "....kkkk....",
            "...kllllk...",
            "..kllbbllk..",
            "..klsssslk..",
            "..kbswswbk..",
            "...kbbbbk...",
            "..kbbllbbk..",
            ".kbbbllbbbk.",
            ".ksbbbbbbsk.",
            ".kkbbbbbbkk.",
            "..kbbkkbbk..",
            "..kbk..kbk..",
            "..kkk..kkk..",
        };

        public static readonly Dictionary<char, Color32> PlayerPal = new Dictionary<char, Color32>
        {
            { 'k', new Color32(24, 20, 37, 255) },
            { 'b', new Color32(58, 110, 200, 255) },
            { 'l', new Color32(120, 180, 240, 255) },
            { 's', new Color32(250, 214, 172, 255) },
            { 'w', new Color32(24, 20, 37, 255) },
        };

        public static readonly string[] EnemyRows =
        {
            ".....kkkk.....",
            "...kkoorrkk...",
            "..korrrrrrrk..",
            ".krrwkrrwkrrk.",
            ".krrkkrrkkrrk.",
            "krrrrrrrrrrrrk",
            "krrrrddddrrrrk",
            "krrrrrrrrrrrrk",
            ".krrrrrrrrrrk.",
            "..kkrrrrrrkk..",
            "....kkkkkk....",
        };

        public static readonly Dictionary<char, Color32> EnemyPal = new Dictionary<char, Color32>
        {
            { 'k', new Color32(30, 12, 20, 255) },
            { 'r', new Color32(200, 60, 70, 255) },
            { 'o', new Color32(255, 140, 120, 255) },
            { 'd', new Color32(110, 25, 40, 255) },
            { 'w', new Color32(255, 240, 240, 255) },
        };

        public static readonly string[] DummyRows =
        {
            "....kkkk....",
            "...kyyyyk...",
            "..kyrrrryk..",
            "..kyrccryk..",
            "..kyrrrryk..",
            "...kyyyyk...",
            "....kttk....",
            "..kkkttkkk..",
            "..kttttttk..",
            "...kkttkk...",
            ".....tt.....",
            ".....tt.....",
            "...kkttkk...",
            "...kkkkkk...",
        };

        public static readonly Dictionary<char, Color32> DummyPal = new Dictionary<char, Color32>
        {
            { 'k', new Color32(40, 26, 20, 255) },
            { 't', new Color32(160, 110, 60, 255) },
            { 'y', new Color32(214, 176, 104, 255) },
            { 'r', new Color32(190, 60, 50, 255) },
            { 'c', new Color32(240, 220, 170, 255) },
        };
    }
}
