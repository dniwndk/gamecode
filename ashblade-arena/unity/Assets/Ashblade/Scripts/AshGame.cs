using System.Collections.Generic;
using UnityEngine;

namespace Ashblade
{
    /// <summary>
    /// Drop this on an empty GameObject in an empty scene and press Play.
    /// It builds the cameras, the 320x180 pixel render target, the layers and the game, then runs the loop.
    /// The world renders at 320x180 and is upscaled with point filtering; zoom punch and chromatic aberration happen
    /// when the image is presented, the HUD and the lab panel are drawn on top with OnGUI.
    /// </summary>
    public partial class AshGame : MonoBehaviour
    {
        [Tooltip("Show the lab panel (toggle with F1)")] public bool showPanel = true;
        [Tooltip("Show the state readout inside the panel (toggle with Tab)")] public bool showStatus = true;

        const int ORD_FLOOR = -30000, ORD_DECAL = -29999, ORD_GROUND = -29000, ORD_GHOST = -28000, ORD_SHADOW = -27000;
        const int ORD_FRONT = 10000, ORD_VIG = 11000, ORD_GLOW = 12000, ORD_TEXT = 13000, ORD_TOP = 20000;

        static readonly object[][] Grades =
        {
            new object[] { 0, "D", "#9a92b3" }, new object[] { 5, "C", "#8fdcff" }, new object[] { 12, "B", "#8be3a6" },
            new object[] { 22, "A", "#ffd166" }, new object[] { 35, "S", "#ff6a5a" },
        };

        Camera worldCam, displayCam;
        RenderTexture rt;
        Overlay ground, front, plBack, plFront, top;
        SpritePool pool;
        SpriteRenderer decalSr;
        Texture2D white;
        float ox, oy, sc = 4f, fps = 60f, fpsAcc;
        int fpsN;
        Vector2? mouseBuf;
        Rect panelRect;
        Vector2 panelScroll;

        struct GlowReq { public float x, y, r, a; public Color c; }
        readonly List<GlowReq> glows = new List<GlowReq>();

        static AshTuning T { get { return AshTuning.I; } }
        static Color32 C(string hex) { return Col.H(hex); }
        static readonly Color32 WhiteC = new Color32(255, 255, 255, 255);

        // =========================================================================== setup
        void Awake()
        {
            var tuning = GetComponent<AshTuning>();
            if (tuning == null) tuning = gameObject.AddComponent<AshTuning>();
            AshTuning.I = tuning;

            Art.Init();
            PlayerSheet.Init();
            Mats.Sprite = MakeMat("AshSprite");
            Mats.Additive = MakeMat("AshAdditive");
            Mats.Present = MakeMat("AshPresent");

            rt = new RenderTexture(Art.VW, Art.VH, 16) { filterMode = FilterMode.Point, name = "AshView" };
            rt.Create();
            worldCam = new GameObject("World Camera").AddComponent<Camera>();
            worldCam.transform.SetParent(transform, false);
            worldCam.orthographic = true;
            worldCam.orthographicSize = Art.VH / 2f / Art.PPU;
            worldCam.clearFlags = CameraClearFlags.SolidColor;
            worldCam.backgroundColor = C("#0b0912");
            worldCam.nearClipPlane = 0.1f; worldCam.farClipPlane = 50f;
            worldCam.targetTexture = rt;
            worldCam.depth = 0;

            displayCam = new GameObject("Display Camera").AddComponent<Camera>();
            displayCam.transform.SetParent(transform, false);
            displayCam.cullingMask = 0;
            displayCam.clearFlags = CameraClearFlags.SolidColor;
            displayCam.backgroundColor = Color.black;
            displayCam.depth = 10;
            displayCam.gameObject.AddComponent<AudioListener>();
            foreach (var l in FindObjectsOfType<AudioListener>()) if (l.gameObject != displayCam.gameObject) l.enabled = false;
            var main = Camera.main;
            if (main != null && main != worldCam && main != displayCam) main.enabled = false;

            var audio = GetComponent<AshAudio>();
            if (audio == null) audio = gameObject.AddComponent<AshAudio>();
            audio.Init(displayCam.gameObject);

            var root = new GameObject("World").transform;
            root.SetParent(transform, false);
            var floor = new GameObject("Floor").AddComponent<SpriteRenderer>();
            floor.transform.SetParent(root, false);
            floor.sprite = Art.Floor; floor.sortingOrder = ORD_FLOOR;
            floor.transform.position = new Vector3(Art.FloorX0, Art.FloorY0, 0f);
            decalSr = new GameObject("Decals").AddComponent<SpriteRenderer>();
            decalSr.transform.SetParent(root, false);
            decalSr.sprite = Art.DecalSprite; decalSr.sortingOrder = ORD_DECAL;
            decalSr.transform.position = new Vector3(Art.FloorX0, Art.FloorY0, 0f);
            if (Mats.Sprite != null) { floor.sharedMaterial = Mats.Sprite; decalSr.sharedMaterial = Mats.Sprite; }

            ground = new Overlay("Ground FX", ORD_GROUND, root);
            plBack = new Overlay("Player Back", 0, root);
            plFront = new Overlay("Player Front", 0, root);
            front = new Overlay("Front FX", ORD_FRONT, root);
            top = new Overlay("Top", ORD_TOP, root);
            pool = new SpritePool(root, Mats.Additive);

            white = new Texture2D(1, 1) { filterMode = FilterMode.Point };
            white.SetPixel(0, 0, Color.white); white.Apply();

            W.player = new Player();
            W.ResetAll();
        }

        static Material MakeMat(string res)
        {
            var sh = Resources.Load<Shader>(res);
            if (sh == null || !sh.isSupported) return null;
            return new Material(sh) { name = res };
        }

        void OnDestroy()
        {
            if (rt != null) rt.Release();
            if (AshAudio.I != null) AshAudio.I.Charge(false);
            AshInput.Rumble(0f, 0f, 0f);
        }

        // =========================================================================== loop
        void Update()
        {
            float raw = Mathf.Min(0.05f, Time.unscaledDeltaTime);
            fpsAcc += raw; fpsN++;
            if (fpsAcc > 0.5f) { fps = fpsN / fpsAcc; fpsAcc = 0f; fpsN = 0; }
            AshInput.Tick();
            LabKeys();
            ReadInput();

            if (!W.paused)
            {
                W.realTime += raw;
                W.UpdateFx(raw);
                float dt = Aug.Choosing || Run.Choosing ? 0f : raw * W.labSlow * W.slowScale; // time stops while an augment or a door is being chosen
                W.time += dt;
                Inj.Update(dt);
                Run.Update(dt);
                W.player.Update(dt);
                Ench.Update(dt);
                foreach (var e in W.enemies.ToArray()) e.Update(dt * Ench.TimeScale(e));
                W.enemies.RemoveAll(e => !e.alive);
                W.UpdateProjectiles(dt);
                W.UpdatePickups(dt);
                W.UpdateParts(dt);
                W.UpdateWaves(dt, raw);
                if (W.comboTimer > 0f) { W.comboTimer -= dt; if (W.comboTimer <= 0f) W.combo = 0; }
                UpdateGrade();
                W.UpdateCamera(raw);
            }
            In.attack = In.dash = In.burst = false;
            Render();
        }

        void UpdateGrade()
        {
            if (W.combo >= 2)
            {
                int gi = 0;
                for (int i = 0; i < Grades.Length; i++) if (W.combo >= (int)Grades[i][0]) gi = i;
                if (gi > W.gradeIdx && W.gradeIdx >= 0) { W.gradePop = 0.35f; W.Sfx("grade", 1f, 0.05f, 0.8f); }
                W.gradeIdx = gi;
            }
            else W.gradeIdx = W.combo > 0 ? 0 : -1;
        }

