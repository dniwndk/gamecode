using UnityEngine;

/// Procedural test motion for the cloth sample (no animation clip needed):
/// idle -> walk -> turn on the spot with small steps -> crouch (sit back, lean forward,
/// hands to knees) -> hold -> stand -> idle.
/// Feet are kept on the floor every frame (the body is lowered/raised to the lowest foot),
/// and during the crouch the feet stay where they were, so the hips sit back behind them.
/// Rotations are applied in world space about the character's own axes, so the bones'
/// local axis conventions from the FBX do not matter.
public class HdClothSampleMotion : MonoBehaviour
{
    public float duration = 11f;
    public float stepCycle = 1.05f;     // seconds per two steps
    public float legSwing = 18f;        // thigh swing amplitude, degrees
    public float armDown = 32f;         // lower the arms from the A-pose by this much

    public float T { get; private set; }

    Transform hips, spine1, spine2, chest, neck, head;
    Transform[] thigh = new Transform[2], shin = new Transform[2], foot = new Transform[2], toe = new Transform[2];
    Transform[] upper = new Transform[2], fore = new Transform[2];
    Transform[] all;
    Quaternion[] rest;
    Vector3[] heelLocal = new Vector3[2], toeLocal = new Vector3[2];
    Quaternion[] footRestRel = new Quaternion[2];
    float facing = 1f, legLen = 0.9f, floorY;
    Vector3 startPos, pathPos, crouchAnchor; Quaternion startRot;
    float yaw;

    Transform Find(string n) { foreach (var t in GetComponentsInChildren<Transform>(true)) if (t.name == n) return t; return null; }

    void Start()
    {
        hips = Find("DEF-spine"); spine1 = Find("DEF-spine.001"); spine2 = Find("DEF-spine.002"); chest = Find("DEF-spine.003");
        neck = Find("DEF-spine.004"); head = Find("DEF-spine.006");
        string[] sd = { "L", "R" };
        for (int i = 0; i < 2; i++)
        {
            thigh[i] = Find("DEF-thigh." + sd[i]); shin[i] = Find("DEF-shin." + sd[i]);
            foot[i] = Find("DEF-foot." + sd[i]); toe[i] = Find("DEF-toe." + sd[i]);
            upper[i] = Find("DEF-upper_arm." + sd[i]); fore[i] = Find("DEF-forearm." + sd[i]);
        }
        var front = Find("DEF-skirt_front");
        if (front && hips)
            facing = Mathf.Sign(transform.InverseTransformPoint(front.position).z - transform.InverseTransformPoint(hips.position).z + 1e-6f);
        all = new[] { hips, spine1, spine2, chest, neck, head, thigh[0], thigh[1], shin[0], shin[1], foot[0], foot[1], upper[0], upper[1], fore[0], fore[1] };
        rest = new Quaternion[all.Length];
        for (int i = 0; i < all.Length; i++) if (all[i]) rest[i] = all[i].localRotation;
        startPos = pathPos = transform.position; startRot = transform.rotation; floorY = startPos.y;
        for (int i = 0; i < 2; i++)
        {
            if (!foot[i] || !toe[i]) continue;
            Vector3 heel = foot[i].position; heel.y = floorY;
            Vector3 tip = toe[i].position + (toe[i].position - foot[i].position).normalized * 0.04f; tip.y = floorY;
            heelLocal[i] = foot[i].InverseTransformPoint(heel); toeLocal[i] = foot[i].InverseTransformPoint(tip);
            footRestRel[i] = Quaternion.Inverse(transform.rotation) * foot[i].rotation;
        }
        if (thigh[0] && foot[0]) legLen = thigh[0].position.y - floorY;
    }

    static float Smooth(float t) { t = Mathf.Clamp01(t); return t * t * (3f - 2f * t); }
    static float Bump(float p, float s, float e) { if (p < s || p > e) return 0f; return Mathf.Sin(Mathf.PI * (p - s) / (e - s)); }
    static float Frac(float x) { return x - Mathf.Floor(x); }

    Vector3 Fwd => transform.forward * facing;
    Vector3 RightAxis => transform.right * facing;

    // world-space turns about the character's own axes; positive pitch = toward the character's front
    void Pitch(Transform b, float deg) { if (b && deg != 0f) b.rotation = Quaternion.AngleAxis(-deg, RightAxis) * b.rotation; }   // limb pointing down swings forward
    void Lean(Transform b, float deg) { if (b && deg != 0f) b.rotation = Quaternion.AngleAxis(deg, RightAxis) * b.rotation; }     // upright part tips forward
    void Yaw(Transform b, float deg) { if (b && deg != 0f) b.rotation = Quaternion.AngleAxis(deg, Vector3.up) * b.rotation; }
    void Roll(Transform b, float deg) { if (b && deg != 0f) b.rotation = Quaternion.AngleAxis(deg, Fwd) * b.rotation; }
    void LowerArm(Transform b, Transform child, float deg)
    {
        if (!b || !child || deg == 0f) return;
        Vector3 d = child.position - b.position;
        Vector3 to = Vector3.RotateTowards(d, Vector3.down * d.magnitude, deg * Mathf.Deg2Rad, 0f);
        b.rotation = Quaternion.FromToRotation(d, to) * b.rotation;
    }

