using UnityEngine;

namespace Ashblade
{
    /// <summary>Drawing, HUD and lab panel for the keyword enchants (logic lives in AshEnchant.cs).</summary>
    public partial class AshGame
    {
        static readonly Color32[] PalFire = { M.Hex("#ffffff"), M.Hex("#fff3a0"), M.Hex("#ff9a3a"), M.Hex("#c8321e") };
        static readonly Color32[] PalFrost = { M.Hex("#ffffff"), M.Hex("#dff8ff"), M.Hex("#8fdcff"), M.Hex("#3a9ee8") };
        static readonly Color32[] PalChain = { M.Hex("#ffffff"), M.Hex("#fff8c8"), M.Hex("#ffe066"), M.Hex("#c88a10") };

        static Color32[] EnchSmearPalette(int slot)
        {
            if (Ench.L(slot, EnchKey.Fire) > 0) return PalFire;
            if (Ench.L(slot, EnchKey.Frost) > 0) return PalFrost;
            if (Ench.L(slot, EnchKey.Chain) > 0) return PalChain;
            return null;
        }

        void DrawEnchFx()
        {
            var o = front;
            foreach (var w in Ench.waves)
            {
                var s = View.ToScreen(w.pos.x, w.pos.y + 0.4f);
                Color32[] pal; if (!W.Ramps.TryGetValue(w.ramp, out pal)) pal = W.Ramps["steel"];
                float a0 = M.Ang(w.dir), R = w.big ? 9f : 7f, fade = Mathf.Min(1f, (w.max - w.dist) / 1.2f);
                for (int k = -10; k <= 10; k++)
                {
                    float a = a0 + k / 10f * 1.1f, ca = Mathf.Cos(a), sa = -Mathf.Sin(a);
                    int thick = Mathf.RoundToInt((1f - Mathf.Abs(k) / 10f) * 3f * fade);
                    for (int r = 0; r <= thick; r++) o.Plot(Mathf.Round(s.x + ca * (R - r)), Mathf.Round(s.y + sa * (R - r) * 0.85f), r == 0 ? pal[0] : r == 1 ? pal[1] : pal[2]);
                }
                Glow(s.x + Mathf.Cos(a0) * R * 0.5f, s.y - Mathf.Sin(a0) * R * 0.5f, 18, GlowOf(w.ramp), 0.5f * fade);
            }
            foreach (var sh in Ench.shards)
            {
                string[] sc = sh.kind == "ice" ? new[] { "#dff8ff", "#8fdcff", "#3a9ee8", "ice" } : sh.kind == "violet" ? new[] { "#f2dcff", "#c08af0", "#8a4ad0", "violet" } : new[] { "#e8ffd0", "#a8f070", "#5cc04a", "acid" };
                for (int i = 1; i < sh.trail.Count; i++)
                {
                    var a = View.ToScreen(sh.trail[i - 1]); var b = View.ToScreen(sh.trail[i]);
                    o.Line(a.x, a.y, b.x, b.y, i > 3 ? C(sc[1]) : C(sc[2]));
                }
                var s = View.ToScreen(sh.pos);
                o.Rect(s.x - 2, s.y - 2, 4, 4, Art.Outline); o.Rect(s.x - 1, s.y - 1, 2, 2, C(sc[0]));
                Glow(s.x, s.y, 9, GlowOf(sc[3]), 0.6f);
            }
            foreach (var bo in Ench.bolts)
            {
                var a = View.ToScreen(bo.a); var b = View.ToScreen(bo.b);
                float k = bo.life / bo.max, sd = bo.seed;
                float dx = b.x - a.x, dy = b.y - a.y, l = Mathf.Max(1f, Mathf.Sqrt(dx * dx + dy * dy)), nx = -dy / l, ny = dx / l;
                float px = a.x, py = a.y;
                int tick = Mathf.FloorToInt(W.realTime * 40f);
                for (int i = 1; i <= 6; i++)
                {
                    sd = (sd * 9301f + 49297f + tick) % 233280f;
                    float t = i / 6f, j = i == 6 ? 0f : (sd / 233280f - 0.5f) * 10f;
                    float x = a.x + dx * t + nx * j, y = a.y + dy * t + ny * j;
                    Color32 bc = bo.ramp == "fire" ? C("#ff9a3c") : bo.ramp == "ice" ? C("#8fdcff") : C("#ffe066");
                    o.Line(px, py - 1, x, y - 1, Art.Outline); o.Line(px, py, x, y, k > 0.5f ? WhiteC : bc); o.Line(px + 1, py, x + 1, y, bc);
                    px = x; py = y;
                }
                Glow(a.x, a.y, 14, GlowOf(bo.ramp), 0.6f * k); Glow(b.x, b.y, 16, GlowOf(bo.ramp), 0.7f * k);
            }
            foreach (var q in Ench.echoes)
            {
                float k = q.life / q.max, prog = 1f - k;
                var s = View.ToScreen(q.pos);
                int ord = EntityOrder(q.pos) - 2;
                pool.Draw(q.spr.white, s.x, s.y, ord, 1, 1, q.flip, new Color(0.54f, 0.29f, 0.82f, 0.75f * k));
                pool.Draw(q.spr.white, s.x, s.y, ord + 1, 1, 1, q.flip, new Color(0.95f, 0.86f, 1f, 0.35f * k));
                float cy = s.y - 8;
                if (q.burst) { o.Ring(s.x, cy + 8, q.r * (0.4f + prog * 0.6f), 2, k > 0.5f ? C("#f2dcff") : C("#c08af0"), k < 0.4f, 0.75f); continue; }
                float a0 = M.Ang(q.dir), span = q.arc >= 360f ? M.TAU : q.arc * M.D2R;
                for (int i = 0; i <= 18; i++)
                {
                    float t = i / 18f; if (t > 0.3f + prog * 1.2f) break;
                    float a = a0 + span / 2f - t * span;
                    for (int r = 0; r < 3; r++) o.Plot(Mathf.Round(s.x + Mathf.Cos(a) * (q.r - r)), Mathf.Round(cy - Mathf.Sin(a) * (q.r - r)), r == 0 ? C("#f2dcff") : r == 1 ? C("#c08af0") : C("#8a4ad0"));
                }
                Glow(s.x, cy, 24, GlowOf("violet"), 0.4f * k);
            }
        }