        void LabKeys()
        {
            if (AshInput.PanelDown()) showPanel = !showPanel;
            if (AshInput.HudDown()) showStatus = !showStatus;
            if (AshInput.PauseDown()) W.paused = !W.paused;
            if (AshInput.ResetDown()) W.ResetAll();
            if (AshInput.SlowMoDown()) W.labSlow = W.labSlow < 1f ? 1f : 0.25f;
            if (AshInput.ToggleAimDown()) In.aimWithMouse = !In.aimWithMouse;
            bool augScreen = W.waveState == "augment" && Aug.Offering;
            if (augScreen) for (int i = 0; i < 3; i++) if (AshInput.RerollDown(i)) Aug.Reroll(i);
            for (int d = 0; d <= 9; d++)
            {
                if (!AshInput.DigitDown(d)) continue;
                if (augScreen) { if (d >= 1 && d <= 3) Aug.Pick(d - 1); continue; }
                if (W.waveState == "menu" && Run.menu != null) { if (d >= 1) Run.Pick(d - 1); continue; }
                if (W.waveState == "reward" && Ench.Offering && d >= 1 && d <= 3) { Ench.Pick(d - 1); continue; }
                if (d == 0)
                {
                    bool anyOn = false;
                    for (int i = 0; i < AshTuning.BasicNames.Length; i++) anyOn |= T.GetBasic(i);
                    for (int i = 0; i < AshTuning.JuiceNames.Length - 1; i++) anyOn |= T.GetJuice(i);
                    T.Preset(anyOn ? 2 : 0);
                }
                else T.SetBasic(d - 1, !T.GetBasic(d - 1));
            }
            if (!T.sound && AshAudio.I != null) AshAudio.I.Charge(false);
        }

        void ReadInput()
        {
            In.move = AshInput.Move();
            In.aimStick = AshInput.AimStick();
            if (AshInput.MouseMoved()) AshInput.PadActive = false;
            bool overPanel = false;
            mouseBuf = null;
            var ms = AshInput.MouseScreen();
            if (ms.HasValue)
            {
                Vector2 gui = new Vector2(ms.Value.x, Screen.height - ms.Value.y);
                overPanel = showPanel && panelRect.Contains(gui);
                float vx = (gui.x - ox) / sc, vy = (gui.y - oy) / sc;
                float z = Mathf.Max(0.5f, W.zoom);
                vx = Art.VW / 2f + (vx - Art.VW / 2f) / z; vy = Art.VH / 2f + (vy - Art.VH / 2f) / z;
                if (vx >= 0 && vy >= 0 && vx < Art.VW && vy < Art.VH) mouseBuf = new Vector2(vx, vy);
            }
            In.mouseWorld = mouseBuf.HasValue ? (Vector2?)(Vector2)View.ScreenToWorld(mouseBuf.Value.x, mouseBuf.Value.y) : null;
            bool atk = AshInput.AttackPressed(), dash = AshInput.DashPressed(), burst = AshInput.BurstPressed();
            if (overPanel) atk = false;
            if (atk && ms.HasValue && AugClick(new Vector2((ms.Value.x - ox) / sc, (Screen.height - ms.Value.y - oy) / sc))) atk = false;
            if (atk && ms.HasValue && MenuClick(new Vector2((ms.Value.x - ox) / sc, (Screen.height - ms.Value.y - oy) / sc))) atk = false;
            if (atk && ms.HasValue && W.waveState == "reward" && Ench.Offering && Ench.picked < 0)
            {
                Vector2 hud = new Vector2((ms.Value.x - ox) / sc, (Screen.height - ms.Value.y - oy) / sc);
                for (int i = 0; i < Ench.offer.Count; i++) if (Ench.CardRect(i).Contains(hud)) { Ench.Pick(i); atk = false; }
            }
            In.attack |= atk; In.dash |= dash; In.burst |= burst;
            In.attackHeld = AshInput.AttackHeld() && !(overPanel && !W.player.wasHeld);
        }

        // =========================================================================== render
        void Glow(float x, float y, float r, Color c, float a)
        {
            if (!T.glow || a <= 0.01f) return;
            glows.Add(new GlowReq { x = x, y = y, r = r, c = c, a = a });
        }
        static Color Rgb(float r, float g, float b) { return new Color(r / 255f, g / 255f, b / 255f, 1f); }

        void Render()
        {
            worldCam.transform.position = new Vector3(View.camX / Art.PPU, View.camY / Art.PPU, -10f);
            if (Art.DecalsDirty) { Art.Decals.Upload(Art.DecalTex); Art.DecalsDirty = false; }
            decalSr.enabled = T.decals;
            ground.Begin(); front.Begin(); plBack.Begin(); plFront.Begin(); top.Begin();
            glows.Clear();

            if (W.impact != null)
            {
                DrawImpactFrame();
                ground.End(false); front.End(false); plBack.End(false); plFront.End(false); top.End(true);
                pool.End();
                return;
            }

            DrawTorches();
            DrawTelegraphs();
            DrawBackParts();
            DrawPlayer();
            foreach (var e in W.enemies) DrawEnemy(e);
            DrawPickups();
            DrawLimbs();
            DrawProjectiles();
            DrawEnchFx();
            DrawBeams();
            DrawFrontParts();
            DrawSmear();
            pool.Draw(Art.Vignette, 0, 0, ORD_VIG);
            DrawHeadFxWorld();
            var p = W.player;
            if (p.hp / p.maxHp < 0.3f && p.state != "Dead")
                pool.Draw(Art.RedVignette, 0, 0, ORD_VIG + 1, 1, 1, false, new Color(1, 1, 1, 0.25f + 0.2f * Mathf.Max(0f, Mathf.Sin(W.realTime * 7f))));
            foreach (var g in glows)
            {
                var c = g.c; c.a = Mathf.Min(1f, g.a);
                float s = g.r * 2f / 64f;
                pool.Draw(Art.Glow, g.x, g.y, ORD_GLOW, s, s, false, c, true);
            }
            DrawTextParts();
            DrawCrosshair();

            ground.End(); front.End(); plBack.End(); plFront.End(); top.End();
            pool.End();
        }

        static int EntityOrder(Vector2 pos) { return -Mathf.RoundToInt(pos.y * Art.PPU) * 10; }

        void DrawTorches()
        {
            foreach (float tx in Art.Torches)
            {
                var s = View.ToScreen(tx, 10.05f);
                float fl = Mathf.Sin(W.realTime * 13f + tx) * 0.5f + Mathf.Sin(W.realTime * 23f + tx * 3f) * 0.5f;
                int hgt = 6 + Mathf.RoundToInt(fl * 1.5f);
                for (int y = 0; y < hgt; y++)
                {
                    int wdt = Mathf.Max(1, Mathf.RoundToInt((1f - (float)y / hgt) * 3.2f));
                    int off = Mathf.RoundToInt(Mathf.Sin(W.realTime * 17f + y + tx) * ((float)y / hgt) * 1.4f);
                    ground.Rect(s.x - (wdt >> 1) + off, s.y - y - 1, wdt, 1, y < 2 ? C("#fff3a0") : y < hgt * 0.6f ? C("#ffb43c") : C("#e85a2a"));
                }
                Glow(s.x, s.y - 4, 34 + fl * 3, Rgb(255, 140, 60), 0.35f);
                Glow(s.x, s.y - 3, 10, Rgb(255, 220, 140), 0.5f);
                if (Random.value < 0.04f && T.particles)
                    W.P(new Part { type = PT.Ember, x = tx + M.Rand(-0.1f, 0.1f), y = 10.3f, vx = M.Rand(-0.5f, 0.5f), vy = M.Rand(0.5f, 1.5f), life = 0.9f, max = 0.9f, ramp = "fire", seed = M.Rand(0, 10) });
            }
        }

