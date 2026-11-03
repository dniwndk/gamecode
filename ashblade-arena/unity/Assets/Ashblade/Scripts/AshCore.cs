using System.Collections.Generic;
using UnityEngine;

namespace Ashblade
{
    /// <summary>Small math helpers shared by everything (angles in radians, y up).</summary>
    public static class M
    {
        public const float TAU = Mathf.PI * 2f;
        public const float D2R = Mathf.Deg2Rad;

        public static float Rand(float a, float b) { return Random.Range(a, b); }
        public static T Pick<T>(T[] a) { return a[Random.Range(0, a.Length)]; }
        public static float EaseOut(float t) { t = Mathf.Clamp01(t); float u = 1f - t; return 1f - u * u * u; }
        public static float WrapPi(float a)
        {
            a = (a + Mathf.PI) % TAU;
            if (a < 0f) a += TAU;
            return a - Mathf.PI;
        }
        public static float Ang(Vector2 v) { return Mathf.Atan2(v.y, v.x); }
        public static Vector2 FromAng(float a) { return new Vector2(Mathf.Cos(a), Mathf.Sin(a)); }
        public static Vector2 Norm(Vector2 v) { float l = v.magnitude; return l > 1e-6f ? v / l : Vector2.zero; }
        public static float AngleBetween(Vector2 a, Vector2 b)
        {
            if (a.sqrMagnitude < 1e-12f || b.sqrMagnitude < 1e-12f) return 0f;
            return Vector2.Angle(a, b);
        }
        public static Color32 Hex(string h)
        {
            Color c;
            ColorUtility.TryParseHtmlString(h, out c);
            return c;
        }
        public static Color32 WithA(Color32 c, float a) { c.a = (byte)Mathf.Clamp(Mathf.RoundToInt(a * 255f), 0, 255); return c; }
    }

    /// <summary>
    /// A CPU pixel buffer with canvas-style coordinates (x right, y down). Stored bottom-up so it uploads
    /// straight into a Texture2D. Used for the floor, the decals and the two per-frame FX overlays.
    /// </summary>
    public class PixBuf
    {
        public readonly int w, h;
        public readonly Color32[] px;

        public PixBuf(int w, int h) { this.w = w; this.h = h; px = new Color32[w * h]; }

        public void Clear(Color32 c)
        {
            for (int i = 0; i < px.Length; i++) px[i] = c;
        }

        public void Set(int x, int y, Color32 c)
        {
            if ((uint)x >= (uint)w || (uint)y >= (uint)h) return;
            px[(h - 1 - y) * w + x] = c;
        }

        public Color32 Get(int x, int y)
        {
            if ((uint)x >= (uint)w || (uint)y >= (uint)h) return default(Color32);
            return px[(h - 1 - y) * w + x];
        }

        /// <summary>Source-over blend of c (its own alpha times a).</summary>
        public void Blend(int x, int y, Color32 c, float a = 1f)
        {
            if ((uint)x >= (uint)w || (uint)y >= (uint)h) return;
            int i = (h - 1 - y) * w + x;
            float sa = a * c.a / 255f;
            if (sa >= 0.999f) { c.a = 255; px[i] = c; return; }
            if (sa <= 0.001f) return;
            Color32 d = px[i];
            float da = d.a / 255f;
            float oa = sa + da * (1f - sa);
            if (oa <= 0f) return;
            float k = da * (1f - sa);
            px[i] = new Color32(
                (byte)((c.r * sa + d.r * k) / oa),
                (byte)((c.g * sa + d.g * k) / oa),
                (byte)((c.b * sa + d.b * k) / oa),
                (byte)(oa * 255f));
        }

        public void Rect(int x, int y, int rw, int rh, Color32 c, float a = 1f)
        {
            int x0 = Mathf.Max(0, x), y0 = Mathf.Max(0, y), x1 = Mathf.Min(w, x + rw), y1 = Mathf.Min(h, y + rh);
            for (int yy = y0; yy < y1; yy++)
                for (int xx = x0; xx < x1; xx++) Blend(xx, yy, c, a);
        }

        /// <summary>Like canvas destination-out: removes k of every pixel's alpha.</summary>
        public void Fade(float k)
        {
            for (int i = 0; i < px.Length; i++) px[i].a = (byte)(px[i].a * (1f - k));
        }

        public Texture2D MakeTexture(FilterMode f = FilterMode.Point)
        {
            var t = new Texture2D(w, h, TextureFormat.RGBA32, false);
            t.filterMode = f;
            t.wrapMode = TextureWrapMode.Clamp;
            Upload(t);
            return t;
        }

        public void Upload(Texture2D t)
        {
            t.SetPixels32(px);
            t.Apply(false);
        }
    }