        /// <summary>Burning / icy ground left by Flame Trail and Frost Trail.</summary>
        void DrawEnchGround()
        {
            var o = ground;
            foreach (var pt in Ench.patches)
            {
                var s = View.ToScreen(pt.pos); float k = pt.life / pt.max, R = pt.r * Art.PPU;
                int n = Mathf.RoundToInt(10f * Mathf.Min(1f, k * 2f));
                for (int i = 0; i < n; i++)
                {
                    float a = pt.seed + i * 2.4f + W.realTime * (pt.fire > 0 ? 3f : 0.6f), r = R * ((i * 0.37f + pt.seed) % 1f);
                    float x = s.x + Mathf.Cos(a) * r, y = s.y + Mathf.Sin(a) * r * 0.5f;
                    if (pt.fire > 0)
                    {
                        int hgt = 1 + ((i + Mathf.FloorToInt(W.realTime * 12f)) % 3);
                        o.Plot(x, y, C("#ff7a2a")); if (hgt > 1) o.Plot(x, y - 1, C("#ffb43c")); if (hgt > 2) o.Plot(x, y - 2, C("#fff3a0"));
                    }
                    if (pt.frost > 0) o.Plot(x + 1, y, (i + Mathf.FloorToInt(W.realTime * 4f)) % 4 != 0 ? C("#8fdcff") : WhiteC);
                }
                Glow(s.x, s.y, R + 6, GlowOf(pt.fire > 0 ? "fire" : "ice"), 0.3f * k);
            }
        }