        void DrawTelegraphs()
        {
            var o = ground;
            foreach (var e in W.enemies)
            {
                if (e.state == "Spawn")
                {
                    var s0 = View.ToScreen(e.pos);
                    float k0 = e.stateTime / 0.8f, r = (e.kind == EnemyKind.Brute ? 15f : 10f) * M.EaseOut(k0 * 1.4f);
                    Color32 col = e.kind == EnemyKind.Wisp ? C("#b07ae8") : C("#ff7a3a");
                    o.Ring(s0.x, s0.y, r, 1, col, false, 0.6f);
                    o.Ring(s0.x, s0.y, r * 0.65f, 1, col, true, 0.6f);
                    for (int i = 0; i < 6; i++) { float a = W.realTime * 3f + i / 6f * M.TAU; o.Plot(s0.x + Mathf.Cos(a) * r * 0.82f, s0.y + Mathf.Sin(a) * r * 0.82f * 0.6f, C("#ffe0b0")); }
                    Glow(s0.x, s0.y, r * 1.6f, e.kind == EnemyKind.Wisp ? Rgb(170, 100, 255) : Rgb(255, 110, 50), 0.35f * k0);
                    continue;
                }
                if (e.state != "Windup") continue;
                float k = Mathf.Clamp01(e.stateTime * 60f / e.Windup);
                bool blink = Mathf.FloorToInt(e.stateTime * 60f / 4f) % 2 == 0;
                var sp = View.ToScreen(e.pos);
                int sx = sp.x, sy = sp.y;
                Color32 red = C("#ff4040"), edgeCol = C("#c83040");
                if (DrawRunTelegraph(e, sx, sy, k, blink)) continue;
                if (e.Lunger)
                {
                    float L = ((e.move == "charge" ? 14f * 20f : 11f * 11f) / 60f + e.radius + 0.3f) * Art.PPU, Wd = e.radius * Art.PPU + 1f;
                    float dx = e.aimDir.x, dy = -e.aimDir.y, px = -dy, py = dx;
                    int minx = Mathf.FloorToInt(Mathf.Min(sx, sx + dx * L) - Wd - 1), maxx = Mathf.CeilToInt(Mathf.Max(sx, sx + dx * L) + Wd + 1);
                    int miny = Mathf.FloorToInt(Mathf.Min(sy, sy + dy * L) - Wd - 1), maxy = Mathf.CeilToInt(Mathf.Max(sy, sy + dy * L) + Wd + 1);
                    for (int y = miny; y <= maxy; y++)
                        for (int x = minx; x <= maxx; x++)
                        {
                            float rx = x + 0.5f - sx, ry = y + 0.5f - sy, along = rx * dx + ry * dy, across = Mathf.Abs(rx * px + ry * py);
                            if (along < 0 || along > L || across > Wd) continue;
                            bool edge = across > Wd - 1 || along > L - 1;
                            if (edge) o.Plot(x, y, k > 0.72f ? (blink ? WhiteC : red) : edgeCol);
                            else if (along < L * k) { if (((x + y) & 1) == 1) o.Plot(x, y, C("#ff3c3c"), 0.55f); }
                            else if ((((x + y) % 3) + 3) % 3 == 0) o.Plot(x, y, C("#ff3c3c"), 0.25f);
                        }
                }
                else if (e.Slammer)
                {
                    int R = Mathf.RoundToInt(e.K.slamR * Art.PPU);
                    for (int y = -R; y <= R; y++)
                        for (int x = -R; x <= R; x++)
                        {
                            float d = Mathf.Sqrt(x * x + (y / 0.75f) * (y / 0.75f));
                            if (d > R) continue;
                            if (d > R - 1.2f) o.Plot(sx + x, sy + y, k > 0.75f ? (blink ? WhiteC : red) : edgeCol);
                            else if (d < R * k) { if (((x + y) & 1) == 1) o.Plot(sx + x, sy + y, C("#ff4632"), 0.5f); }
                            else if ((((x + y) % 3) + 3) % 3 == 0) o.Plot(sx + x, sy + y, C("#ff3c3c"), 0.22f);
                        }
                    Glow(sx, sy, R, Rgb(255, 50, 40), 0.25f * k);
                }
                else
                {
                    var c = View.ToScreen(e.Center);
                    float L = 9f * Art.PPU;
                    for (int i = 6; i < L; i += 3)
                    {
                        if ((i / 3) % 2 == Mathf.FloorToInt(W.realTime * 20f) % 2) continue;
                        o.Plot(c.x + e.aimDir.x * i, c.y - e.aimDir.y * i, k > 0.7f && blink ? WhiteC : C("#c08af0"));
                    }
                }
            }
        }

        void DrawShadow(Combatant c, int size)
        {
            var s = View.ToScreen(c.pos);
            var sh = Art.Shadows[size];
            float shrink = Mathf.Clamp(1f - (c.z + c.Hover) / 40f, 0.5f, 1f);
            pool.Draw(sh, Mathf.Round(s.x - sh.rect.width / 2f), s.y - 2, ORD_SHADOW, 1, 1, false, new Color(1, 1, 1, shrink));
        }

        void DrawPlayer()
        {
            var p = W.player;
            var s = View.ToScreen(p.pos);
            int ord = EntityOrder(p.pos);
            plBack.Order = ord - 1; plFront.Order = ord + 3;
            DrawShadow(p, 10);
            Spr sheet = PlayerSheet.Pick(p);
            if (sheet != null) sheet = PlayerSheet.Masked(sheet);
            if (p.state == "Dead" && sheet != null) { pool.Draw(sheet.sprite, s.x, s.y, ord, 1f, 1f, p.flip); return; }
            if (p.state == "Dead")
            {
                float k = Mathf.Clamp01(p.deadT / 0.4f);
                pool.Draw(Art.PlayerStand.white, s.x, s.y, ord, 1f + k * 0.5f, 1f - k * 0.6f, p.flip, (Color)C("#6a4050"));
                return;
            }
            bool blinkOff = p.hurtInvuln > 0f && Mathf.FloorToInt(p.hurtInvuln * 20f) % 2 == 0 && p.freeze <= 0f;
            bool moving = p.vel.magnitude > 1f && (p.state == "Free" || p.state == "Charge");
            Spr spr = Art.PlayerStand;
            if (p.state == "Dash") spr = Art.PlayerRunA;
            else if (moving) spr = Mathf.FloorToInt(p.runT * 10f) % 2 == 1 ? Art.PlayerRunA : Art.PlayerRunB;
            else if (p.state == "Attack") spr = p.stateTime * 60f < p.cur.startup ? Art.PlayerRunB : Art.PlayerRunA;
            if (sheet != null) spr = sheet;
            int bob = moving && sheet == null ? Mathf.FloorToInt(p.runT * 10f) % 2 : 0;
            int vib = p.freeze > 0f && p.vibrate ? p.vibSign : 0;
            float scx = 1f + p.sq, scy = 1f - p.sq * 0.9f;
            int bx = s.x + vib, by = s.y - Mathf.RoundToInt(p.z) - bob + LimpOffset(p, moving);
            bool bladeUp = Mathf.Sin(p.blade) > 0.35f;
            if (sheet == null) DrawScarf(p);
            DrawBlade(p, bx, by, bladeUp ? plBack : plFront);
            if (!blinkOff)
            {
                pool.Draw(spr.sprite, bx, by, ord, scx, scy, p.flip);
                if (p.state == "Charge")
                {
                    float k = Mathf.Min(1f, p.chargeT / T.chargeTime);
                    if (p.charged ? Mathf.FloorToInt(W.realTime * 20f) % 2 == 1 : Random.value < k * 0.4f)
                        pool.Draw(spr.white, bx, by, ord + 1, scx, scy, p.flip, new Color(1f, 0.88f, 0.5f, 0.6f));
                }
                if (p.flashT > 0f && T.hitFlash) pool.Draw(spr.white, bx, by, ord + 2, scx, scy, p.flip, (Color)p.flashColor);
                DrawWounds(bx, by, p.flip);
            }
            if (p.state == "Charge") Glow(bx, by - 8, 12 + Mathf.Min(1f, p.chargeT / T.chargeTime) * 16f, Rgb(255, 170, 60), 0.4f);
            if (p.empowered > 0f) Glow(bx, by - 8, 18, Rgb(255, 210, 90), 0.25f + Mathf.Sin(W.realTime * 12f) * 0.08f);
            Glow(bx, by - 8, 26, Rgb(120, 180, 255), 0.08f);
        }

