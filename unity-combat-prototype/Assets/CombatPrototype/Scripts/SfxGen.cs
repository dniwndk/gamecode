using UnityEngine;

namespace CombatProto
{
    /// <summary>Placeholder sounds synthesized at startup, in SfxId order.</summary>
    public static class SfxGen
    {
        const int Rate = 44100;

        public static AudioClip[] All()
        {
            var rnd = new System.Random(7);
            return new[]
            {
                Hit(rnd, false), Hit(rnd, true), Swing(rnd, false), Swing(rnd, true),
                Dash(rnd), Hurt(), Kill(rnd), Lunge(rnd),
            };
        }

        delegate float Wave(float t);

        static AudioClip Make(string name, float dur, Wave f)
        {
            int n = Mathf.CeilToInt(dur * Rate);
            var data = new float[n];
            for (int i = 0; i < n; i++) data[i] = Mathf.Clamp(f(i / (float)Rate), -1f, 1f);
            AudioClip clip = AudioClip.Create(name, n, 1, Rate, false);
            clip.SetData(data, 0);
            return clip;
        }

        static float Noise(System.Random r) { return (float)(r.NextDouble() * 2.0 - 1.0); }

        static AudioClip Hit(System.Random r, bool heavy)
        {
            float dur = heavy ? 0.3f : 0.16f;
            float noiseDecay = heavy ? 18f : 32f, thumpDecay = heavy ? 11f : 22f, freq = heavy ? 62f : 96f;
            float phase = 0f;
            return Make(heavy ? "hit_heavy" : "hit", dur, t =>
            {
                phase += freq * (1f - t * 1.5f) / Rate;
                float thump = Mathf.Sin(2f * Mathf.PI * phase) * Mathf.Exp(-t * thumpDecay);
                float crack = Noise(r) * Mathf.Exp(-t * noiseDecay);
                return (crack * 0.55f + thump * 0.95f) * 0.8f;
            });
        }

        static AudioClip Swing(System.Random r, bool heavy)
        {
            float dur = heavy ? 0.22f : 0.13f;
            float lp = 0f;
            return Make(heavy ? "swing_heavy" : "swing", dur, t =>
            {
                float env = Mathf.Sin(Mathf.PI * t / dur);
                lp += (Noise(r) - lp) * (0.04f + 0.3f * env);
                return lp * env * 0.9f;
            });
        }

        static AudioClip Dash(System.Random r)
        {
            const float dur = 0.12f;
            float lp = 0f;
            return Make("dash", dur, t =>
            {
                float env = Mathf.Exp(-t * 22f) * Mathf.Clamp01(t * 400f);
                lp += (Noise(r) - lp) * 0.45f;
                return lp * env * 0.7f;
            });
        }

        static AudioClip Hurt()
        {
            const float dur = 0.2f;
            float phase = 0f;
            return Make("hurt", dur, t =>
            {
                phase += Mathf.Lerp(320f, 110f, t / dur) / Rate;
                float sq = Mathf.Sin(2f * Mathf.PI * phase) > 0f ? 1f : -1f;
                return sq * Mathf.Exp(-t * 12f) * 0.35f;
            });
        }

        static AudioClip Kill(System.Random r)
        {
            const float dur = 0.45f;
            float phase = 0f;
            return Make("kill", dur, t =>
            {
                phase += Mathf.Lerp(220f, 45f, t / dur) / Rate;
                float tone = Mathf.Sin(2f * Mathf.PI * phase) * Mathf.Exp(-t * 7f);
                return (tone * 0.7f + Noise(r) * Mathf.Exp(-t * 14f) * 0.4f) * 0.8f;
            });
        }

        static AudioClip Lunge(System.Random r)
        {
            const float dur = 0.16f;
            float lp = 0f;
            return Make("enemy_lunge", dur, t =>
            {
                float env = Mathf.Sin(Mathf.PI * t / dur);
                lp += (Noise(r) - lp) * 0.08f;
                return lp * env * 0.8f;
            });
        }
    }
}
