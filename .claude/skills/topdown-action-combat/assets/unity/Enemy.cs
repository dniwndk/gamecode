using System.Collections.Generic;
using UnityEngine;

namespace CombatProto
{
    /// <summary>
    /// Chaser: walks up, blinks red (telegraph), lunges, rests. Any hit staggers it.
    /// Passive = a training dummy that never attacks or dies.
    /// </summary>
    public class Enemy : Combatant
    {
        public static readonly List<Enemy> All = new List<Enemy>();

        enum State { Chase, Windup, Lunge, Recover, Stagger, Dead }

        State state = State.Chase;
        float stateTime;
        Vector2 lungeDir;
        bool lungeHit, dying;
        bool passive;
        SpriteRenderer hpBack, hpFill;

        const float BarWidthPx = 14f;

        public bool Hittable => Alive && !dying;

        void OnEnable() { All.Add(this); }
        void OnDisable() { All.Remove(this); }

        public void Init(bool passiveDummy, Vector2 at)
        {
            passive = passiveDummy;
            pos = at;
            radius = 0.35f;
            bodyHeight = 0.4f;
            maxHp = hp = passive ? 9999 : T.enemyHp;
            Sprite s, sil;
            if (passive) PixelArt.FromRows(PixelArt.DummyRows, PixelArt.DummyPal, out s, out sil);
            else PixelArt.FromRows(PixelArt.EnemyRows, PixelArt.EnemyPal, out s, out sil);
            BuildVisual(s, sil, 12);
            hpBack = MakeBar(new Color(0f, 0f, 0f, 0.6f), 30000);
            hpFill = MakeBar(new Color(0.95f, 0.3f, 0.3f), 30001);
            UpdateBar();
        }

        SpriteRenderer MakeBar(Color c, int order)
        {
            var r = new GameObject("HP").AddComponent<SpriteRenderer>();
            r.transform.SetParent(transform, false);
            r.sprite = PixelArt.Pixel;
            r.color = c;
            r.sortingOrder = order;
            r.transform.localPosition = new Vector3(0f, 1.05f, 0f);
            r.transform.localScale = new Vector3(BarWidthPx, 2f, 1f);
            r.enabled = !passive;
            return r;
        }

        void UpdateBar()
        {
            if (passive || hpFill == null) return;
            float w = Mathf.Max(0f, BarWidthPx * hp / (float)maxHp);
            hpFill.transform.localScale = new Vector3(w, 2f, 1f);
            hpFill.transform.localPosition = new Vector3((-BarWidthPx / 2f + w / 2f) / PixelArt.PPU, 1.05f, 0f);
        }

        /// <summary>Returns true when this hit kills.</summary>
        public bool ReceiveDamage(int dmg)
        {
            if (!Hittable) return false;
            if (!passive) hp -= dmg;
            UpdateBar();
            if (hp <= 0)
            {
                dying = true;
                return true;
            }
            state = State.Stagger;
            stateTime = 0f;
            return false;
        }

        protected override void Tick(float dt)
        {
            stateTime += dt;
            float f = stateTime * 60f;
            PlayerController p = PlayerController.I;

            if (dying)
            {
                // the kill hitstop has ended: burst and disappear
                dying = false;
                Alive = false;
                state = State.Dead;
                stateTime = 0f;
                SetVisible(false);
                Feel.I.DeathBurst(Center);
                return;
            }

            body.color = Color.white;
            switch (state)
            {
                case State.Dead:
                    if (stateTime > 1.5f) Respawn();
                    return;

                case State.Chase:
                    if (passive || p == null) break;
                    Vector2 to = p.pos - pos;
                    if (to.magnitude < 1.5f)
                    {
                        state = State.Windup;
                        stateTime = 0f;
                    }
                    else pos += to.normalized * T.enemySpeed * dt;
                    break;

                case State.Windup:
                    // telegraph: blink red before the lunge
                    body.color = Mathf.FloorToInt(f / 4f) % 2 == 0 ? new Color(1f, 0.45f, 0.45f) : Color.white;
                    if (f >= T.enemyWindupFrames)
                    {
                        state = State.Lunge;
                        stateTime = 0f;
                        lungeDir = p != null ? (p.pos - pos).normalized : Vector2.right;
                        if (lungeDir == Vector2.zero) lungeDir = Vector2.right;
                        lungeHit = false;
                        Feel.I.PlaySfx(SfxId.EnemyLunge, 0.1f, 0.6f);
                    }
                    break;

                case State.Lunge:
                    pos += lungeDir * 9f * dt;
                    if (!lungeHit && p != null && (p.pos - pos).magnitude < radius + p.radius + 0.25f)
                    {
                        lungeHit = true;
                        p.HurtBy(this, lungeDir);
                    }
                    if (f >= 10f)
                    {
                        state = State.Recover;
                        stateTime = 0f;
                    }
                    break;

                case State.Recover:
                    if (f >= 40f)
                    {
                        state = State.Chase;
                        stateTime = 0f;
                    }
                    break;

                case State.Stagger:
                    if (f >= T.enemyStaggerFrames)
                    {
                        state = passive ? State.Chase : State.Recover;
                        stateTime = passive ? 0f : 0.4f; // shorter rest after a stagger
                    }
                    break;
            }

            Separate(p);
            if (p != null && !passive) body.flipX = p.pos.x < pos.x;
        }

        void Separate(PlayerController p)
        {
            for (int i = 0; i < All.Count; i++)
            {
                Enemy o = All[i];
                if (o == this || !o.Alive) continue;
                Vector2 d = pos - o.pos;
                float m = d.magnitude, min = radius + o.radius;
                if (m < min && m > 0.0001f) pos += d / m * (min - m) * 0.5f;
            }
            if (p != null)
            {
                Vector2 d = pos - p.pos;
                float m = d.magnitude, min = radius + p.radius;
                if (m < min && m > 0.0001f) pos += d / m * (min - m);
            }
        }

        public void Respawn()
        {
            PlayerController p = PlayerController.I;
            Vector2 at = pos;
            for (int i = 0; i < 30; i++)
            {
                at = new Vector2(Random.Range(ArenaRect.xMin + 1f, ArenaRect.xMax - 1f),
                                 Random.Range(ArenaRect.yMin + 1f, ArenaRect.yMax - 1f));
                if (p == null || (at - p.pos).magnitude > 4.5f) break;
            }
            if (!passive) pos = at;
            ClearMotion();
            hp = maxHp;
            Alive = true;
            dying = false;
            state = State.Chase;
            stateTime = 0f;
            SetVisible(true);
            UpdateBar();
        }

        void SetVisible(bool v)
        {
            visual.gameObject.SetActive(v);
            shadow.enabled = v;
            hpBack.enabled = hpFill.enabled = v && !passive;
        }
    }
}
