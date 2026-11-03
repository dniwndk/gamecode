using System.Text;
using UnityEngine;

namespace CombatProto
{
    public enum SfxId { Hit, HitHeavy, Swing, SwingHeavy, Dash, Hurt, Kill, EnemyLunge }

    /// <summary>
    /// All "game feel" in one place: hitstop, screen shake, knockback, hit flash, sparks, sound,
    /// camera follow, the number-key toggles and the on-screen HUD.
    /// </summary>
    public class Feel : MonoBehaviour
    {
        public static Feel I { get; private set; }

        [HideInInspector] public Sprite[] hitSparkFrames;
        [HideInInspector] public float hitSparkFps = 24f;

        public int Kills { get; private set; }
        public int Combo { get; private set; }
        public int BestCombo { get; private set; }

        Camera cam;
        Vector2 camPos;
        Vector2 shakeDir;
        float shakeAmp, shakeTime, shakeDur;
        AudioSource[] sources;
        int sourceIndex;
        AudioClip[] clips;
        float comboTimer;
        bool showHud = true;
        GUIStyle hudStyle;

        static CombatTuning T => CombatTuning.I;

        public void Init(Camera camera)
        {
            I = this;
            cam = camera;
            sources = new AudioSource[8];
            for (int i = 0; i < sources.Length; i++)
            {
                sources[i] = gameObject.AddComponent<AudioSource>();
                sources[i].playOnAwake = false;
            }
            clips = SfxGen.All();
        }

        void OnDestroy() { if (I == this) I = null; }

        // ---- combat events ----------------------------------------------------------------

        public void Hit(Combatant attacker, Enemy victim, AttackData atk, Vector2 dir)
        {
            bool killed = victim.ReceiveDamage(atk.damage);
            float hs = T.hitstop ? atk.hitstopFrames / 60f * T.hitstopScale : 0f;
            if (killed) hs *= 1.6f;

            victim.Freeze(hs, true);
            attacker.Freeze(hs, false);
            if (T.hitFlash) victim.Flash(hs + 3f / 60f, Color.white);
            if (T.knockback) victim.Knock(dir * atk.knockback * T.knockbackScale * (killed ? 1.5f : 1f));

            Shake(dir, atk.shakePixels * (killed ? 1.6f : 1f), atk.shakeFrames + (killed ? 4 : 0));
            Vector2 point = victim.Center - dir * victim.radius * 0.6f;
            bool big = atk.heavy || killed;
            Sparks(point, dir, big ? 12 : 6, big ? 1.4f : 1f, 70f);
            SparkFlipbook(point, dir);
            PlaySfx(big ? SfxId.HitHeavy : SfxId.Hit, 0.12f, 1f);
            if (killed)
            {
                Kills++;
                PlaySfx(SfxId.Kill, 0.05f, 0.8f);
            }
            Combo++;
            comboTimer = 2f;
            if (Combo > BestCombo) BestCombo = Combo;
        }

        public void PlayerHurt(PlayerController p, Enemy src, Vector2 dir)
        {
            float hs = T.hitstop ? 6f / 60f * T.hitstopScale : 0f;
            p.Freeze(hs, true);
            src.Freeze(hs, false);
            if (T.hitFlash) p.Flash(hs + 4f / 60f, new Color(1f, 0.3f, 0.3f));
            if (T.knockback) p.Knock(dir * 9f * T.knockbackScale);
            Shake(dir, 3f, 10);
            PlaySfx(SfxId.Hurt, 0.05f, 0.9f);
            Combo = 0;
        }

        public void DeathBurst(Vector2 at)
        {
            Sparks(at, Vector2.up, 18, 1.5f, 360f);
            Shake(Random.insideUnitCircle, 2f, 6);
        }

        public static Vector2 AimAssist(Vector2 from, Vector2 dir, float maxAngle, float range)
        {
            Enemy best = null;
            float bestScore = float.MaxValue;
            for (int i = 0; i < Enemy.All.Count; i++)
            {
                Enemy e = Enemy.All[i];
                if (!e.Hittable) continue;
                Vector2 to = e.Center - from;
                float d = to.magnitude;
                if (d > range || d < 0.001f) continue;
                float ang = Vector2.Angle(dir, to);
                if (ang > maxAngle) continue;
                float score = ang + d * 10f;
                if (score < bestScore)
                {
                    bestScore = score;
                    best = e;
                }
            }
            return best != null ? (best.Center - from).normalized : dir;
        }