        void DrawScarf(Player p)
        {
            var sc = p.scarf;
            for (int i = 1; i < sc.Length; i++)
            {
                var a = View.ToScreen(sc[i - 1]); var b = View.ToScreen(sc[i]);
                plBack.Line(a.x, a.y, b.x, b.y, i < 3 ? C("#ec4a5a") : C("#9c2236"));
                if (i < 3) plBack.Line(a.x, a.y + 1, b.x, b.y + 1, C("#9c2236"));
            }
        }

        void DrawBlade(Player p, int bx, int by, Overlay o)
        {
            if (p.state == "Burst" && p.stateTime < 0.3f) return;
            int grip = Inj.Mod.grip, side = (p.flip ? -1 : 1) * (grip == 1 ? -1 : 1);
            float hx = bx + side * (grip == 2 ? 3 : 2), hy = by - (grip == 2 ? 13 : 6);
            float ca = Mathf.Cos(p.blade), sa = -Mathf.Sin(p.blade);
            bool active = p.state == "Attack" && p.stateTime * 60f >= p.cur.startup && p.stateTime * 60f < p.cur.startup + p.cur.active;
            float L = 12 + Mathf.Round(p.bladeExt) + (active ? 2 : 0);
            bool gold = p.empowered > 0f || (p.state == "Attack" && p.swingCrit) || (p.state == "Charge" && p.charged);
            Color32 steel = gold ? C("#ffe08a") : C("#d8e4f0"), edge = gold ? C("#fffbe0") : WhiteC;
            o.Line(hx - ca * 2, hy - sa * 2, hx, hy, C("#6a4a2a"));
            o.Line(hx - sa * 1.5f, hy + ca * 1.5f, hx + sa * 1.5f, hy - ca * 1.5f, C("#e8b84a"));
            o.Line(hx + ca * 2, hy + sa * 2, hx + ca * L, hy + sa * L, Art.Outline);
            o.Line(hx + ca * 2, hy + sa * 2 - 1, hx + ca * (L - 1), hy + sa * (L - 1) - 1, steel);
            o.Plot(hx + ca * L, hy + sa * L - 1, edge);
            if (active || gold) Glow(hx + ca * L * 0.7f, hy + sa * L * 0.7f, active ? 14 : 8, gold ? Rgb(255, 210, 90) : Rgb(160, 220, 255), active ? 0.45f : 0.25f);
        }

        static readonly Color32[] PalCrit = { M.Hex("#ffffff"), M.Hex("#fff3b0"), M.Hex("#ffd25a"), M.Hex("#ff9a2a") };
        static readonly Color32[] PalSpin = { M.Hex("#ffffff"), M.Hex("#ffe8b0"), M.Hex("#ffb43c"), M.Hex("#ff6a2a") };
        static readonly Color32[] PalHeavy = { M.Hex("#ffffff"), M.Hex("#ffe0b0"), M.Hex("#ffb070"), M.Hex("#e86a3a") };
        static readonly Color32[] PalLight = { M.Hex("#ffffff"), M.Hex("#c8f0ff"), M.Hex("#7cc8ff"), M.Hex("#3a7ae0") };

        void DrawSmear()
        {
            var p = W.player; var s = p.smear;
            if (s == null || !T.trails) return;
            var o = front;
            float age = 1f - s.life / s.max;
            var cc = View.ToScreen(p.Center.x, p.Center.y + p.z / Art.PPU);
            float cx = cc.x, cy = cc.y;
            var pal = s.crit ? PalCrit : s.kind == AttackKind.Spin ? PalSpin : s.heavy ? PalHeavy : PalLight;
            var enchPal = EnchSmearPalette(s.kind == AttackKind.Spin ? Ench.Skill : Ench.Basic);
            if (!s.crit && enchPal != null) pal = enchPal;
            if (s.kind == AttackKind.Thrust)
            {
                float L = s.r * (1f - age * 0.3f), dx = s.dir.x, dy = -s.dir.y;
                for (int i = 4; i < L; i++)
                {
                    int w = Mathf.Max(0, Mathf.RoundToInt((1f - i / L) * 3f * (1f - age)));
                    float x = cx + dx * i, y = cy + dy * i;
                    for (int k = -w; k <= w; k++) o.Plot(Mathf.Round(x - dy * k), Mathf.Round(y + dx * k), Mathf.Abs(k) == w ? pal[2] : i > L * 0.7f ? pal[0] : pal[1]);
                }
                Glow(cx + dx * L * 0.6f, cy + dy * L * 0.6f, 20, Rgb(160, 220, 255), 0.4f * (1f - age));
                return;
            }
            float span = s.a1 - s.a0, dirSign = span >= 0 ? 1f : -1f, absSpan = Mathf.Min(M.TAU, Mathf.Abs(span));
            if (absSpan < 0.05f) return;
            float R = s.r, r0 = R * (s.kind == AttackKind.Spin ? 0.45f : 0.35f), thin = age * 0.6f;
            int x0 = Mathf.FloorToInt(cx - R - 1), x1 = Mathf.CeilToInt(cx + R + 1), y0 = Mathf.FloorToInt(cy - R - 1), y1 = Mathf.CeilToInt(cy + R + 1);
            for (int y = y0; y <= y1; y++)
                for (int x = x0; x <= x1; x++)
                {
                    float dx = x + 0.5f - cx, dy = -(y + 0.5f - cy), r = Mathf.Sqrt(dx * dx + dy * dy);
                    if (r > R || r < r0) continue;
                    float back = (s.a1 - Mathf.Atan2(dy, dx)) * dirSign;
                    back = ((back % M.TAU) + M.TAU) % M.TAU;
                    if (back > absSpan) continue;
                    float k = 1f - back / absSpan;
                    float innerHere = Mathf.Lerp(R - 2, r0, Mathf.Clamp01(k * 1.8f - thin));
                    if (r < innerHere) continue;
                    float radial = (r - innerHere) / Mathf.Max(1f, R - innerHere);
                    if (k < age * 0.9f) continue;
                    int ci = radial > 0.8f ? 0 : radial > 0.5f ? 1 : radial > 0.25f ? 2 : 3;
                    if (k < 0.35f) ci = Mathf.Min(3, ci + 1);
                    if (age > 0.5f && ((x + y) & 1) == 1) continue;
                    o.b.Set(x, y, pal[ci]);
                }
            float hxx = cx + Mathf.Cos(s.a1) * R * 0.75f, hyy = cy - Mathf.Sin(s.a1) * R * 0.75f;
            Glow(hxx, hyy, s.heavy ? 34 : 24, s.crit ? Rgb(255, 210, 90) : s.heavy || s.kind == AttackKind.Spin ? Rgb(255, 160, 70) : Rgb(120, 200, 255), 0.5f * (1f - age));
        }