    void Update()
    {
        T += Time.deltaTime;
        float t = T;
        for (int i = 0; i < all.Length; i++) if (all[i]) all[i].localRotation = rest[i];

        // ---- timeline -------------------------------------------------------
        const float walkStart = 1.0f, walkEnd = 5.2f, turnEnd = 6.8f, downEnd = 7.8f, holdEnd = 9.0f, upEnd = 10.0f;
        float armIn = Smooth(t / 0.6f);
        float[] th = new float[2], kn = new float[2], armSwing = new float[2], elbow = { 12f, 12f };
        float hipYaw = 0, hipRoll = 0, lean1 = 0, lean2 = 0, neckLean = 0, breathe = Mathf.Sin(t * 2.2f) * 1.2f;
        float crouch = 0f;
        float speed = 2f * legLen * Mathf.Sin(legSwing * Mathf.Deg2Rad) / (stepCycle * 0.5f);

        if (t >= walkStart && t < walkEnd)
        {
            float w = Mathf.Min(Smooth((t - walkStart) / 0.5f), Smooth((walkEnd - t) / 0.5f));
            float ph = (t - walkStart) / stepCycle;
            for (int i = 0; i < 2; i++)
            {
                float p = Frac(ph + i * 0.5f);                       // 0 = heel strike with this leg in front
                th[i] = w * legSwing * Mathf.Cos(2f * Mathf.PI * p);
                kn[i] = w * (6f + 12f * Bump(p, 0f, 0.3f) + 36f * Bump(p, 0.52f, 0.95f));
            }
            float pl = Frac(ph);
            hipYaw = w * 5f * Mathf.Cos(2f * Mathf.PI * pl) * facing;
            hipRoll = w * 2.5f * Mathf.Sin(4f * Mathf.PI * pl);
            armSwing[0] = w * 13f * Mathf.Cos(2f * Mathf.PI * Frac(ph + 0.5f));   // left arm with right leg
            armSwing[1] = w * 13f * Mathf.Cos(2f * Mathf.PI * pl);
            for (int i = 0; i < 2; i++) elbow[i] = 12f + 0.6f * Mathf.Max(armSwing[i], 0f);
            lean1 = 3f * w;
            pathPos += startRot * Vector3.forward * facing * (speed * w * Time.deltaTime);
        }
        else if (t >= walkEnd && t < turnEnd)
        {
            float k = (t - walkEnd) / (turnEnd - walkEnd);
            yaw = 180f * Smooth(k);
            float ph = (t - walkEnd) * 2.2f;                          // small steps while turning
            for (int i = 0; i < 2; i++)
            {
                float p = Frac(ph + i * 0.5f);
                float lift = Bump(p, 0f, 0.5f) * Mathf.Sin(Mathf.PI * k);
                th[i] = 14f * lift; kn[i] = 28f * lift;
            }
            hipRoll = 2f * Mathf.Sin(ph * 2f * Mathf.PI) * Mathf.Sin(Mathf.PI * k);
        }
        else if (t >= turnEnd)
        {
            yaw = 180f;
            if (t < downEnd) crouch = Smooth((t - turnEnd) / (downEnd - turnEnd));
            else if (t < holdEnd) crouch = 1f;
            else if (t < upEnd) crouch = 1f - Smooth((t - holdEnd) / (upEnd - holdEnd));
            for (int i = 0; i < 2; i++)
            {
                th[i] = 95f * crouch; kn[i] = 118f * crouch;
                armSwing[i] = 18f * crouch; elbow[i] = 12f + 22f * crouch;
            }
            lean1 = 24f * crouch; lean2 = 8f * crouch; neckLean = -18f * crouch;
        }

        // ---- root ---------------------------------------------------------------
        transform.rotation = startRot * Quaternion.AngleAxis(yaw, Vector3.up);
        transform.position = new Vector3(pathPos.x, floorY, pathPos.z);

        // ---- pose (parents first) ----------------------------------------------
        Yaw(hips, hipYaw); Roll(hips, hipRoll);
        Lean(spine1, lean1); Lean(spine2, lean2 + breathe * 0.3f); Yaw(spine2, -1.8f * hipYaw);
        Lean(neck, neckLean);
        for (int i = 0; i < 2; i++)
        {
            Pitch(thigh[i], th[i]);
            Pitch(shin[i], -kn[i]);                                    // knee: shin swings back
            if (foot[i]) foot[i].rotation = transform.rotation * footRestRel[i];   // keep the sole level
            LowerArm(upper[i], fore[i], armDown * armIn);
            Pitch(upper[i], armSwing[i]);
            Pitch(fore[i], elbow[i]);
        }

        // ---- feet on the floor --------------------------------------------------
        float minY = float.MaxValue; Vector3 feet = Vector3.zero;
        for (int i = 0; i < 2; i++)
        {
            if (!foot[i]) continue;
            Vector3 h = foot[i].TransformPoint(heelLocal[i]), tp = foot[i].TransformPoint(toeLocal[i]);
            minY = Mathf.Min(minY, Mathf.Min(h.y, tp.y));
            feet += (h + tp) * 0.25f;
        }
        Vector3 shift = Vector3.up * (floorY - minY);
        if (t >= turnEnd)
        {
            if (crouch <= 0.001f || crouchAnchor == Vector3.zero) { crouchAnchor = feet; crouchAnchor.y = 0; }
            Vector3 f = feet; f.y = 0;
            shift += (crouchAnchor - f);                               // feet stay put, hips sit back
        }
        transform.position += shift;
    }
}