        void DrawEnemyStatus(Enemy e, int x, int y, int ord)
        {
            var s = e.st;
            if (s == null || e.state == "Dead") return;
            if (s.frozen > 0f)
            {
                pool.Draw(e.spr.white, x, y, ord + 3, 1, 1, e.flip, new Color(0.75f, 0.91f, 1f, 0.7f));
                int w = e.spr.w + 2, hh = e.spr.h + 2, x0 = Mathf.RoundToInt(x - w / 2f), y0 = y - hh + 1;
                front.Rect(x0, y0, w, hh, C("#dff8ff"), 0.25f);
                front.Rect(x0, y0, w, 1, C("#e8fbff")); front.Rect(x0, y0, 1, hh, C("#e8fbff"));
                front.Rect(x0, y0 + hh - 1, w, 1, C("#3a9ee8")); front.Rect(x0 + w - 1, y0, 1, hh, C("#3a9ee8"));
                front.Rect(x0, y0 - 3, Mathf.RoundToInt(w * s.frozen / s.frozenMax), 1, C("#dff8ff"));
            }
            else if (s.chill > 0) pool.Draw(e.spr.white, x, y, ord + 3, 1, 1, e.flip, new Color(0.56f, 0.86f, 1f, 0.12f * s.chill + 0.1f));
            if (s.burn > 0 && Mathf.FloorToInt(W.realTime * 15f) % 2 == 1) pool.Draw(e.spr.white, x, y, ord + 4, 1, 1, e.flip, new Color(1f, 0.48f, 0.16f, 0.25f));
            int px = Mathf.RoundToInt(x - 7f), py = y - e.spr.h - 7;
            if (s.burn > 0) { Pips(px, py, s.burn, C("#ff8a3a")); py -= 3; }
            if (s.chill > 0) Pips(px, py, s.chill, C("#8fdcff"));
        }

        void Pips(int px, int py, int n, Color32 col)
        {
            for (int i = 0; i < Mathf.Min(n, 8); i++) { front.Rect(px + i * 2 - 1, py - 1, 3, 3, Art.Outline); front.Rect(px + i * 2, py, 1, 1, col); }
        }

        void DrawEnchHud()
        {
            float y = Art.VH - 20;
            for (int slot = 1; slot >= 0; slot--)
            {
                float x = 6; bool any = false;
                for (int k = 0; k < Ench.Count; k++)
                {
                    int l = Ench.lv[slot, k]; if (l == 0) continue; any = true;
                    HRect(x - 1, y - 1, 12, 9, (Color)Art.Outline);
                    HRect(x, y, 10, 7, (Color)C(Ench.Hex[k]));
                    HText(Ench.Tag[k].Substring(0, 1) + l, WhiteC, 1, x + 5, y, 1);
                    x += 13;
                }
                if (!any) continue;
                HText(slot == 0 ? "B" : "S", slot == 0 ? C("#8fdcff") : C("#ff9a3c"), 1, x + 1, y);
                var syn = Ench.Active(slot);
                if (syn.Count > 0)
                {
                    string t = syn[0].tag + (syn.Count > 1 ? " " + syn[1].tag : "") + (syn.Count > 2 ? " +" + (syn.Count - 2) : "");
                    HText(t, C("#ffd166"), 1, x + 9, y);
                }
                y -= 10;
            }
        }

