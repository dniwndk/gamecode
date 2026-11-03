using System;
using System.Collections.Generic;
using UnityEngine;

namespace Ashblade
{
    /// <summary>All sounds are synthesized at start (same recipes as the web build). A low-pass muffles everything during slow-mo.</summary>
    public class AshAudio : MonoBehaviour
    {
        public static AshAudio I;
        const int Rate = 44100;
        readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
        readonly List<AudioSource> pool = new List<AudioSource>();
        AudioLowPassFilter lowpass;
        AudioSource chargeSrc;
        float chargeT, muffleTarget = 22000f;
        static float Noise() { return UnityEngine.Random.value * 2f - 1f; }
        static float S(float t, float f) { return Mathf.Sin(M.TAU * f * t); }

        public void Init(GameObject listener)
        {
            I = this;
            lowpass = listener.GetComponent<AudioLowPassFilter>();
            if (lowpass == null) lowpass = listener.AddComponent<AudioLowPassFilter>();
            lowpass.cutoffFrequency = 22000f;
            for (int i = 0; i < 24; i++)
            {
                var s = gameObject.AddComponent<AudioSource>();
                s.playOnAwake = false; s.spatialBlend = 0f;
                pool.Add(s);
            }
            Build();
            chargeSrc = gameObject.AddComponent<AudioSource>();
            chargeSrc.loop = true; chargeSrc.playOnAwake = false; chargeSrc.clip = clips["chargeLoop"]; chargeSrc.volume = 0f;
        }

        void Synth(string name, float dur, Func<float, float> f)
        {
            int n = Mathf.CeilToInt(dur * Rate);
            var d = new float[n];
            for (int i = 0; i < n; i++) d[i] = Mathf.Clamp(f((float)i / Rate), -1f, 1f);
            var c = AudioClip.Create(name, n, 1, Rate, false);
            c.SetData(d, 0);
            clips[name] = c;
        }

