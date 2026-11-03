using UnityEngine;

namespace CombatProto
{
    /// <summary>A stretched pixel that flies out of a hit and cools from white to orange.</summary>
    public class SparkParticle : MonoBehaviour
    {
        Vector2 vel;
        float life, maxLife;
        SpriteRenderer sr;

        public void Init(Vector2 velocity, float lifetime)
        {
            vel = velocity;
            life = maxLife = lifetime;
            sr = GetComponent<SpriteRenderer>();
            Update();
        }

        void Update()
        {
            float dt = Time.deltaTime;
            life -= dt;
            if (life <= 0f)
            {
                Destroy(gameObject);
                return;
            }
            vel *= Mathf.Exp(-7f * dt);
            transform.position += (Vector3)(vel * dt);
            float k = life / maxLife;
            sr.color = new Color(1f, Mathf.Lerp(0.55f, 1f, k), Mathf.Lerp(0.15f, 0.9f, k), 1f);
            float ang = Mathf.Atan2(vel.y, vel.x) * Mathf.Rad2Deg;
            transform.rotation = Quaternion.Euler(0f, 0f, ang);
            float len = Mathf.Clamp(vel.magnitude * 0.5f, 1f, 5f);
            transform.localScale = new Vector3(len, k > 0.5f ? 2f : 1f, 1f);
        }
    }

    /// <summary>Fades a sprite out, then removes it (dash afterimages).</summary>
    public class Fader : MonoBehaviour
    {
        float life, maxLife, startAlpha;
        SpriteRenderer sr;

        public void Init(float lifetime)
        {
            sr = GetComponent<SpriteRenderer>();
            life = maxLife = lifetime;
            startAlpha = sr.color.a;
        }

        void Update()
        {
            life -= Time.deltaTime;
            if (life <= 0f)
            {
                Destroy(gameObject);
                return;
            }
            Color c = sr.color;
            c.a = startAlpha * (life / maxLife);
            sr.color = c;
        }
    }

    /// <summary>Plays a sprite sequence once (for hit-spark sheets from the spark-fx library).</summary>
    public class Flipbook : MonoBehaviour
    {
        Sprite[] frames;
        float fps, t;
        SpriteRenderer sr;

        public void Init(Sprite[] sequence, float framesPerSecond)
        {
            frames = sequence;
            fps = Mathf.Max(1f, framesPerSecond);
            sr = GetComponent<SpriteRenderer>();
            sr.sprite = frames[0];
        }

        void Update()
        {
            t += Time.deltaTime;
            int i = Mathf.FloorToInt(t * fps);
            if (i >= frames.Length)
            {
                Destroy(gameObject);
                return;
            }
            sr.sprite = frames[i];
        }
    }
}
