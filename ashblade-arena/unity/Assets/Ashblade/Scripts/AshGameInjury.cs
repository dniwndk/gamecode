using UnityEngine;

namespace Ashblade
{
    /// <summary>Drawing, HUD and lab panel for body-part wounds and floor augments (logic lives in AshInjury.cs).</summary>
    public partial class AshGame
    {
        static readonly int[][] WoundPix = { null, new[] { 0, 0, 1, 1 }, new[] { 0, 0, 1, 1, -1, 1, 0, 2, 1, -1 } };

        void DrawWounds(int bx, int by, bool flip)
        {
            if (!Inj.enabled) return;
            var o = plFront;
            for (int k = 0; k < Inj.Count; k++)
            {
                int l = Inj.lv[k]; if (l == 0 || l >= 3) continue;
                var a = Inj.At[k]; var pix = WoundPix[l];
                for (int i = 0; i < pix.Length; i += 2)
                {
                    int sx = a.x + pix[i], sy = a.y + pix[i + 1];
                    int x = flip ? bx - (sx - 16) - 1 : bx + (sx - 16), y = by - 29 + sy;
                    o.Plot(x, y, (i / 2) % 2 == 1 ? C("#7a0a14") : C("#d4202e"));
                }
            }
            if (Inj.Eff(Inj.Head) >= 2)
                for (int i = 0; i < 3; i++)
                {
                    float a = W.realTime * 5f + i * M.TAU / 3f;
                    o.Plot(Mathf.Round(bx + Mathf.Cos(a) * 6f), Mathf.Round(by - 31 + Mathf.Sin(a) * 2f), i > 0 ? C("#ffe066") : WhiteC);
                }
        }

        int LimpOffset(Player p, bool moving)
        {
            if (!moving || !Inj.enabled) return 0;
            if (Inj.Severed(Inj.Legs)) return Mathf.Sin(p.runT * 11f) > 0.2f ? 2 : 0;
            if (Inj.Eff(Inj.Legs) >= 2) return Mathf.Sin(p.runT * 11f) > 0.6f ? 1 : 0;
            return 0;
        }

        void DrawLimbs()
        {
            foreach (var p in W.parts)
            {
                if (p.type != PT.Limb || p.spr == null) continue;
                var s = View.ToScreen(p.x, p.y);
                float deg = Mathf.Round(p.rot / (Mathf.PI / 4f)) * 45f;
                pool.Draw(p.spr.sprite, s.x, s.y - Mathf.RoundToInt(p.z), EntityOrder(new Vector2(p.x, p.y)), 1f, 1f, false, null, false, -deg);
            }
        }

        void DrawHeadFxWorld()
        {
            if (!Inj.enabled || W.player.state == "Dead") return;
            int hd = Inj.Eff(Inj.Head);
            if (hd >= 1) pool.Draw(Art.Vignette, 0, 0, ORD_VIG + 2, 1, 1, false, new Color(1, 1, 1, hd >= 2 ? 0.75f : 0.4f));
        }

        /// <summary>Concussion: a faint second copy of the world drifts beside the first.</summary>
        void DrawDoubleVision(Rect view, Rect src)
        {
            if (!Inj.enabled || W.player.state == "Dead" || Inj.Eff(Inj.Head) < 2) return;
            float dx = Mathf.Round(Mathf.Sin(W.realTime * 1.6f) * 3f + Mathf.Sin(W.realTime * 4.1f)) * sc;
            float dy = Mathf.Round(Mathf.Sin(W.realTime * 2.3f)) * sc;
            GUI.color = new Color(1, 1, 1, 0.22f);
            GUI.DrawTextureWithTexCoords(new Rect(view.x + dx, view.y + dy, view.width, view.height), rt, src);
            GUI.color = Color.white;
        }

        static readonly int[][][] Doll =
        {
            new[] { new[] { 3, 0, 3, 3 } }, new[] { new[] { 3, 3, 3, 4 } }, new[] { new[] { 6, 3, 2, 4 } }, new[] { new[] { 1, 3, 2, 4 } },
            new[] { new[] { 3, 7, 1, 4 }, new[] { 5, 7, 1, 4 } },
        };
        static readonly string[] DollCol = { "#d8d0e8", "#ffd166", "#ff8a3a", "#e8303c" };