        // ---- effects ----------------------------------------------------------------------

        public void Shake(Vector2 dir, float px, int frames)
        {
            if (!T.shake || px <= 0f) return;
            px *= T.shakeScale;
            float remaining = shakeTime < shakeDur ? shakeAmp * (1f - shakeTime / shakeDur) : 0f;
            if (px < remaining) return;
            shakeDir = dir.sqrMagnitude > 0.0001f ? dir.normalized : Vector2.right;
            shakeAmp = px;
            shakeDur = frames / 60f;
            shakeTime = 0f;
        }

        void Sparks(Vector2 point, Vector2 dir, int count, float speedMul, float spreadDeg)
        {
            if (!T.sparks) return;
            float baseAng = Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg;
            for (int i = 0; i < count; i++)
            {
                float a = (baseAng + Random.Range(-spreadDeg / 2f, spreadDeg / 2f)) * Mathf.Deg2Rad;
                var v = new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * Random.Range(4f, 11f) * speedMul;
                var go = new GameObject("Spark");
                go.transform.position = point;
                var sr = go.AddComponent<SpriteRenderer>();
                sr.sprite = PixelArt.Pixel;
                sr.sortingOrder = 31000;
                go.AddComponent<SparkParticle>().Init(v, Random.Range(0.12f, 0.26f));
            }
        }

        void SparkFlipbook(Vector2 point, Vector2 dir)
        {
            if (!T.sparks || hitSparkFrames == null || hitSparkFrames.Length == 0) return;
            var go = new GameObject("HitSparkFX");
            go.transform.position = point;
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sortingOrder = 31001;
            sr.flipX = dir.x < 0f;
            go.AddComponent<Flipbook>().Init(hitSparkFrames, hitSparkFps);
        }

        public void Ghost(Sprite sprite, Vector3 at, bool flipX, int order)
        {
            var go = new GameObject("Afterimage");
            go.transform.position = at;
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = sprite;
            sr.flipX = flipX;
            sr.sortingOrder = order;
            sr.color = new Color(0.45f, 0.8f, 1f, 0.55f);
            go.AddComponent<Fader>().Init(0.18f);
        }

        public void PlaySfx(SfxId id, float pitchVariance, float volume)
        {
            if (!T.sound || clips == null) return;
            AudioSource src = sources[sourceIndex++ % sources.Length];
            src.pitch = 1f + Random.Range(-pitchVariance, pitchVariance);
            src.PlayOneShot(clips[(int)id], volume);
        }

        // ---- frame loop -------------------------------------------------------------------

        void Update()
        {
            if (T == null) return;
            if (ProtoInput.DigitDown(1)) T.hitstop = !T.hitstop;
            if (ProtoInput.DigitDown(2)) T.shake = !T.shake;
            if (ProtoInput.DigitDown(3)) T.knockback = !T.knockback;
            if (ProtoInput.DigitDown(4)) T.hitFlash = !T.hitFlash;
            if (ProtoInput.DigitDown(5)) T.inputBuffer = !T.inputBuffer;
            if (ProtoInput.DigitDown(6)) T.dashCancel = !T.dashCancel;
            if (ProtoInput.DigitDown(7)) T.aimAssist = !T.aimAssist;
            if (ProtoInput.DigitDown(8)) T.sparks = !T.sparks;
            if (ProtoInput.DigitDown(9)) T.sound = !T.sound;
            if (ProtoInput.DigitDown(0))
            {
                bool allOn = T.hitstop && T.shake && T.knockback && T.hitFlash && T.inputBuffer
                    && T.dashCancel && T.aimAssist && T.sparks && T.sound;
                bool v = !allOn;
                T.hitstop = T.shake = T.knockback = T.hitFlash = T.inputBuffer = v;
                T.dashCancel = T.aimAssist = T.sparks = T.sound = v;
            }
            if (ProtoInput.SlowMoDown()) Time.timeScale = Time.timeScale < 1f ? 1f : 0.25f;
            if (ProtoInput.HudDown()) showHud = !showHud;
            if (ProtoInput.ResetDown()) ResetAll();

            if (comboTimer > 0f)
            {
                comboTimer -= Time.deltaTime;
                if (comboTimer <= 0f) Combo = 0;
            }
        }