        void DrawEnemy(Enemy e)
        {
            if (e.state == "Spawn") return;
            var s = View.ToScreen(e.pos);
            int ord = EntityOrder(e.pos);
            DrawShadow(e, e.kind == EnemyKind.Boss ? 28 : e.kind == EnemyKind.Brute ? 20 : e.kind == EnemyKind.Wisp || e.kind == EnemyKind.Bomber ? 10 : 12);
            int vib = (e.freeze > 0f && e.vibrate) || (e.state == "Windup" && e.kind != EnemyKind.Wisp) ? e.vibSign : 0;
            float scx = (1f + e.sq) * e.size, scy = (1f - e.sq * 0.9f) * e.size;
            if (e.state == "Dead") { float k = Mathf.Clamp01(e.deadT / 0.2f); scx *= 1f + k * 0.3f; scy *= 1f - k * 0.2f; }
            float idle = e.state == "Chase" ? Mathf.Sin(W.realTime * 8f + e.seed) * 0.05f : 0f;
            scx += idle; scy -= idle;
            int x = s.x + vib, y = s.y - Mathf.RoundToInt(e.z + e.Hover);
            if (e.elite) { pool.Draw(e.spr.white, x, y + 1, ord - 1, scx * 1.12f, scy * 1.08f, e.flip, new Color(1f, 0.82f, 0.4f, 0.45f + 0.2f * Mathf.Sin(W.realTime * 8f))); Glow(x, y - 8, 22, Rgb(255, 210, 90), 0.35f); }
            pool.Draw(e.spr.sprite, x, y, ord, scx, scy, e.flip);
            if (e.cursed) pool.Draw(e.spr.white, x, y, ord + 1, scx, scy, e.flip, new Color(0.54f, 0.29f, 0.82f, 0.22f + 0.1f * Mathf.Sin(W.realTime * 5f + e.seed)));
            if (e.elite) for (int i = -1; i <= 1; i++) front.Plot(x + i * 2, y - Mathf.RoundToInt(e.spr.h * scy) - 2 - (i != 0 ? 0 : 1), C("#ffd166"));
            float f = e.stateTime * 60f;
            if (e.state == "Windup")
            {
                float k = f / e.Windup;
                if ((k > 0.5f && Mathf.FloorToInt(f / 3f) % 2 == 0) || (k <= 0.5f && Mathf.FloorToInt(f / 6f) % 2 == 0))
                    pool.Draw(e.spr.white, x, y, ord + 1, scx, scy, e.flip, new Color(1f, 0.25f, 0.25f, 0.55f));
                if (e.SuperArmor) pool.Draw(e.spr.white, x, y, ord + 1, scx, scy, e.flip, new Color(1f, 0.69f, 0.31f, 0.25f + 0.15f * Mathf.Sin(W.realTime * 30f)));
                float pop = e.telePop > 0f ? 1f + e.telePop * 4f : 1f;
                var bang = PixelFont.Spr("!", k > 0.7f ? WhiteC : C("#ff4a4a"), 2);
                pool.Draw(bang, x, Mathf.Round(y - e.spr.h - 6 + (pop - 1f) * 4f), ORD_FRONT + 5, pop, pop);
                if (e.kind == EnemyKind.Wisp)
                {
                    var c = View.ToScreen(e.Center + e.aimDir * 0.45f);
                    front.Ring(c.x, c.y, 1 + k * 3, 1 + (int)(k * 2), k > 0.7f && Mathf.FloorToInt(f / 3f) % 2 == 1 ? WhiteC : C("#d8a8ff"), false, 1f);
                    Glow(c.x, c.y, 6 + k * 14, Rgb(190, 120, 255), 0.6f);
                }
            }
            if (e.flashT > 0f && T.hitFlash) pool.Draw(e.spr.white, x, y, ord + 2, scx, scy, e.flip, (Color)e.flashColor);
            DrawEnemyStatus(e, x, y, ord);
            if (e.broken > 0f)
                for (int i = 0; i < 3; i++) { float a = W.realTime * 6f + i / 3f * M.TAU; front.Plot(x + Mathf.Cos(a) * 8f, y - e.spr.h - 2 + Mathf.Sin(a) * 2f, i > 0 ? C("#ffe066") : WhiteC); }
            if (e.kind == EnemyKind.Brute) Glow(x + (e.flip ? -1 : 1), y - e.spr.h + 5, 8, Rgb(255, 120, 40), 0.5f);
            if (e.kind == EnemyKind.Grunt) Glow(x, y - 6, 6, Rgb(255, 200, 180), 0.12f);
            if (e.kind == EnemyKind.Wisp) Glow(x, y - 7, 16, Rgb(170, 100, 255), 0.35f);
            if (e.kind == EnemyKind.Healer) Glow(x, y - 7, 12, Rgb(150, 240, 110), 0.3f);
            if (e.kind == EnemyKind.Boss) Glow(x, y - 12, 26, Rgb(255, 110, 50), 0.35f + 0.1f * Mathf.Sin(W.realTime * 6f));
            if ((e.hpShowT > 0f || e.hp < e.maxHp) && e.state != "Dead" && e.kind != EnemyKind.Boss)
            {
                int w = e.kind == EnemyKind.Brute ? 22 : 14, bx = Mathf.RoundToInt(x - w / 2f), byy = y - e.spr.h - 3;
                front.Rect(bx - 1, byy - 1, w + 2, 4, Art.Outline);
                front.Rect(bx, byy, w, 2, C("#3a1a24"));
                front.Rect(bx, byy, Mathf.RoundToInt(w * e.hpGhost / e.maxHp), 2, WhiteC);
                front.Rect(bx, byy, Mathf.RoundToInt(w * e.hp / e.maxHp), 2, e.broken > 0f ? C("#ffb43c") : C("#f24d5a"));
                if (e.K.armor) for (int i = 0; i < e.K.poise; i++) front.Rect(bx + i * 4, byy + 3, 3, 1, i < e.poise ? C("#c8d0e0") : C("#3a3450"));
            }
        }

        void DrawProjectiles()
        {
            foreach (var pr in W.projectiles)
            {
                var s = View.ToScreen(pr.pos);
                int yy = s.y - Mathf.RoundToInt(pr.h);
                pool.Draw(Art.Shadows[6], s.x - 3, s.y - 1, ORD_SHADOW);
                bool enemy = pr.owner == Owner.Enemy; bool pulse = Mathf.FloorToInt(W.realTime * 20f) % 2 == 1;
                front.Ring(s.x, yy, 3, 3, enemy ? C("#8a4ad0") : C("#3a9ee8"), false, 1f);
                front.Ring(s.x, yy, 2, 2, enemy ? C("#d8a8ff") : C("#bff0ff"), false, 1f);
                front.Plot(s.x, yy, WhiteC);
                if (pulse) { front.Plot(s.x - 1, yy, WhiteC); front.Plot(s.x, yy - 1, WhiteC); }
                Glow(s.x, yy, 14, enemy ? Rgb(180, 100, 255) : Rgb(110, 210, 255), 0.7f);
            }
        }