        void DrawInjHud(float x0, float y0)
        {
            if (!Inj.enabled) return;
            const int S = 2;
            float rtm = W.realTime;
            HRect(x0 - 2, y0 - 2, 9 * S + 4, 11 * S + 4, new Color(8 / 255f, 4 / 255f, 12 / 255f, 0.55f));
            for (int k = 0; k < Inj.Count; k++)
            {
                int l = Inj.lv[k];
                bool fl = Inj.flash[k] > 0f && Mathf.FloorToInt(rtm * 16f) % 2 == 1;
                Color col = Inj.iron[k] ? (Color)C("#8a94a8") : (Color)C(DollCol[l]);
                if (fl) col = Color.white;
                foreach (var r in Doll[k])
                {
                    if (l >= 3 && !Inj.iron[k] && !fl)
                    {
                        Color c = Mathf.FloorToInt(rtm * 3f) % 2 == 1 ? (Color)C("#e8303c") : (Color)C("#5a0a14");
                        HRect(x0 + r[0] * S, y0 + r[1] * S, r[2] * S, 1, c); HRect(x0 + r[0] * S, y0 + (r[1] + r[3]) * S - 1, r[2] * S, 1, c);
                        continue;
                    }
                    HRect(x0 + r[0] * S, y0 + r[1] * S, r[2] * S, r[3] * S, col);
                }
            }
            var lines = Inj.PenaltyLines();
            for (int i = 0; i < Mathf.Min(5, lines.Count); i++) HText(lines[i].Key, C(lines[i].Value), 1, x0 + 9 * S + 5, y0 - 1 + i * 6);
        }

        Vector2? HudMouse()
        {
            var ms = AshInput.MouseScreen();
            if (!ms.HasValue) return null;
            return new Vector2((ms.Value.x - ox) / sc, (Screen.height - ms.Value.y - oy) / sc);
        }

        static Color Prism(float seed) { return Color.HSVToRGB(Mathf.Repeat(W.realTime * 0.39f + seed, 1f), 0.45f, 1f); }

        void DrawAugCards()
        {
            if (W.waveState != "augment" || !Aug.Offering || Aug.t < 0f) return;
            const int VW = Art.VW, VH = Art.VH;
            float t = Aug.t;
            HRect(0, 0, VW, VH, new Color(8 / 255f, 4 / 255f, 12 / 255f, 0.7f));
            HText("CHOOSE AN AUGMENT", WhiteC, 2, VW / 2f, 16, 1);
            HText(Aug.TierName(Aug.tier) + " TIER", C(Aug.TierHex(Aug.tier)), 1, VW / 2f, 32, 1);
            var hover = HudMouse();
            for (int i = 0; i < Aug.offer.Count; i++)
            {
                var a = Aug.offer[i];
                Rect r = Aug.CardRect(i);
                float appear = Mathf.Clamp01((t - i * 0.1f) / 0.22f);
                if (Aug.picked < 0) r.y += (1f - M.EaseOut(appear)) * 40f; else appear = 1f;
                bool chosen = Aug.picked == i, other = Aug.picked >= 0 && !chosen;
                bool hov = hover.HasValue && r.Contains(hover.Value) && Aug.picked < 0;
                float spin = Aug.spin[i] > 0f ? Mathf.Abs(Mathf.Cos((1f - Aug.spin[i] / 0.25f) * Mathf.PI)) : 1f;
                float cw = Mathf.Max(2f, Mathf.Round(r.width * spin)), cx = r.x + (r.width - cw) / 2f;
                float al = appear * (other ? 0.3f : 1f);
                Color edge = a.tier == "prism" ? Prism(i * 0.14f) : (Color)C(Aug.TierHex(a.tier));
                Color deep = (Color)C(Aug.TierDeep(a.tier));
                HRect(cx - 2, r.y - 2, cw + 4, r.height + 4, WithA((Color)Art.Outline, al));
                HRect(cx - 1, r.y - 1, cw + 2, r.height + 2, WithA(edge, al));
                HRect(cx, r.y, cw, r.height, WithA(chosen ? deep : hov ? (Color)C("#2c2238") : (Color)C("#1a1424"), al));
                if (chosen) HRect(cx, r.y, cw, r.height, new Color(1, 1, 1, 0.35f + 0.25f * Mathf.Sin(W.realTime * 20f)));
                HRect(cx, r.y, cw, 12, WithA(deep, al));
                if (spin > 0.6f)
                {
                    HText((i + 1).ToString(), WhiteC, 1, r.x + 4, r.y + 3, 0, 1f, al);
                    float gx = r.x + r.width / 2f, gy = r.y + 6;
                    HRect(gx - 3, gy - 2, 7, 5, WithA((Color)Art.Outline, al)); HRect(gx - 2, gy - 3, 5, 7, WithA((Color)Art.Outline, al));
                    HRect(gx - 2, gy - 1, 5, 3, WithA(edge, al)); HRect(gx - 1, gy - 2, 3, 5, WithA(edge, al)); HRect(gx - 1, gy - 1, 1, 1, WithA(Color.white, al));
                    HText(a.name, chosen ? WhiteC : C(Aug.TierHex(a.tier)), 2, r.x + r.width / 2f, r.y + 20, 1, 1f, al);
                    for (int j = 0; j < a.d.Length; j++) HText(a.d[j], C("#e8e0f0"), 1, r.x + r.width / 2f, r.y + 42 + j * 9, 1, 1f, al);
                    var set = Run.SetOf(a.id);
                    if (set != null) HText(set.name + " " + Mathf.Min(3, Run.SetCount(set) + (chosen ? 0 : 1)) + "/3", C(set.col), 1, r.x + r.width / 2f, r.y + r.height - 10, 1, 1f, al);
                }
                if (Aug.picked < 0 && appear >= 1f)
                {
                    Rect rr = Aug.RerollRect(i); bool can = Aug.rerolls[i];
                    bool rh = can && hover.HasValue && rr.Contains(hover.Value);
                    HRect(rr.x - 1, rr.y - 1, rr.width + 2, rr.height + 2, (Color)Art.Outline);
                    HRect(rr.x, rr.y, rr.width, rr.height, can ? (rh ? (Color)C("#3a2a48") : (Color)C("#241c30")) : (Color)C("#141018"));
                    HText(can ? "REROLL " + "ZXC"[i] : "REROLLED", can ? C("#c8bcd8") : C("#5a5068"), 1, rr.x + rr.width / 2f, rr.y + 2, 1);
                }
            }
            if (Aug.picked < 0) HText("CLICK OR PRESS 1 2 3", C("#9a92b3"), 1, VW / 2f, 158, 1);
        }

