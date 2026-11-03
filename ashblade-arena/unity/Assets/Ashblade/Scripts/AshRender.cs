using System.Collections.Generic;
using UnityEngine;

namespace Ashblade
{
    /// <summary>
    /// Screen space of the 320x180 render target: x right, y down, like the web canvas.
    /// The camera sits on whole pixels, so sprites and overlays line up with no shimmer.
    /// </summary>
    public static class View
    {
        public static int camX, camY; // camera centre in world pixels (y up)

        public static Vector2Int ToScreen(float wx, float wy)
        {
            return new Vector2Int(Mathf.RoundToInt(Art.VW / 2f + wx * Art.PPU - camX), Mathf.RoundToInt(Art.VH / 2f - wy * Art.PPU + camY));
        }
        public static Vector2Int ToScreen(Vector2 w) { return ToScreen(w.x, w.y); }

        /// <summary>World position of a screen pixel corner.</summary>
        public static Vector3 ScreenToWorld(float sx, float sy)
        {
            return new Vector3((sx - Art.VW / 2f + camX) / Art.PPU, (Art.VH / 2f - sy + camY) / Art.PPU, 0f);
        }
    }

    /// <summary>Unlit materials made from the shaders in Resources (null falls back to Unity's default sprite material).</summary>
    public static class Mats
    {
        public static Material Sprite, Additive, Present;
    }

    /// <summary>A full-screen 320x180 pixel layer redrawn every frame (telegraphs, sparks, rings, smears...).</summary>
    public class Overlay
    {
        public readonly PixBuf b = new PixBuf(Art.VW, Art.VH);
        readonly Texture2D tex;
        readonly SpriteRenderer sr;
        static readonly Color32 Clear = new Color32(0, 0, 0, 0);
        bool dirty = true;

        public Overlay(string name, int order, Transform parent)
        {
            tex = b.MakeTexture();
            sr = new GameObject(name).AddComponent<SpriteRenderer>();
            sr.transform.SetParent(parent, false);
            sr.sprite = Art.Make(tex, new Vector2(0f, 1f));
            sr.sortingOrder = order;
            if (Mats.Sprite != null) sr.sharedMaterial = Mats.Sprite;
        }

        public int Order { set { sr.sortingOrder = value; } }

        public void Begin()
        {
            if (dirty) b.Clear(Clear);
            dirty = true;
        }

        public void End(bool visible = true)
        {
            sr.enabled = visible;
            if (!visible) return;
            b.Upload(tex);
            sr.transform.position = View.ScreenToWorld(0, 0);
        }

        // ---- canvas-style drawing ----
        public void Plot(float x, float y, Color32 c, float a = 1f) { b.Blend(Mathf.FloorToInt(x), Mathf.FloorToInt(y), c, a); }

        public void Line(float fx0, float fy0, float fx1, float fy1, Color32 c, float a = 1f)
        {
            int x0 = Mathf.RoundToInt(fx0), y0 = Mathf.RoundToInt(fy0), x1 = Mathf.RoundToInt(fx1), y1 = Mathf.RoundToInt(fy1);
            int dx = Mathf.Abs(x1 - x0), dy = -Mathf.Abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, n = 0;
            while (n++ < 400)
            {
                b.Blend(x0, y0, c, a);
                if (x0 == x1 && y0 == y1) break;
                int e2 = 2 * err;
                if (e2 >= dy) { err += dy; x0 += sx; }
                if (e2 <= dx) { err += dx; y0 += sy; }
            }
        }

        public void Ring(float cx, float cy, float r, int w, Color32 c, bool dither, float squash)
        {
            float step = 1f / Mathf.Max(4f, r);
            for (float a = 0; a < M.TAU; a += step)
            {
                float ca = Mathf.Cos(a), sa = Mathf.Sin(a) * squash;
                for (int k = 0; k < w; k++)
                {
                    float rr = r - k;
                    int x = Mathf.RoundToInt(cx + ca * rr), y = Mathf.RoundToInt(cy + sa * rr);
                    if (dither && ((x + y) & 1) == 1) continue;
                    b.Blend(x, y, c);
                }
            }
        }

        public void Rect(float x, float y, int w, int h, Color32 c, float a = 1f) { b.Rect(Mathf.RoundToInt(x), Mathf.RoundToInt(y), w, h, c, a); }
    }

    /// <summary>Immediate-mode sprite drawing: call Draw() every frame, unused renderers are hidden in End().</summary>
    public class SpritePool
    {
        readonly List<SpriteRenderer> list = new List<SpriteRenderer>();
        readonly Transform root;
        readonly Material normal, additive;
        int used;

        public SpritePool(Transform root, Material additive)
        {
            this.root = root;
            this.additive = additive;
            if (Mats.Sprite != null) normal = Mats.Sprite;
            else
            {
                var probe = new GameObject("probe").AddComponent<SpriteRenderer>();
                normal = probe.sharedMaterial;
                Object.Destroy(probe.gameObject);
            }
        }

        /// <summary>Draws a sprite with its pivot at screen pixel (sx, sy).</summary>
        public SpriteRenderer Draw(Sprite s, float sx, float sy, int order, float scx = 1f, float scy = 1f, bool flip = false, Color? col = null, bool add = false, float rotDeg = 0f)
        {
            SpriteRenderer r;
            if (used < list.Count) r = list[used];
            else
            {
                r = new GameObject("spr").AddComponent<SpriteRenderer>();
                r.transform.SetParent(root, false);
                list.Add(r);
            }
            used++;
            r.enabled = true;
            r.sprite = s;
            r.sortingOrder = order;
            r.color = col ?? Color.white;
            Material m = add && additive != null ? additive : normal;
            if (r.sharedMaterial != m) r.sharedMaterial = m;
            r.transform.position = View.ScreenToWorld(sx, sy);
            r.transform.localScale = new Vector3(flip ? -scx : scx, scy, 1f);
            r.transform.localRotation = rotDeg != 0f ? Quaternion.Euler(0, 0, rotDeg) : Quaternion.identity;
            return r;
        }

        public void End()
        {
            for (int i = used; i < list.Count; i++) if (list[i].enabled) list[i].enabled = false;
            used = 0;
        }
    }
}