        static readonly string[] Heart = { ".r.r.", "rRRRr", "rRRRr", ".rRr.", "..r.." };
        void DrawPickups()
        {
            foreach (var k in W.pickups)
            {
                var s = View.ToScreen(k.pos);
                int y = s.y - Mathf.RoundToInt(k.z) - 3 - Mathf.RoundToInt(Mathf.Sin(W.realTime * 8f + k.pos.x * 3f));
                pool.Draw(Art.Shadows[6], s.x - 3, s.y - 1, ORD_SHADOW);
                if (!k.heart)
                {
                    front.Rect(s.x - 1, y - 1, 2, 2, C("#fff3b0")); front.Rect(s.x - 1, y + 1, 2, 1, C("#ffb43c"));
                    Glow(s.x, y, 8, Rgb(255, 190, 80), 0.55f);
                }
                else
                {
                    for (int yy = 0; yy < 5; yy++)
                        for (int xx = 0; xx < 5; xx++)
                        {
                            char c = Heart[yy][xx];
                            if (c != '.') front.Plot(s.x - 2 + xx, y - 3 + yy, c == 'R' ? C("#ff6a7a") : C("#c8283c"));
                        }
                    Glow(s.x, y, 12, Rgb(255, 90, 110), 0.5f);
                }
            }
        }

        Color GlowOf(string ramp)
        {
            Color c;
            return ramp != null && W.GlowCol.TryGetValue(ramp, out c) ? c : W.GlowCol["fire"];
        }

        void DrawBackParts()
        {
            foreach (var p in W.parts)
            {
                float k = p.life / p.max;
                if (p.type == PT.Smoke)
                {
                    var s = View.ToScreen(p.x, p.y);
                    int r = Mathf.RoundToInt(Mathf.Lerp(p.r0, p.r1, M.EaseOut(1f - k)));
                    float a = Mathf.Min(1f, k * 1.6f) * 0.85f;
                    for (int yy = -r; yy <= r; yy++)
                    {
                        int ww = Mathf.RoundToInt(Mathf.Sqrt(r * r - yy * yy));
                        if (k < 0.5f && (yy & 1) == 1) continue;
                        ground.Rect(s.x - ww, s.y + yy, ww * 2 + 1, 1, p.col, a);
                    }
                }
                else if (p.type == PT.Ghost && p.spr != null)
                {
                    var s = View.ToScreen(p.x, p.y);
                    Color c = p.col; c.a = 0.6f * k;
                    pool.Draw(p.spr.white, s.x, s.y, ORD_GHOST, 1, 1, p.flip, c);
                }
            }
        }

        void DrawFrontParts()
        {
            var o = front;
            foreach (var p in W.parts)
            {
                float k = p.life / p.max;
                switch (p.type)
                {
                    case PT.Spark:
                    {
                        var s = View.ToScreen(p.x, p.y);
                        float sp = Mathf.Sqrt(p.vx * p.vx + p.vy * p.vy);
                        int n = p.inward ? 2 : Mathf.RoundToInt(Mathf.Clamp(sp * 0.45f, 1, 6));
                        float dx = sp > 0 ? p.vx / sp : 0, dy = sp > 0 ? -p.vy / sp : 0;
                        var col = W.RampCol(p.ramp, k);
                        for (int i = 0; i < n; i++) o.b.Set(Mathf.RoundToInt(s.x - dx * i), Mathf.RoundToInt(s.y - dy * i), col);
                        if (k > 0.6f) Glow(s.x, s.y, 5, GlowOf(p.ramp), 0.25f * k);
                        break;
                    }
                    case PT.Star:
                    {
                        var s = View.ToScreen(p.x, p.y);
                        float sz = p.size * (0.5f + k * 0.7f), ca = Mathf.Cos(p.ang), sa = -Mathf.Sin(p.ang);
                        var col = W.RampCol(p.ramp, k);
                        o.Line(s.x - ca * sz * 0.5f, s.y - sa * sz * 0.5f, s.x + ca * sz * 1.4f, s.y + sa * sz * 1.4f, col);
                        o.Line(s.x + sa * sz * 0.55f, s.y - ca * sz * 0.55f, s.x - sa * sz * 0.55f, s.y + ca * sz * 0.55f, col);
                        o.Line(s.x - sz * 0.35f, s.y - sz * 0.35f, s.x + sz * 0.35f, s.y + sz * 0.35f, col);
                        o.Line(s.x - sz * 0.35f, s.y + sz * 0.35f, s.x + sz * 0.35f, s.y - sz * 0.35f, col);
                        o.Rect(s.x - 1, s.y - 1, 3, 3, WhiteC);
                        Glow(s.x, s.y, sz * 3, GlowOf(p.ramp), 0.8f * k);
                        break;
                    }
                    case PT.Ring:
                    {
                        var s = View.ToScreen(p.x, p.y);
                        float r = Mathf.Lerp(p.r0, p.r1, M.EaseOut(1f - k));
                        o.Ring(s.x, s.y, r, Mathf.Max(1, Mathf.RoundToInt(p.w * k + 0.5f)), W.RampCol(p.ramp, k), k < 0.4f, p.squash);
                        break;
                    }
                    case PT.Debris:
                    {
                        if (k < 0.25f && Mathf.FloorToInt(p.life * 30f) % 2 == 1) break;
                        var s = View.ToScreen(p.x, p.y);
                        int sz = Mathf.Max(1, Mathf.RoundToInt(p.size));
                        o.Rect(s.x, s.y - Mathf.RoundToInt(p.z), sz, sz, p.col);
                        break;
                    }
                    case PT.Ember:
                    {
                        var s = View.ToScreen(p.x, p.y);
                        o.Plot(s.x, s.y, W.RampCol(p.ramp, k * 0.8f + 0.1f));
                        Glow(s.x, s.y, 4, GlowOf(p.ramp), 0.3f * k);
                        break;
                    }
                    case PT.Line:
                    {
                        var s = View.ToScreen(p.x, p.y);
                        float sp = Mathf.Sqrt(p.vx * p.vx + p.vy * p.vy); if (sp <= 0f) sp = 1f;
                        o.Line(s.x, s.y, s.x + p.vx / sp * p.len, s.y - p.vy / sp * p.len, k > 0.5f ? WhiteC : C("#9ab0d0"));
                        break;
                    }
                }
            }
        }

        void DrawTextParts()
        {
            foreach (var p in W.parts)
            {
                if (p.type != PT.Text || p.img == null) continue;
                float k = p.life / p.max;
                if (k < 0.2f && Mathf.FloorToInt(p.life * 30f) % 2 == 1) continue;
                var s = View.ToScreen(p.x, p.y);
                float age = p.max - p.life, sz = 1f + Mathf.Max(0f, p.pop - 1f) * Mathf.Max(0f, 1f - age / 0.1f);
                pool.Draw(p.img, s.x, Mathf.Round(s.y - p.z), ORD_TEXT, sz, sz);
            }
        }

        void DrawCrosshair()
        {
            if (!In.aimWithMouse || !mouseBuf.HasValue || AshInput.PadActive) return;
            int mx = Mathf.RoundToInt(mouseBuf.Value.x), my = Mathf.RoundToInt(mouseBuf.Value.y);
            Color32 col = W.player.empowered > 0f ? C("#ffe066") : WhiteC;
            top.Rect(mx - 4, my - 1, 9, 3, Art.Outline); top.Rect(mx - 1, my - 4, 3, 9, Art.Outline);
            top.Rect(mx - 3, my, 2, 1, col); top.Rect(mx + 2, my, 2, 1, col); top.Rect(mx, my - 3, 1, 2, col); top.Rect(mx, my + 2, 1, 2, col);
        }

