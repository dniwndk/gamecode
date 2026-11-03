using UnityEngine;

namespace Ashblade
{
    /// <summary>Drawing, HUD and lab panel for the run layer: boss, new foes, doors, shop, sanctuary, sets, results (logic in AshRun.cs).</summary>
    public partial class AshGame
    {
        /// <summary>Wind-up warnings for the bomber, healer and the boss's volley / summon. Returns true if it drew one.</summary>
        bool DrawRunTelegraph(Enemy e, int sx, int sy, float k, bool blink)
        {
            var o = ground;
            if (e.kind == EnemyKind.Bomber)
            {
                float R = e.K.blastR * Art.PPU;
                o.Ring(sx, sy, R, 1, k > 0.6f && blink ? WhiteC : C("#ff7a2a"), false, 0.75f);
                o.Ring(sx, sy, R * k, 1, C("#ffb43c"), true, 0.75f);
                Glow(sx, sy - 4, 10 + k * 14, Rgb(255, 150, 60), 0.4f + k * 0.4f);
                return true;
            }
            if (e.kind == EnemyKind.Healer)
            {
                var c = View.ToScreen(e.Center);
                front.Ring(c.x, c.y, 3 + k * 6, 1, k > 0.7f && blink ? WhiteC : C("#a8f070"), false, 1f);
                return true;
            }
            if (e.move == "volley")
            {
                for (int i = 0; i < 14; i++)
                {
                    float a = i / 14f * M.TAU + W.realTime;
                    for (float r = 14; r < 14 + k * 26; r += 3) o.Plot(sx + Mathf.Cos(a) * r, sy - 10 - Mathf.Sin(a) * r * 0.8f, blink && k > 0.7f ? WhiteC : C("#ff7a3a"));
                }
                return true;
            }
            if (e.move == "summon") { o.Ring(sx, sy, 34 * k, 1, C("#c08af0"), true, 0.6f); return true; }
            return false;
        }

        void DrawBeams()
        {
            foreach (var b in Run.beams)
            {
                var a = View.ToScreen(b.a.Center); var c = View.ToScreen(b.b.Center); float k = b.life / b.max;
                front.Line(a.x, a.y - 1, c.x, c.y - 1, Art.Outline);
                front.Line(a.x, a.y, c.x, c.y, k > 0.5f ? C("#e8ffd0") : C("#5cc04a"));
                Glow(c.x, c.y, 14, Rgb(150, 240, 110), 0.6f * k);
            }
        }

        void DrawBossBar()
        {
            var b = Run.Boss();
            if (b == null) return;
            const float w = 170f; float x = Art.VW / 2f - w / 2f, y = 29f;
            HText(b.title, C("#ff9a7a"), 1, Art.VW / 2f, y - 8, 1);
            Bar(x, y, w, 4, b.hp / b.maxHp, b.hpGhost / b.maxHp, b.broken > 0f ? (Color)C("#ffb43c") : (Color)C("#e8414f"));
            if (b.midBoss) HRect(Mathf.Round(x + w * 0.5f), y, 1, 4, (Color)Art.Outline);
            else { HRect(Mathf.Round(x + w * 0.66f), y, 1, 4, (Color)Art.Outline); HRect(Mathf.Round(x + w * 0.33f), y, 1, 4, (Color)Art.Outline); }
            for (int i = 0; i < b.K.poise; i++) HRect(x + i * 5, y + 6, 4, 1, i < b.poise ? (Color)C("#c8d0e0") : (Color)C("#3a3450"));
        }

        void DrawMenu()
        {
            var m = Run.menu;
            if (m == null || W.waveState != "menu" || m.t < 0f) return;
            const int VW = Art.VW, VH = Art.VH;
            HRect(0, 0, VW, VH, new Color(8 / 255f, 4 / 255f, 12 / 255f, 0.72f));
            HText(m.title, WhiteC, 2, VW / 2f, 14, 1);
            if (m.kind == "shop") HText("SHARDS " + Run.shards, C("#ffe066"), 1, VW / 2f, 30, 1);
            else if (!string.IsNullOrEmpty(m.sub)) HText(m.sub, C("#9a92b3"), 1, VW / 2f, 30, 1);
            var hover = HudMouse();
            int n = m.items.Count;
            for (int i = 0; i < n; i++)
            {
                var it = m.items[i];
                Rect r = Run.MenuRect(i, n);
                float appear = Mathf.Clamp01((m.t - i * 0.07f) / 0.2f);
                if (m.picked < 0) r.y += (1f - M.EaseOut(appear)) * 30f; else appear = 1f;
                if (m.deny == i && m.denyT > 0f) r.x += Mathf.Round(Mathf.Sin(m.denyT * 60f) * 2f);
                bool chosen = m.picked == i, other = m.picked >= 0 && !chosen;
                bool hov = hover.HasValue && r.Contains(hover.Value) && m.picked < 0 && !it.sold;
                bool poor = it.cost > 0 && Run.shards < it.cost;
                float al = appear * (other || it.sold ? 0.3f : 1f);
                Color col = (Color)C(it.col);
                HRect(r.x - 2, r.y - 2, r.width + 4, r.height + 4, WithA((Color)Art.Outline, al));
                HRect(r.x - 1, r.y - 1, r.width + 2, r.height + 2, WithA(col, al));
                HRect(r.x, r.y, r.width, r.height, WithA(hov ? (Color)C("#2c2238") : (Color)C("#1a1424"), al));
                if (chosen) HRect(r.x, r.y, r.width, r.height, new Color(1, 1, 1, 0.3f + 0.25f * Mathf.Sin(W.realTime * 20f)));
                HRect(r.x, r.y, r.width, 2, WithA(col, al));
                HText((i + 1).ToString(), C("#9a92b3"), 1, r.x + 3, r.y + 4, 0, 1f, al);
                bool big = it.name.Length * 8 + 2 <= r.width - 4;
                HText(it.name, C(it.col), big ? 2 : 1, r.x + r.width / 2f, r.y + (big ? 16 : 18), 1, 1f, al);
                for (int j = 0; j < it.d.Length; j++) HText(it.d[j], C("#e8e0f0"), 1, r.x + r.width / 2f, r.y + 38 + j * 8, 1, 1f, al);
                if (it.cost > 0) HText(it.sold ? "SOLD" : it.cost + " SHARDS", it.sold ? C("#5a5068") : poor ? C("#ff6a6a") : C("#ffe066"), 1, r.x + r.width / 2f, r.y + r.height - 10, 1, 1f, al);
            }
            if (m.picked < 0) HText("CLICK OR PRESS 1-" + n, C("#9a92b3"), 1, VW / 2f, 160, 1);
        }