        void ResetAll()
        {
            for (int i = 0; i < Enemy.All.Count; i++) Enemy.All[i].Respawn();
            if (PlayerController.I != null) PlayerController.I.ResetState();
            Kills = Combo = BestCombo = 0;
        }

        void LateUpdate()
        {
            if (T == null || cam == null) return;
            PlayerController p = PlayerController.I;
            if (p != null)
            {
                Vector2 target = p.pos + new Vector2(0f, 0.4f) + p.AimDir * T.cameraLookAhead;
                camPos = Vector2.Lerp(camPos, target, 1f - Mathf.Exp(-8f * Time.deltaTime));
            }

            Vector2 off = Vector2.zero;
            if (shakeTime < shakeDur)
            {
                float k = 1f - shakeTime / shakeDur;
                float amp = shakeAmp * k * k / PixelArt.PPU;
                int frame = Mathf.FloorToInt(shakeTime * 60f);
                float sign = frame % 2 == 0 ? 1f : -0.6f;
                off = shakeDir * amp * sign + Random.insideUnitCircle * amp * 0.3f;
                shakeTime += Time.deltaTime;
            }

            Vector2 c = camPos + off;
            if (T.pixelSnap) c = PixelArt.Snap(c);
            cam.transform.position = new Vector3(c.x, c.y, -10f);
        }

        void OnGUI()
        {
            if (T == null) return;
            float scale = Mathf.Clamp(Screen.height / 720f, 1f, 3f);
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1f));
            if (hudStyle == null) hudStyle = new GUIStyle(GUI.skin.label) { richText = true, fontSize = 13 };

            if (!showHud)
            {
                GUI.Label(new Rect(10f, 8f, 300f, 22f), "[Tab] HUD", hudStyle);
                return;
            }

            PlayerController p = PlayerController.I;
            var sb = new StringBuilder();
            sb.AppendLine("<b>COMBAT FEEL PROTOTYPE</b>");
            Line(sb, 1, "Hitstop", T.hitstop);
            Line(sb, 2, "Screen shake", T.shake);
            Line(sb, 3, "Knockback", T.knockback);
            Line(sb, 4, "Hit flash", T.hitFlash);
            Line(sb, 5, "Input buffer", T.inputBuffer);
            Line(sb, 6, "Dash cancel", T.dashCancel);
            Line(sb, 7, "Aim assist", T.aimAssist);
            Line(sb, 8, "Sparks", T.sparks);
            Line(sb, 9, "Sound", T.sound);
            sb.AppendLine("[0] all on/off   [T] slow-mo   [R] reset");
            sb.AppendLine();
            if (p != null)
            {
                sb.AppendLine("State: " + p.StateName);
                sb.AppendLine("Aim: " + (p.AimWithMouse ? "mouse" : "move direction") + "  [M]");
                sb.AppendLine("Hits taken: " + p.HitsTaken);
            }
            sb.AppendLine("Combo: " + Combo + "  (best " + BestCombo + ")   Kills: " + Kills);
            if (Time.timeScale < 1f) sb.AppendLine("<color=#FFD166>SLOW-MO x0.25</color>");
            sb.AppendLine();
            sb.AppendLine("WASD move | LMB / J attack");
            sb.AppendLine("Space / Shift / RMB dash");
            sb.AppendLine("[Tab] hide");

            string text = sb.ToString();
            float h = hudStyle.CalcHeight(new GUIContent(text), 280f) + 12f;
            GUI.Box(new Rect(8f, 8f, 296f, h), GUIContent.none);
            GUI.Label(new Rect(16f, 12f, 280f, h), text, hudStyle);
        }

        static void Line(StringBuilder sb, int key, string label, bool on)
        {
            sb.Append('[').Append(key).Append("] ").Append(label).Append("  ");
            sb.AppendLine(on ? "<color=#7CFC7C>ON</color>" : "<color=#FF6B6B>OFF</color>");
        }
    }
}