        void Build()
        {
            const float r = Rate;
            { float ph = 0, lp = 0; Synth("hit", 0.24f, t => { ph += (55 + 120 * Mathf.Exp(-t * 32)) / r; float n = Noise(); lp += (n - lp) * 0.45f;
                return Mathf.Sin(M.TAU * ph) * Mathf.Exp(-t * 17) * 0.95f + (n - lp) * Mathf.Exp(-t * 55) * 0.9f + lp * Mathf.Exp(-t * 24) * 0.45f + (t < 0.012f ? Mathf.Sign(S(t, 1700)) * 0.3f : 0f); }); }
            { float ph = 0, lp = 0; Synth("hitHeavy", 0.5f, t => { ph += (36 + 110 * Mathf.Exp(-t * 18)) / r; float n = Noise(); lp += (n - lp) * 0.2f;
                return Mathf.Sin(M.TAU * ph) * Mathf.Exp(-t * 8) * 1.1f + lp * Mathf.Exp(-t * 12) * 1.1f + (n - lp) * Mathf.Exp(-t * 40) * 0.6f; }); }
            Synth("crit", 0.7f, t => (S(t, 1870) * Mathf.Exp(-t * 7) + S(t, 2510) * Mathf.Exp(-t * 10) + S(t, 3170) * Mathf.Exp(-t * 13) + S(t, 4230) * Mathf.Exp(-t * 16)) * 0.16f + Noise() * Mathf.Exp(-t * 90) * 0.4f);
            { float lp = 0; Synth("swing", 0.16f, t => { float e = Mathf.Pow(Mathf.Sin(Mathf.PI * t / 0.16f), 2); lp += (Noise() - lp) * (0.04f + 0.4f * e); return lp * e * 1.1f; }); }
            { float lp = 0; Synth("swingHeavy", 0.3f, t => { float e = Mathf.Pow(Mathf.Sin(Mathf.PI * t / 0.3f), 1.5f); lp += (Noise() - lp) * (0.03f + 0.22f * e); return lp * e * 1.3f; }); }
            { float lp = 0; Synth("thrust", 0.14f, t => { float e = t < 0.015f ? t / 0.015f : Mathf.Exp(-(t - 0.015f) * 26); lp += (Noise() - lp) * 0.5f; return lp * e * 0.9f; }); }
            { float lp = 0; Synth("spin", 0.42f, t => { float e = Mathf.Sin(Mathf.PI * t / 0.42f) * (0.55f + 0.45f * S(t, 14)); lp += (Noise() - lp) * 0.25f; return lp * e * 1.2f; }); }
            { float lp = 0; Synth("dash", 0.2f, t => { float e = Mathf.Exp(-t * 15) * Mathf.Clamp01(t * 300); float n = Noise(); lp += (n - lp) * 0.3f; return (n - lp * 0.6f) * e * 0.5f; }); }
            Synth("perfect", 1.0f, t =>
            {
                float s = 0;
                float[] dd = { 0f, 0.05f, 0.1f, 0.16f }, ff = { 1046, 1568, 2093, 3136 };
                for (int i = 0; i < 4; i++) if (t > dd[i]) s += S(t - dd[i], ff[i]) * Mathf.Exp(-(t - dd[i]) * 5) * 0.2f;
                return s + Noise() * Mathf.Exp(-t * 7) * 0.05f * (t < 0.3f ? t / 0.3f : 1f);
            });
            Synth("deflect", 0.5f, t => S(t, 2450) * Mathf.Exp(-t * 9) * 0.33f + S(t, 3820) * Mathf.Exp(-t * 14) * 0.2f + Noise() * Mathf.Exp(-t * 160) * 0.6f);
            { float ph = 0, lp = 0; Synth("kill", 0.7f, t => { ph += (30 + 150 * Mathf.Exp(-t * 9)) / r; lp += (Noise() - lp) * 0.15f;
                float crunch = Mathf.Round(Noise() * 4) / 4 * Mathf.Exp(-t * 16) * 0.35f;
                return Mathf.Sin(M.TAU * ph) * Mathf.Exp(-t * 5) * 0.9f + lp * Mathf.Exp(-t * 9) * 0.9f + crunch; }); }
            { float ph = 0, lp = 0; Synth("burst", 1.5f, t => { ph += (26 + 60 * Mathf.Exp(-t * 4)) / r; lp += (Noise() - lp) * (0.02f + 0.5f * Mathf.Exp(-t * 4));
                return Mathf.Sin(M.TAU * ph) * Mathf.Exp(-t * 2.6f) * 0.95f + lp * Mathf.Exp(-t * 2.4f) * 1.4f + (UnityEngine.Random.value < 0.004f * Mathf.Exp(-t * 2) ? Noise() : 0f); }); }
            { float ph = 0, ph2 = 0; Synth("hurt", 0.36f, t => { ph += (90 + 210 * Mathf.Exp(-t * 9)) / r; ph2 += (40 + 60 * Mathf.Exp(-t * 12)) / r;
                return Mathf.Sign(Mathf.Sin(M.TAU * ph)) * Mathf.Exp(-t * 10) * 0.25f + Mathf.Sin(M.TAU * ph2) * Mathf.Exp(-t * 13) * 0.8f + Noise() * Mathf.Exp(-t * 28) * 0.45f; }); }
            { float ph = 0; Synth("tele", 0.2f, t => { ph += (500 + 1200 * t / 0.2f) / r; return ((ph % 1f) * 2 - 1) * Mathf.Sin(Mathf.PI * t / 0.2f) * 0.14f; }); }
            { float ph = 0, lp = 0; Synth("slam", 0.6f, t => { ph += (25 + 50 * Mathf.Exp(-t * 10)) / r; lp += (Noise() - lp) * 0.08f;
                return Mathf.Sin(M.TAU * ph) * Mathf.Exp(-t * 6) + lp * Mathf.Exp(-t * 7) * 1.4f; }); }
            { float ph = 0; Synth("shoot", 0.3f, t => { ph += (300 + 700 * Mathf.Exp(-t * 12)) / r; return (Mathf.Sin(M.TAU * ph) * 0.6f + Noise() * 0.15f) * Mathf.Exp(-t * 9) * 0.45f; }); }
            { float ph = 0; Synth("pop", 0.16f, t => { ph += (180 + 500 * Mathf.Exp(-t * 30)) / r; return (Mathf.Sin(M.TAU * ph) * 0.6f + Noise() * Mathf.Exp(-t * 50) * 0.6f) * Mathf.Exp(-t * 18); }); }
            { float lp = 0; Synth("spawn", 0.55f, t => { lp += (Noise() - lp) * 0.2f; float e = t < 0.45f ? Mathf.Pow(t / 0.45f, 3) : Mathf.Exp(-(t - 0.45f) * 40); return lp * e * 0.8f + (t > 0.45f ? S(t, 220) * e * 0.4f : 0f); }); }
            Synth("pickup", 0.12f, t => (S(t, 1320) + S(t, 1980) * 0.5f) * Mathf.Exp(-t * 30) * 0.3f);
            Synth("chargeFull", 0.6f, t => (S(t, 1760) * 0.25f + S(t, 2637) * 0.18f + S(t, 3520) * 0.08f) * Mathf.Exp(-t * 6));
            Synth("grade", 0.4f, t => { int i = Mathf.Min(3, (int)(t / 0.06f)); float f = new[] { 523f, 659f, 784f, 1046f }[i]; return Mathf.Sign(S(t, f)) * 0.12f * Mathf.Exp(-(t - i * 0.06f) * 10); });
            Synth("clear", 1.1f, t => { float[] nn = { 523, 659, 784, 1046, 1318 }; int i = Mathf.Min(4, (int)(t / 0.09f)); float tt = t - i * 0.09f;
                return (Mathf.Sign(S(t, nn[i])) * 0.1f + S(t, nn[i] * 2) * 0.1f) * Mathf.Exp(-tt * (i == 4 ? 3 : 12)); });
            Synth("step", 0.05f, t => Noise() * Mathf.Exp(-t * 120) * 0.25f);
            { float ph = 0; Synth("wall", 0.35f, t => { ph += (35 + 70 * Mathf.Exp(-t * 14)) / r; return Mathf.Sin(M.TAU * ph) * Mathf.Exp(-t * 9) + (UnityEngine.Random.value < 0.05f * Mathf.Exp(-t * 8) ? Noise() * 0.8f : 0f) + Noise() * Mathf.Exp(-t * 35) * 0.5f; }); }
            Synth("armor", 0.25f, t => (S(t, 820) * 0.3f + S(t, 1290) * 0.22f + S(t, 2110) * 0.15f) * Mathf.Exp(-t * 22) + Noise() * Mathf.Exp(-t * 120) * 0.5f);
            Synth("break", 0.7f, t => (S(t, 700 * (1 - t * 0.4f)) * Mathf.Exp(-t * 6) + S(t, 1100 * (1 - t * 0.4f)) * Mathf.Exp(-t * 8) + S(t, 1630 * (1 - t * 0.4f)) * Mathf.Exp(-t * 10)) * 0.2f + Noise() * Mathf.Exp(-t * 14) * 0.5f);
            { float ph = 0; Synth("fell", 1.6f, t => { ph += 110 * Mathf.Exp(-t * 0.9f) / r; return (Mathf.Sign(Mathf.Sin(M.TAU * ph)) * 0.12f + Mathf.Sin(M.TAU * ph * 0.5f) * 0.4f) * Mathf.Exp(-t * 1.6f); }); }
            Synth("ready", 0.5f, t => (t < 0.08f ? S(t, 880) : S(t, 1318)) * Mathf.Exp(-t * 7) * 0.25f);
            Synth("chargeLoop", 1f, t => ((t * 160f) % 1f) * 2f - 1f);
        }