        void DrawAugHud()
        {
            if (Aug.owned.Count == 0 && !Aug.enabled) return;
            float x = Art.VW - 6, y = Art.VH - 12;
            for (int i = Aug.owned.Count - 1; i >= 0; i--)
            {
                var a = Aug.Get(Aug.owned[i]);
                string[] words = a.name.Split(' ');
                string ab = words.Length > 1 ? "" + words[0][0] + words[1][0] : a.name.Substring(0, 2);
                x -= 12;
                HRect(x - 1, y - 1, 12, 10, (Color)Art.Outline);
                HRect(x, y, 10, 8, a.tier == "prism" ? Prism(i * 0.11f) * 0.7f + new Color(0, 0, 0, 0.3f) : (Color)C(Aug.TierDeep(a.tier)));
                HRect(x, y, 10, 1, (Color)C(Aug.TierHex(a.tier)));
                HText(ab, WhiteC, 1, x + 5, y + 1, 1);
                x -= 1;
            }
            DrawSetHud(Art.VW - 6, y - 18);
            if (Aug.enabled && W.waveN > 0)
            {
                int next = Mathf.CeilToInt((W.waveN + (W.waveState == "fight" ? 0 : 1)) / 5f) * 5;
                HText("AUGMENT AT FLOOR " + next, C("#9a92b3"), 1, Art.VW - 6, y - 9, 2);
            }
        }

        /// <summary>Clicks on augment cards or their reroll buttons. Returns true if the click belongs to the augment screen.</summary>
        bool AugClick(Vector2 hud)
        {
            if (W.waveState != "augment" || !Aug.Offering || Aug.picked >= 0) return false;
            for (int i = 0; i < Aug.offer.Count; i++)
            {
                if (Aug.RerollRect(i).Contains(hud)) { Aug.Reroll(i); return true; }
                if (Aug.CardRect(i).Contains(hud)) { Aug.Pick(i); return true; }
            }
            return true;
        }

        void InjPanel()
        {
            GUILayout.Label("Wounds  (Hurt = next level)");
            for (int k = 0; k < Inj.Count; k++)
            {
                GUILayout.BeginHorizontal();
                int l = Inj.lv[k];
                GUI.color = Inj.iron[k] ? (Color)C("#8a94a8") : (Color)C(DollCol[Mathf.Min(3, l)]);
                GUILayout.Label(Inj.Ko[k] + ": " + (Inj.iron[k] ? "IRON" : l == 0 ? "ok" : Inj.St[k][l]), GUILayout.Width(170));
                GUI.color = Color.white;
                GUI.enabled = l < Inj.Max[k];
                if (GUILayout.Button("Hurt", GUILayout.Width(60))) Inj.Force(k);
                GUI.enabled = true;
                GUILayout.EndHorizontal();
            }
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("Heal all")) Inj.Reset();
            Inj.enabled = GUILayout.Toggle(Inj.enabled, "Wounds on");
            GUILayout.EndHorizontal();
            GUILayout.Label("Augments  (every 5 floors)");
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("Pick one now")) Aug.OpenNow();
            if (GUILayout.Button("Clear")) { Aug.Reset(); Inj.Mod = Inj.Calc(); }
            Aug.enabled = GUILayout.Toggle(Aug.enabled, "On");
            GUILayout.EndHorizontal();
            foreach (var id in Aug.owned)
            {
                var a = Aug.Get(id);
                GUI.color = (Color)C(Aug.TierHex(a.tier));
                GUILayout.Label(a.name + "  " + a.ko);
                GUI.color = Color.white;
            }
        }
    }
}
