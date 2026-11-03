using UnityEngine;

namespace CombatProto
{
    /// <summary>
    /// Shared body for the player and enemies: logical position, knockback, per-body hitstop
    /// (freeze), hit flash, arena clamp and y-sorting.
    /// </summary>
    public abstract class Combatant : MonoBehaviour
    {
        public static readonly Rect ArenaRect = new Rect(-11f, -6f, 22f, 12f);

        public Vector2 pos;
        public float radius = 0.35f;
        public int maxHp = 100;
        public int hp = 100;
        public bool Alive = true;

        protected float bodyHeight = 0.45f;
        protected SpriteRenderer body, flash, shadow;
        protected Transform visual;

        Vector2 knockVel, pendingKnock;
        float freezeTimer, flashTimer;
        bool vibrate;
        int vibrateSign = 1;

        protected static CombatTuning T => CombatTuning.I;
        public Vector2 Center => pos + new Vector2(0f, bodyHeight);
        public bool Frozen => freezeTimer > 0f;

        protected void BuildVisual(Sprite sprite, Sprite silhouette, int shadowWidthPx)
        {
            shadow = new GameObject("Shadow").AddComponent<SpriteRenderer>();
            shadow.transform.SetParent(transform, false);
            shadow.sprite = PixelArt.Ellipse(shadowWidthPx, 5, new Color(0f, 0f, 0f, 0.35f));
            shadow.sortingOrder = -5000;

            visual = new GameObject("Visual").transform;
            visual.SetParent(transform, false);
            body = new GameObject("Body").AddComponent<SpriteRenderer>();
            body.transform.SetParent(visual, false);
            body.sprite = sprite;
            flash = new GameObject("Flash").AddComponent<SpriteRenderer>();
            flash.transform.SetParent(visual, false);
            flash.sprite = silhouette;
            flash.enabled = false;
            ApplyTransform();
        }

        /// <summary>Stops this body for a while. Its timers, movement and animation all pause.</summary>
        public void Freeze(float seconds, bool shakeBody)
        {
            if (seconds <= 0f) return;
            if (seconds > freezeTimer) freezeTimer = seconds;
            if (shakeBody) vibrate = true;
        }

        public void Flash(float seconds, Color color)
        {
            if (seconds <= 0f) return;
            flash.color = color;
            if (seconds > flashTimer) flashTimer = seconds;
        }

        /// <summary>Knockback waits until the freeze ends, so the hit lands first and the push follows.</summary>
        public void Knock(Vector2 velocity)
        {
            if (Frozen) pendingKnock = velocity;
            else knockVel = velocity;
        }

        protected void ClearMotion()
        {
            knockVel = Vector2.zero;
            pendingKnock = Vector2.zero;
            freezeTimer = 0f;
            flashTimer = 0f;
            vibrate = false;
            if (visual != null) visual.localPosition = Vector3.zero;
        }

        /// <summary>Runs every frame, even while frozen (used to read input).</summary>
        protected virtual void PreTick() { }

        /// <summary>Runs only while not frozen. dt is this body's own delta time.</summary>
        protected abstract void Tick(float dt);

        protected virtual void Update()
        {
            if (T == null || body == null) return;
            float dt = Time.deltaTime;
            PreTick();

            if (flashTimer > 0f) flashTimer -= dt;
            flash.enabled = flashTimer > 0f && body.enabled;

            if (freezeTimer > 0f)
            {
                freezeTimer -= dt;
                if (vibrate)
                {
                    vibrateSign = -vibrateSign;
                    visual.localPosition = new Vector3(vibrateSign / PixelArt.PPU, 0f, 0f);
                }
                if (freezeTimer <= 0f)
                {
                    visual.localPosition = Vector3.zero;
                    vibrate = false;
                    if (pendingKnock != Vector2.zero) knockVel = pendingKnock;
                    pendingKnock = Vector2.zero;
                }
                ApplyTransform();
                return;
            }

            if (knockVel.sqrMagnitude > 0.0004f)
            {
                pos += knockVel * dt;
                knockVel *= Mathf.Exp(-14f * dt);
            }
            else knockVel = Vector2.zero;

            Tick(dt);

            pos.x = Mathf.Clamp(pos.x, ArenaRect.xMin + radius, ArenaRect.xMax - radius);
            pos.y = Mathf.Clamp(pos.y, ArenaRect.yMin + radius * 0.5f, ArenaRect.yMax - 0.6f);
            ApplyTransform();
        }

        protected void ApplyTransform()
        {
            Vector2 p = pos;
            if (T != null && T.pixelSnap) p = PixelArt.Snap(p);
            transform.position = new Vector3(p.x, p.y, 0f);
            if (body == null) return;
            int order = Mathf.RoundToInt(-pos.y * 16f);
            body.sortingOrder = order;
            flash.sortingOrder = order + 1;
            flash.flipX = body.flipX;
        }
    }
}