        void DrawImpactFrame()
        {
            var im = W.impact;
            float k = 1f - im.t / im.max; bool invert = k > 0.55f;
            Color32 bg = invert ? C("#f4ecf6") : C("#0a0610"), fg = invert ? C("#0a0610") : WhiteC;
            top.b.Clear(bg);
            var c = View.ToScreen(im.x, im.y);
            float sd = im.seed;
            System.Func<float> rnd = () => { sd = (sd * 9301f + 49297f) % 233280f; return sd / 233280f; };
            for (int i = 0; i < 28; i++)
            {
                float a = rnd() * M.TAU, w = 0.02f + rnd() * 0.05f, r0 = 26f + rnd() * 40f + k * 60f, r1 = 420f;
                FillTri(top.b, c.x + Mathf.Cos(a) * r0, c.y + Mathf.Sin(a) * r0, c.x + Mathf.Cos(a - w) * r1, c.y + Mathf.Sin(a - w) * r1, c.x + Mathf.Cos(a + w) * r1, c.y + Mathf.Sin(a + w) * r1, fg);
            }
            var list = im.silh.Count > 0 ? im.silh : new List<Combatant> { W.player };
            foreach (var cb in list)
            {
                if (cb == null) continue;
                var s = View.ToScreen(cb.pos);
                Spr spr = cb is Enemy ? ((Enemy)cb).spr : (PlayerSheet.Pick(W.player) ?? Art.PlayerRunA);
                pool.Draw(spr.white, s.x, s.y - Mathf.Round(cb.z + cb.Hover), ORD_TOP + 1, 1f + cb.sq, 1f - cb.sq * 0.9f, cb.flip, (Color)fg);
            }
        }

        static void FillTri(PixBuf b, float x0, float y0, float x1, float y1, float x2, float y2, Color32 c)
        {
            int minY = Mathf.Max(0, Mathf.FloorToInt(Mathf.Min(y0, Mathf.Min(y1, y2)))), maxY = Mathf.Min(b.h - 1, Mathf.CeilToInt(Mathf.Max(y0, Mathf.Max(y1, y2))));
            for (int y = minY; y <= maxY; y++)
            {
                float py = y + 0.5f, lo = float.MaxValue, hi = float.MinValue;
                Edge(x0, y0, x1, y1, py, ref lo, ref hi); Edge(x1, y1, x2, y2, py, ref lo, ref hi); Edge(x2, y2, x0, y0, py, ref lo, ref hi);
                if (lo > hi) continue;
                int xa = Mathf.Max(0, Mathf.CeilToInt(lo - 0.5f)), xb = Mathf.Min(b.w - 1, Mathf.FloorToInt(hi - 0.5f));
                for (int x = xa; x <= xb; x++) b.Set(x, y, c);
            }
        }
        static void Edge(float ax, float ay, float bx, float by, float py, ref float lo, ref float hi)
        {
            if ((py < ay && py < by) || (py > ay && py > by) || ay == by) return;
            float x = ax + (py - ay) / (by - ay) * (bx - ax);
            if (x < lo) lo = x; if (x > hi) hi = x;
        }

        // =========================================================================== present + HUD
        void OnGUI()
        {
            sc = Mathf.Min(Screen.width / (float)Art.VW, Screen.height / (float)Art.VH);
            if (sc >= 2f) sc = Mathf.Floor(sc);
            ox = Mathf.Round((Screen.width - Art.VW * sc) / 2f); oy = Mathf.Round((Screen.height - Art.VH * sc) / 2f);
            panelRect = new Rect(Screen.width - 290, 10, 280, Mathf.Min(Screen.height - 20, 780));
            if (Event.current.type == EventType.Repaint)
            {
                var view = new Rect(ox, oy, Art.VW * sc, Art.VH * sc);
                float z = Mathf.Max(0.5f, W.zoom), u = 1f / z;
                var src = new Rect(0.5f - u / 2f, 0.5f - u / 2f, u, u);
                int shift = Mathf.RoundToInt(W.chroma * 3f);
                if (Mats.Present != null)
                {
                    Mats.Present.SetFloat("_Shift", shift * W.chromaDir / Art.VW);
                    Graphics.DrawTexture(view, rt, src, 0, 0, 0, 0, Mats.Present);
                }
                else GUI.DrawTextureWithTexCoords(view, rt, src);
                DrawDoubleVision(view, src);
                DrawHud();
            }
            if (showPanel) DrawPanel();
            else { GUI.color = new Color(1, 1, 1, 0.6f); GUI.Label(new Rect(Screen.width - 120, 8, 112, 22), "F1  Lab panel"); GUI.color = Color.white; }
        }

        void HRect(float x, float y, float w, float h, Color c)
        {
            if (w <= 0 || h <= 0) return;
            GUI.color = c;
            GUI.DrawTexture(new Rect(ox + x * sc, oy + y * sc, w * sc, h * sc), white);
            GUI.color = Color.white;
        }

        Texture2D HText(string str, Color32 col, int s, float x, float y, int align = 0, float scale = 1f, float alpha = 1f)
        {
            var t = PixelFont.Tex(str, col, s);
            float w = t.width * scale, h = t.height * scale;
            float xx = align == 1 ? x - w / 2f : align == 2 ? x - w : x;
            GUI.color = new Color(1, 1, 1, alpha);
            GUI.DrawTexture(new Rect(ox + Mathf.Round(xx) * sc, oy + Mathf.Round(y) * sc, w * sc, h * sc), t);
            GUI.color = Color.white;
            return t;
        }

        void Bar(float x, float y, float w, float h, float frac, float? ghost, Color col, string back = "#2a1420")
        {
            HRect(x - 1, y - 1, w + 2, h + 2, (Color)Art.Outline);
            HRect(x, y, w, h, (Color)C(back));
            if (ghost.HasValue) HRect(x, y, Mathf.Round(w * Mathf.Clamp01(ghost.Value)), h, Color.white);
            HRect(x, y, Mathf.Round(w * Mathf.Clamp01(frac)), h, col);
            HRect(x, y, Mathf.Round(w * Mathf.Clamp01(frac)), 1, new Color(1, 1, 1, 0.25f));
        }