        void DrawEnchCards()
        {
            if (W.waveState != "reward" || !Ench.Offering || Ench.offerT < 0f) return;
            const int VW = Art.VW, VH = Art.VH;
            float t = Ench.offerT;
            HRect(0, 0, VW, VH, new Color(8 / 255f, 4 / 255f, 12 / 255f, 0.6f));
            HText("CHOOSE AN ENCHANT", C("#ffd166"), 2, VW / 2f, 40, 1);
            Vector2? hover = null;
            var ms = AshInput.MouseScreen();
            if (ms.HasValue) hover = new Vector2((ms.Value.x - ox) / sc, (Screen.height - ms.Value.y - oy) / sc);
            for (int i = 0; i < Ench.offer.Count; i++)
            {
                var c = Ench.offer[i]; int k = c.y, l = Ench.lv[c.x, k];
                Rect r = Ench.CardRect(i);
                float appear = Mathf.Clamp01((t - i * 0.08f) / 0.18f);
                if (Ench.picked < 0) r.y += (1f - M.EaseOut(appear)) * 30f; else appear = 1f;
                bool chosen = Ench.picked == i, other = Ench.picked >= 0 && !chosen;
                bool hov = hover.HasValue && r.Contains(hover.Value) && Ench.picked < 0;
                float a = appear * (other ? 0.35f : 1f);
                Color col = (Color)C(Ench.Hex[k]);
                HRect(r.x - 2, r.y - 2, r.width + 4, r.height + 4, WithA((Color)Art.Outline, a));
                HRect(r.x, r.y, r.width, r.height, WithA(chosen ? col : hov ? (Color)C("#2a2036") : (Color)C("#1a1424"), a));
                HRect(r.x, r.y, r.width, 2, WithA(col, a)); HRect(r.x, r.y + r.height - 2, r.width, 2, WithA(col, a));
                Color32 ink = Art.Outline;
                HText((i + 1).ToString(), C("#9a92b3"), 1, r.x + 4, r.y + 5, 0, 1f, a);
                HText(c.x == 0 ? "BASIC" : "SKILL", c.x == 0 ? C("#8fdcff") : C("#ff9a3c"), 1, r.x + r.width - 4, r.y + 5, 2, 1f, a);
                HText(Ench.Tag[k], chosen ? ink : C(Ench.Hex[k]), 2, r.x + r.width / 2f, r.y + 18, 1, 1f, a);
                HText(Ench.Desc[k], chosen ? ink : C("#e8e0f0"), 1, r.x + r.width / 2f, r.y + 38, 1, 1f, a);
                HText(l > 0 ? "LV " + l + " + 1" : "NEW", chosen ? ink : C("#ffd166"), 1, r.x + r.width / 2f, r.y + 50, 1, 1f, a);
                var fr = Ench.NewIf(c.x, k);
                if (fr.Count > 0) HText(fr.Count > 1 ? fr.Count + " SYNERGIES" : fr[0].tag, chosen ? ink : Mathf.FloorToInt(W.realTime * 4f) % 2 == 1 ? WhiteC : C("#ffd166"), 1, r.x + r.width / 2f, r.y + 60, 1, 1f, a);
            }
            HText("CLICK OR PRESS 1 2 3", C("#c8bcd8"), 1, VW / 2f, 142, 1);
        }

        static Color WithA(Color c, float a) { c.a *= a; return c; }

        static readonly string[] KoNames = { "Pierce", "Fire", "Frost", "Chain", "Split", "Echo" };
        void EnchPanel()
        {
            GUILayout.Label("Enchants  (click = level 0-3)");
            for (int slot = 0; slot < 2; slot++)
            {
                GUILayout.BeginHorizontal();
                GUILayout.Label(slot == 0 ? "Basic" : "Skill", GUILayout.Width(38));
                for (int k = 0; k < Ench.Count; k++)
                {
                    int l = Ench.lv[slot, k];
                    GUI.color = l > 0 ? (Color)C(Ench.Hex[k]) : Color.white;
                    if (GUILayout.Button(KoNames[k].Substring(0, 2) + (l > 0 ? l.ToString() : "-"), GUILayout.Width(36))) Ench.lv[slot, k] = (l + 1) % 4;
                    GUI.color = Color.white;
                }
                GUILayout.EndHorizontal();
            }
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("All Lv3")) Ench.SetAll(3);
            if (GUILayout.Button("Clear")) Ench.SetAll(0);
            Ench.cards = GUILayout.Toggle(Ench.cards, "Wave cards");
            GUILayout.EndHorizontal();
            GUILayout.Label("Synergies  (two keywords in one slot)");
            foreach (var x in Ench.Syn)
            {
                bool b = Ench.On(Ench.Basic, x.a, x.b), sk = Ench.On(Ench.Skill, x.a, x.b);
                GUI.color = b || sk ? (Color)C("#ffd166") : new Color(0.7f, 0.68f, 0.78f);
                GUILayout.Label(KoNames[(int)x.a] + "+" + KoNames[(int)x.b] + "  " + x.tag + (b || sk ? "  [" + (b ? "B" : "") + (sk ? "S" : "") + "]" : "") + "\n   " + x.ko);
            }
            GUI.color = Color.white;
        }
    }
}