    /// <summary>3x5 pixel font. Bits: 4 = left column, 2 = middle, 1 = right.</summary>
    public static class PixelFont
    {
        static readonly Dictionary<char, int[]> G = new Dictionary<char, int[]>
        {
            { 'A', new[] { 2, 5, 7, 5, 5 } }, { 'B', new[] { 6, 5, 6, 5, 6 } }, { 'C', new[] { 3, 4, 4, 4, 3 } },
            { 'D', new[] { 6, 5, 5, 5, 6 } }, { 'E', new[] { 7, 4, 6, 4, 7 } }, { 'F', new[] { 7, 4, 6, 4, 4 } },
            { 'G', new[] { 3, 4, 5, 5, 3 } }, { 'H', new[] { 5, 5, 7, 5, 5 } }, { 'I', new[] { 7, 2, 2, 2, 7 } },
            { 'J', new[] { 1, 1, 1, 5, 2 } }, { 'K', new[] { 5, 5, 6, 5, 5 } }, { 'L', new[] { 4, 4, 4, 4, 7 } },
            { 'M', new[] { 5, 7, 7, 5, 5 } }, { 'N', new[] { 6, 5, 5, 5, 5 } }, { 'O', new[] { 2, 5, 5, 5, 2 } },
            { 'P', new[] { 6, 5, 6, 4, 4 } }, { 'Q', new[] { 2, 5, 5, 6, 3 } }, { 'R', new[] { 6, 5, 6, 5, 5 } },
            { 'S', new[] { 3, 4, 2, 1, 6 } }, { 'T', new[] { 7, 2, 2, 2, 2 } }, { 'U', new[] { 5, 5, 5, 5, 7 } },
            { 'V', new[] { 5, 5, 5, 5, 2 } }, { 'W', new[] { 5, 5, 7, 7, 5 } }, { 'X', new[] { 5, 5, 2, 5, 5 } },
            { 'Y', new[] { 5, 5, 2, 2, 2 } }, { 'Z', new[] { 7, 1, 2, 4, 7 } },
            { '0', new[] { 7, 5, 5, 5, 7 } }, { '1', new[] { 2, 6, 2, 2, 7 } }, { '2', new[] { 6, 1, 2, 4, 7 } },
            { '3', new[] { 6, 1, 2, 1, 6 } }, { '4', new[] { 5, 5, 7, 1, 1 } }, { '5', new[] { 7, 4, 6, 1, 6 } },
            { '6', new[] { 3, 4, 6, 5, 2 } }, { '7', new[] { 7, 1, 1, 2, 2 } }, { '8', new[] { 2, 5, 2, 5, 2 } },
            { '9', new[] { 2, 5, 3, 1, 6 } }, { '!', new[] { 2, 2, 2, 0, 2 } }, { '+', new[] { 0, 2, 7, 2, 0 } },
            { '-', new[] { 0, 0, 7, 0, 0 } }, { '.', new[] { 0, 0, 0, 0, 2 } }, { ':', new[] { 0, 2, 0, 2, 0 } },
            { '/', new[] { 1, 1, 2, 4, 4 } }, { '%', new[] { 5, 1, 2, 4, 5 } }, { ' ', new[] { 0, 0, 0, 0, 0 } },
        };

        static readonly Dictionary<string, Texture2D> texCache = new Dictionary<string, Texture2D>();
        static readonly Dictionary<string, Sprite> sprCache = new Dictionary<string, Sprite>();
        public static readonly Color32 Outline = new Color32(13, 8, 20, 255);

        /// <summary>Text with a thick dark outline, as a point-filtered texture.</summary>
        public static Texture2D Tex(string str, Color32 col, int s = 1)
        {
            string key = str + "|" + col.r + "," + col.g + "," + col.b + "|" + s;
            Texture2D t;
            if (texCache.TryGetValue(key, out t)) return t;
            string up = str.ToUpperInvariant();
            int w = Mathf.Max(1, (up.Length * 4 - 1) * s + 2 * s), h = 7 * s;
            var b = new PixBuf(w, h);
            for (int pass = 0; pass < 2; pass++)
            {
                for (int i = 0; i < up.Length; i++)
                {
                    int[] gl;
                    if (!G.TryGetValue(up[i], out gl)) gl = G[' '];
                    for (int y = 0; y < 5; y++)
                        for (int x = 0; x < 3; x++)
                        {
                            if ((gl[y] & (4 >> x)) == 0) continue;
                            int px = s + (i * 4 + x) * s, py = s + y * s;
                            if (pass == 0) b.Rect(px - s, py - s, 3 * s, 3 * s, Outline);
                            else b.Rect(px, py, s, s, col);
                        }
                }
            }
            t = b.MakeTexture();
            texCache[key] = t;
            return t;
        }

        /// <summary>The same text as a sprite with its pivot at the bottom centre.</summary>
        public static Sprite Spr(string str, Color32 col, int s = 1)
        {
            string key = str + "|" + col.r + "," + col.g + "," + col.b + "|" + s;
            Sprite sp;
            if (sprCache.TryGetValue(key, out sp)) return sp;
            Texture2D t = Tex(str, col, s);
            sp = Sprite.Create(t, new Rect(0, 0, t.width, t.height), new Vector2(0.5f, 0f), Art.PPU, 0, SpriteMeshType.FullRect);
            sprCache[key] = sp;
            return sp;
        }
    }
}