        void DrawHud()
        {
            var p = W.player; float rtm = W.realTime;
            const int VW = Art.VW, VH = Art.VH;
            bool low = p.hp / p.maxHp < 0.3f;
            HText("HP", C("#ff8a9a"), 1, 6, 6);
            Bar(22, 8, 88, 5, p.hp / p.maxHp, p.hpGhost / p.maxHp, low && Mathf.FloorToInt(rtm * 6f) % 2 == 1 ? (Color)C("#ff9aa0") : (Color)C("#e8414f"));
            HText(Mathf.CeilToInt(p.hp).ToString(), WhiteC, 1, 114, 6);
            bool full = p.meter >= 100f;
            HText("ASH", full ? C("#ffd166") : C("#ff9a3c"), 1, 6, 15);
            for (int i = 0; i < 4; i++)
            {
                float seg = Mathf.Clamp01((p.meter - i * 25f) / 25f);
                Bar(26 + i * 16, 17, 14, 3, seg, null, full ? (Mathf.FloorToInt(rtm * 10f) % 2 == 1 ? Color.white : (Color)C("#ffd166")) : (Color)C("#ff9a3c"), "#2a1a10");
            }
            if (full) HText(AshInput.PadActive ? "Y BURST" : "Q BURST", Mathf.FloorToInt(rtm * 4f) % 2 == 1 ? C("#ffd166") : WhiteC, 1, 92, 15);
            if (p.empowered > 0f) HText("CRIT READY", Mathf.FloorToInt(rtm * 8f) % 2 == 1 ? C("#ffe066") : WhiteC, 1, 6, 24);
            DrawInjHud(8, 34);
            HText("SHARDS " + Run.shards, Run.shardFlash > 0f ? WhiteC : C("#ffe066"), 1, 6, 70);
            DrawBossBar();
            if (W.waveN > 0)
            {
                HText("FLOOR " + W.waveN + (Run.mod == "cursed" ? " CURSED" : Run.mod == "elite" ? " ELITE" : ""),
                    C(Run.mod == "cursed" ? "#c08af0" : Run.mod == "elite" ? "#ffd166" : "#c8bcd8"), 1, VW / 2f, 5, 1);
                int left = W.queue.Count; foreach (var e in W.enemies) if (e.alive) left++;
                for (int i = 0; i < Mathf.Min(left, 14); i++)
                {
                    HRect(VW / 2f - left * 2 + i * 4 - 1, 13, 4, 4, (Color)Art.Outline);
                    HRect(VW / 2f - left * 2 + i * 4, 14, 2, 2, (Color)C("#ff6a5a"));
                }
            }
            if (W.combo >= 2 && W.gradeIdx >= 0)
            {
                var gr = Grades[W.gradeIdx];
                Color32 gcol = C((string)gr[2]);
                float j = W.comboJolt * 2f;
                var num = PixelFont.Tex(W.combo.ToString(), WhiteC, 3);
                float nx = VW - 8 - num.width + M.Rand(-j, j), ny = 6 + M.Rand(-j, j) - W.comboJolt * 3f;
                HText(W.combo.ToString(), WhiteC, 3, nx, ny);
                HText("HITS", C("#c8bcd8"), 1, VW - 8, 6 + num.height, 2);
                float gp = W.gradePop > 0f ? 1f + W.gradePop * 3f : 1f;
                var gImg = PixelFont.Tex((string)gr[1], gcol, 4);
                HText((string)gr[1], gcol, 4, nx - 6 - gImg.width * gp, 4 - (gImg.height * gp - gImg.height) / 2f, 0, gp);
                const float bw = 40f;
                HRect(VW - 8 - bw - 1, 6 + num.height + 9, bw + 2, 3, (Color)Art.Outline);
                HRect(VW - 8 - bw, 6 + num.height + 10, Mathf.Round(bw * W.comboTimer / 2.5f), 1, (Color)gcol);
            }
            if (W.bannerText != null && W.bannerT > 0f)
            {
                float age = W.bannerMax - W.bannerT, s = age < 0.12f ? 1f + (1f - age / 0.12f) * 2f : 1f;
                float outA = W.bannerT < 0.25f && W.bannerMax < 50f ? W.bannerT / 0.25f : 1f;
                var img = PixelFont.Tex(W.bannerText, W.bannerColor, 4);
                HRect(0, VH * 0.38f - 5, VW, W.bannerSub != null ? 48 : 38, new Color(8 / 255f, 4 / 255f, 12 / 255f, 0.55f * outA));
                HText(W.bannerText, W.bannerColor, 4, VW / 2f - img.width * s / 2f, VH * 0.38f - (img.height * s - img.height) / 2f, 0, s, outA);
                if (W.bannerSub != null && age > 0.2f) HText(W.bannerSub, C("#c8bcd8"), 1, VW / 2f, VH * 0.38f + 33, 1, 1f, outA);
            }
            DrawEnchHud();
            DrawEnchCards();
            DrawAugHud();
            DrawAugCards();
            DrawMenu();
            DrawResults();
            if (W.labSlow < 1f) HText("SLOW X0.25", C("#8fdcff"), 1, 6, VH - 10);
            if (W.paused) { HRect(0, 0, VW, VH, new Color(8 / 255f, 4 / 255f, 12 / 255f, 0.6f)); HText("PAUSED", WhiteC, 3, VW / 2f, VH / 2f - 10, 1); }
            if (W.flashT > 0f) { var fc = W.flashColor; fc.a = W.flashA * (W.flashT / W.flashMax); HRect(0, 0, VW, VH, fc); }
        }

        void DrawPanel()
        {
            GUILayout.BeginArea(panelRect, GUI.skin.box);
            panelScroll = GUILayout.BeginScrollView(panelScroll);
            GUILayout.Label("<b>ASHBLADE LAB</b>   (F1 hide)", new GUIStyle(GUI.skin.label) { richText = true });
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("Full juice")) T.Preset(0);
            if (GUILayout.Button("V1 level")) T.Preset(1);
            if (GUILayout.Button("All off")) T.Preset(2);
            GUILayout.EndHorizontal();
            GUILayout.Label("Basic  (keys 1-9, 0 = all on/off)");
            for (int i = 0; i < AshTuning.BasicNames.Length; i++)
            {
                bool v = T.GetBasic(i), nv = GUILayout.Toggle(v, (i + 1) + "  " + AshTuning.BasicNames[i]);
                if (nv != v) T.SetBasic(i, nv);
            }
            GUILayout.Label("Juice");
            for (int i = 0; i < AshTuning.JuiceNames.Length; i++)
            {
                bool v = T.GetJuice(i), nv = GUILayout.Toggle(v, AshTuning.JuiceNames[i]);
                if (nv != v) T.SetJuice(i, nv);
            }
            EnchPanel();
            InjPanel();
            RunPanel();
            GUILayout.Space(4);
            T.hitstopScale = Slider("Hitstop x", T.hitstopScale, 0f, 3f);
            T.shakeScale = Slider("Shake x", T.shakeScale, 0f, 3f);
            T.knockbackScale = Slider("Knockback x", T.knockbackScale, 0f, 3f);
            T.bufferWindow = Slider("Buffer (s)", T.bufferWindow, 0.05f, 0.4f);
            GUILayout.BeginHorizontal();
            if (GUILayout.Button(W.labSlow < 1f ? "Slow-mo off (T)" : "Slow-mo x0.25 (T)")) W.labSlow = W.labSlow < 1f ? 1f : 0.25f;
            if (GUILayout.Button("Reset (R)")) W.ResetAll();
            GUILayout.EndHorizontal();
            if (showStatus)
            {
                var p = W.player;
                GUILayout.Label("State  " + p.StateName + "\nCombo  " + W.combo + " (best " + W.bestCombo + ")   Kills " + W.kills + "   Hit " + p.hitsTaken +
                    "\nTime  x" + (W.labSlow * W.slowScale).ToString("0.00") + "   fps " + Mathf.RoundToInt(fps) + "   parts " + W.parts.Count +
                    "\nAim  " + (AshInput.PadActive ? "gamepad" : In.aimWithMouse ? "mouse (M)" : "move dir (M)"));
            }
            GUILayout.Label("Move WASD   Attack J / LMB (hold = spin)\nDash Space / Shift / K   Burst Q / E / L\nPause P   Status Tab");
            GUILayout.EndScrollView();
            GUILayout.EndArea();
        }

        static float Slider(string label, float v, float min, float max)
        {
            GUILayout.BeginHorizontal();
            GUILayout.Label(label, GUILayout.Width(86));
            v = GUILayout.HorizontalSlider(v, min, max);
            GUILayout.Label(v.ToString("0.00"), GUILayout.Width(36));
            GUILayout.EndHorizontal();
            return v;
        }
    }
}