        /// <summary>Clicks on door / shop / sanctuary cards. Returns true if the click belongs to the menu.</summary>
        bool MenuClick(Vector2 hud)
        {
            var m = Run.menu;
            if (W.waveState != "menu" || m == null || m.picked >= 0) return false;
            for (int i = 0; i < m.items.Count; i++) if (Run.MenuRect(i, m.items.Count).Contains(hud)) { Run.Pick(i); return true; }
            return true;
        }

        void DrawResults()
        {
            var r = Run.results; var p = W.player;
            if (r == null || p.state != "Dead" || p.deadT < 1.1f) return;
            const int VW = Art.VW, VH = Art.VH;
            float a = Mathf.Clamp01((p.deadT - 1.1f) / 0.3f);
            HRect(0, 0, VW, VH, new Color(8 / 255f, 4 / 255f, 12 / 255f, 0.85f * a));
            HText("RUN OVER", C("#ff6a6a"), 3, VW / 2f, 10, 1, 1f, a);
            string[] k = { "FLOOR REACHED", "ENEMIES SLAIN", "BEST COMBO", "BOSSES FELLED", "LIMBS LOST", "AUGMENTS", "SHARDS LEFT" };
            int[] v = { r.floor, r.kills, r.combo, r.boss, r.limbs, r.augs, r.shards };
            for (int i = 0; i < k.Length; i++) { HText(k[i], C("#c8bcd8"), 1, 90, 36 + i * 9, 0, 1f, a); HText(v[i].ToString(), WhiteC, 1, 230, 36 + i * 9, 2, 1f, a); }
            HText("EMBERS +" + r.gain + "   TOTAL " + r.total, C("#ff9a3c"), 1, VW / 2f, 104, 1, 1f, a);
            float y = 116;
            foreach (int u in r.fresh) { HText("UNLOCKED: " + Run.UnlockName[u], C("#ffe066"), 1, VW / 2f, y, 1, 1f, a); y += 9; }
            for (int i = 0; i < Run.UnlockAt.Length; i++)
                if (Run.UnlockAt[i] > r.total) { HText("NEXT AT " + Run.UnlockAt[i] + ": " + Run.UnlockName[i], C("#9a92b3"), 1, VW / 2f, y + 2, 1, 1f, a); break; }
            if (Mathf.FloorToInt(W.realTime * 2f) % 2 == 1) HText("PRESS R TO RETRY", WhiteC, 1, VW / 2f, 164, 1, 1f, a);
        }

        /// <summary>Set progress above the augment icons (bottom right).</summary>
        void DrawSetHud(float x, float y)
        {
            foreach (var s in Run.Sets)
            {
                int c = Run.SetCount(s); if (c == 0) continue;
                HText(s.name + " " + Mathf.Min(3, c) + "/3" + (c >= 3 ? " ON" : ""), c >= 3 ? C(s.col) : C("#7a7090"), 1, x, y, 2);
                y -= 7;
            }
        }

        void RunPanel()
        {
            GUILayout.Label("Run  (10-floor cycle: 1-4 normal, 5 mid boss, 6-9 elite, 10 floor boss)");
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("Boss next"))
            {
                foreach (var e in W.enemies) if (e.alive) { e.hp = 0f; e.dying = true; }
                W.queue.Clear(); W.waveN = Run.NextBossFloor(W.waveN + 1) - 1; W.waveState = "clear"; W.waveT = 0.3f; Run.menu = null;
            }
            if (GUILayout.Button("Open doors")) { foreach (var e in W.enemies) if (e.alive) { e.hp = 0f; e.dying = true; } W.queue.Clear(); Run.OpenRoute(); }
            if (GUILayout.Button("+100 shards")) Run.GainShards(100, W.player.pos);
            GUILayout.EndHorizontal();
            foreach (var s in Run.Sets)
            {
                int c = Run.SetCount(s);
                GUI.color = c >= 3 ? (Color)C(s.col) : new Color(0.7f, 0.68f, 0.78f);
                GUILayout.Label(s.name + " " + Mathf.Min(3, c) + "/3: " + s.ko);
            }
            GUI.color = Color.white;
            Run.LoadMeta();
            GUILayout.Label("Embers " + Run.embers + "   best floor " + Run.best + "   runs " + Run.runs);
            if (GUILayout.Button("Reset permanent unlocks")) Run.ResetMeta();
        }
    }
}