        public void Play(string name, float rate = 1f, float vary = 0.05f, float vol = 1f)
        {
            var T = AshTuning.I;
            AudioClip c;
            if (T == null || !T.sound || !clips.TryGetValue(name, out c)) return;
            AudioSource src = null;
            foreach (var s in pool) if (!s.isPlaying) { src = s; break; }
            if (src == null) src = pool[UnityEngine.Random.Range(0, pool.Count)];
            src.clip = c;
            src.pitch = rate * (1f + UnityEngine.Random.Range(-vary, vary));
            src.volume = vol * 0.6f;
            src.Play();
        }

        public void Charge(bool on)
        {
            if (chargeSrc == null) return;
            if (on && !chargeSrc.isPlaying && AshTuning.I.sound) { chargeT = 0f; chargeSrc.pitch = 1f; chargeSrc.volume = 0f; chargeSrc.Play(); }
            else if (!on && chargeSrc.isPlaying) chargeSrc.Stop();
        }

        public void Muffle(bool on) { muffleTarget = on ? 1100f : 22000f; }

        void Update()
        {
            if (lowpass != null)
            {
                float k = 1f - Mathf.Exp(-Time.unscaledDeltaTime * (muffleTarget < lowpass.cutoffFrequency ? 30f : 8f));
                lowpass.cutoffFrequency = Mathf.Exp(Mathf.Lerp(Mathf.Log(lowpass.cutoffFrequency), Mathf.Log(muffleTarget), k));
            }
            if (chargeSrc != null && chargeSrc.isPlaying)
            {
                chargeT += Time.unscaledDeltaTime;
                float k = Mathf.Clamp01(chargeT / Mathf.Max(0.05f, AshTuning.I.chargeTime));
                chargeSrc.pitch = Mathf.Pow(4f, k);
                chargeSrc.volume = Mathf.Min(0.09f, chargeT * 0.9f);
            }
        }
    }
}
