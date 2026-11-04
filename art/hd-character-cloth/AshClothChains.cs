using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Cloth for the coat / front-panel / wing bone chains of character_rigged_cloth.fbx.
///
/// Two layers:
/// 1. Leg drivers (ported from the Blender rig): each coat chain root turns with the thigh
///    swing (front panel with whichever thigh is forward, back coat with its own thigh going
///    back, side coat both ways) and lower bones bend or hang back by set amounts. This is
///    what keeps the legs from walking through the cloth.
/// 2. Spring (verlet) simulation on top: gravity, lag behind body motion, push-out from leg
///    capsules tested against whole segments (not only joints), and a floor plane.
///
/// Put it on the character root. With autoSetup on, everything is found by bone name.
/// </summary>
[DefaultExecutionOrder(1000)]
public class AshClothChains : MonoBehaviour
{
    [System.Serializable]
    public class LegDriver
    {
        public Transform thigh, knee;        // thigh bone and the bone at the knee (shin)
        [HideInInspector] public float restAngle;
        [HideInInspector] public float swing; // degrees, + = forward
    }

    [System.Serializable]
    public class Chain
    {
        public Transform root;
        [Range(0f, 1f)] public float stiffness = 0.08f;   // pull back toward the driven pose
        [Range(0f, 1f)] public float damping = 0.12f;
        public float gravity = 2.0f;                      // m/s^2
        [Range(0f, 1f)] public float inertia = 0.6f;      // 0 = follows body travel, 1 = lags fully
        public float particleRadius = 0.02f;
        [Header("Leg driver (degrees of cloth per degree of thigh swing)")]
        public int legL = -1, legR = -1;                  // indices into legs; -1 = none
        public bool eitherLegForward;                     // front panel: use the most-forward thigh
        public float followForward, followBack;
        public float[] perBone = new float[0];            // extra turn per bone (+ = bend further, - = hang back)
        [HideInInspector] public List<Transform> bones = new List<Transform>();
        [HideInInspector] public Vector3[] pos, prev;
        [HideInInspector] public float[] len;
        [HideInInspector] public Quaternion[] restLocalRot;
        [HideInInspector] public Vector3[] restLocalPos;
        [HideInInspector] public Vector3 tailLocal;
    }

    [System.Serializable]
    public class Capsule
    {
        public Transform start, end;
        public float radius = 0.07f;
    }

    public bool autoSetup = true;
    public List<LegDriver> legs = new List<LegDriver>();
    public List<Chain> chains = new List<Chain>();
    public List<Capsule> colliders = new List<Capsule>();
    [Range(1, 6)] public int substeps = 3;
    public bool floorCollision = true;
    [Tooltip("World height of the floor. Taken from the character's position at start.")]
    public float floorY;
    public float floorOffset = 0.01f;

    [Tooltip("+1 if the character faces this object's +Z, -1 if it faces -Z. Auto-detected from the front panel.")]
    public float facing = 1f;

    Vector3 lastRootPos;

    void Awake()
    {
        floorY = transform.position.y;
        if (autoSetup) AutoSetup();
        chains.RemoveAll(c => c == null || c.root == null);
        foreach (var l in legs) l.restAngle = SagittalAngle(l);
        foreach (var c in chains) Init(c);
        lastRootPos = transform.position;
    }

    void AutoSetup()
    {
        var all = new Dictionary<string, Transform>();
        foreach (var t in GetComponentsInChildren<Transform>(true)) all[t.name] = t;
        int Leg(string s)
        {
            if (!all.TryGetValue("DEF-thigh." + s, out var th) || !all.TryGetValue("DEF-shin." + s, out var sh)) return -1;
            legs.Add(new LegDriver { thigh = th, knee = sh });
            return legs.Count - 1;
        }
        int L = Leg("L"), R = Leg("R");
        if (all.TryGetValue("DEF-skirt_front", out var fp) && all.TryGetValue("DEF-spine", out var sp))
            facing = Mathf.Sign(transform.InverseTransformPoint(fp.position).z - transform.InverseTransformPoint(sp.position).z + 1e-6f);
        Chain Add(string name, float stiff, float grav, float inertia, float radius)
        {
            if (!all.TryGetValue(name, out var t) || chains.Exists(c => c.root == t)) return null;
            var c = new Chain { root = t, stiffness = stiff, gravity = grav, inertia = inertia, particleRadius = radius };
            chains.Add(c);
            return c;
        }
        // values from the Blender rig (ch8): front panel 0.9 with the forward thigh, lower part hangs;
        // back coat 0.7 with its thigh going back (+0.1 forward), second bone bends on, lower part hangs;
        // side coat about a third both ways.
        var f = Add("DEF-skirt_front", 0.10f, 2.0f, 0.5f, 0.03f);
        if (f != null) { f.legL = L; f.legR = R; f.eitherLegForward = true; f.followForward = 0.9f; f.perBone = new[] { 0f, 0f, -0.35f, -0.14f }; }
        foreach (var s in new[] { "L", "R" })
        {
            int leg = s == "L" ? L : R;
            var b = Add("DEF-skirt_back." + s, 0.08f, 2.0f, 0.55f, 0.03f);
            if (b != null) { b.legL = leg; b.followBack = 0.7f; b.followForward = 0.1f; b.perBone = new[] { 0f, 0.5f, -0.5f, -0.3f, 0f }; }
            var sd = Add("DEF-skirt_side." + s, 0.08f, 2.0f, 0.5f, 0.03f);
            if (sd != null) { sd.legL = leg; sd.followBack = 0.315f; sd.followForward = 0.3f; }
            Add("DEF-wing." + s, 0.30f, 0.4f, 0.3f, 0.02f);

            if (all.TryGetValue("DEF-thigh." + s, out var th) && all.TryGetValue("DEF-shin." + s, out var sh))
                colliders.Add(new Capsule { start = th, end = sh, radius = 0.085f });
            if (all.TryGetValue("DEF-shin." + s, out var sh2) && all.TryGetValue("DEF-foot." + s, out var ft))
                colliders.Add(new Capsule { start = sh2, end = ft, radius = 0.06f });
            if (all.TryGetValue("DEF-foot." + s, out var ft2) && all.TryGetValue("DEF-toe." + s, out var toe))
                colliders.Add(new Capsule { start = ft2, end = toe, radius = 0.05f });
        }
        if (all.TryGetValue("DEF-spine", out var hip) && all.TryGetValue("DEF-spine.002", out var chest))
            colliders.Add(new Capsule { start = hip, end = chest, radius = 0.11f });
    }

    // thigh direction angle in the character's side plane, 0 = straight down, + = forward
    float SagittalAngle(LegDriver l)
    {
        Vector3 d = transform.InverseTransformDirection(l.knee.position - l.thigh.position);
        return Mathf.Atan2(d.z * facing, -d.y) * Mathf.Rad2Deg;
    }

    void Init(Chain c)
    {
        c.bones.Clear();
        for (var t = c.root; t != null; t = FirstBoneChild(t)) c.bones.Add(t);
        int n = c.bones.Count + 1;
        c.pos = new Vector3[n]; c.prev = new Vector3[n]; c.len = new float[n];
        c.restLocalRot = new Quaternion[c.bones.Count]; c.restLocalPos = new Vector3[c.bones.Count];
        for (int i = 0; i < c.bones.Count; i++)
        {
            c.restLocalRot[i] = c.bones[i].localRotation;
            c.restLocalPos[i] = c.bones[i].localPosition;
        }
        var last = c.bones[c.bones.Count - 1];
        Vector3 lastSeg = c.bones.Count > 1 ? last.position - c.bones[c.bones.Count - 2].position : Vector3.down * 0.2f;
        c.tailLocal = last.InverseTransformVector(lastSeg);
        for (int i = 0; i < n; i++)
        {
            c.pos[i] = c.prev[i] = Animated(c, i);
            c.len[i] = i == 0 ? 0f : Vector3.Distance(Animated(c, i), Animated(c, i - 1));
        }
    }

    static Transform FirstBoneChild(Transform t)
    {
        for (int i = 0; i < t.childCount; i++)
            if (t.GetChild(i).name.StartsWith("DEF-")) return t.GetChild(i);
        return null;
    }

    Vector3 Animated(Chain c, int i)
    {
        if (i < c.bones.Count) return c.bones[i].position;
        var last = c.bones[c.bones.Count - 1];
        return last.position + last.TransformVector(c.tailLocal);
    }

    // Restore the rest pose before the Animator / motion scripts write, so last frame's
    // simulated rotation never becomes this frame's "animated" pose.
    void Update()
    {
        foreach (var c in chains)
            for (int i = 0; i < c.bones.Count; i++)
            {
                c.bones[i].localRotation = c.restLocalRot[i];
                c.bones[i].localPosition = c.restLocalPos[i];
            }
    }

    void LateUpdate()
    {
        float dt = Mathf.Min(Time.deltaTime, 1f / 30f);
        if (dt <= 0f) return;
        foreach (var l in legs) l.swing = SagittalAngle(l) - l.restAngle;
        foreach (var c in chains) Drive(c);

        Vector3 rootMove = transform.position - lastRootPos;
        lastRootPos = transform.position;
        float h = dt / substeps;
        foreach (var c in chains)
        {
            if (c.bones.Count == 0) continue;
            for (int i = 1; i < c.pos.Length; i++)
            {
                c.pos[i] += rootMove * (1f - c.inertia);
                c.prev[i] += rootMove * (1f - c.inertia);
            }
            for (int s = 0; s < substeps; s++) Step(c, h);
            Apply(c);
        }
    }

    // Turn the chain with the thigh(s): this sets the pose the spring pulls toward.
    void Drive(Chain c)
    {
        if (c.legL < 0 && c.legR < 0) return;
        float s;
        if (c.eitherLegForward)
        {
            float a = c.legL >= 0 ? legs[c.legL].swing : 0f, b = c.legR >= 0 ? legs[c.legR].swing : 0f;
            s = Mathf.Max(a, b);
        }
        else s = legs[c.legL >= 0 ? c.legL : c.legR].swing;
        float angle = c.followForward * Mathf.Max(s, 0f) + c.followBack * Mathf.Min(s, 0f);
        if (Mathf.Abs(angle) < 0.01f) return;
        Vector3 axis = transform.right * facing;   // turning by -angle about this swings down -> forward
        c.bones[0].rotation = Quaternion.AngleAxis(-angle, axis) * c.bones[0].rotation;
        for (int i = 1; i < c.bones.Count && i < c.perBone.Length; i++)
            if (c.perBone[i] != 0f)
                c.bones[i].rotation = Quaternion.AngleAxis(-angle * c.perBone[i], axis) * c.bones[i].rotation;
    }

    void Step(Chain c, float h)
    {
        c.pos[0] = c.prev[0] = c.bones[0].position;
        float floor = floorY + floorOffset + c.particleRadius;
        for (int i = 1; i < c.pos.Length; i++)
        {
            Vector3 v = (c.pos[i] - c.prev[i]) * (1f - c.damping);
            c.prev[i] = c.pos[i];
            c.pos[i] += v + Vector3.down * c.gravity * h * h;
            Vector3 target = c.pos[i - 1] + (Animated(c, i) - Animated(c, i - 1));
            c.pos[i] = Vector3.Lerp(c.pos[i], target, c.stiffness);
            for (int it = 0; it < 2; it++)
            {
                Keep(c, i);
                CollideSegment(c.pos[i - 1], ref c.pos[i], c.particleRadius);
                if (floorCollision && c.pos[i].y < floor) c.pos[i].y = floor;
            }
            Keep(c, i);
        }
    }

    void Keep(Chain c, int i)
    {
        Vector3 d = c.pos[i] - c.pos[i - 1];
        float m = d.magnitude;
        if (m > 1e-6f) c.pos[i] = c.pos[i - 1] + d * (c.len[i] / m);
    }

    // Push the segment a->p out of every capsule by moving its free end p.
    void CollideSegment(Vector3 a, ref Vector3 p, float pr)
    {
        foreach (var k in colliders)
        {
            if (k.start == null || k.end == null) continue;
            Vector3 c0 = k.start.position, c1 = k.end.position;
            ClosestPoints(a, p, c0, c1, out float s, out Vector3 onSeg, out Vector3 onAxis);
            Vector3 d = onSeg - onAxis;
            float r = k.radius + pr, dist = d.magnitude;
            if (dist >= r || s <= 1e-3f) continue;
            Vector3 nrm = dist > 1e-6f ? d / dist : transform.forward * facing;
            // move the end so the touching point clears the capsule (lever: touching point is s along the segment)
            p += nrm * ((r - dist) / s);
        }
    }

    static void ClosestPoints(Vector3 p0, Vector3 p1, Vector3 q0, Vector3 q1, out float s, out Vector3 cp, out Vector3 cq)
    {
        Vector3 d1 = p1 - p0, d2 = q1 - q0, r = p0 - q0;
        float a = Vector3.Dot(d1, d1), e = Vector3.Dot(d2, d2), f = Vector3.Dot(d2, r);
        float t;
        if (a < 1e-9f) { s = 0; t = Mathf.Clamp01(f / Mathf.Max(e, 1e-9f)); }
        else
        {
            float cc = Vector3.Dot(d1, r);
            if (e < 1e-9f) { t = 0; s = Mathf.Clamp01(-cc / a); }
            else
            {
                float b = Vector3.Dot(d1, d2), den = a * e - b * b;
                s = den > 1e-9f ? Mathf.Clamp01((b * f - cc * e) / den) : 0f;
                t = (b * s + f) / e;
                if (t < 0f) { t = 0f; s = Mathf.Clamp01(-cc / a); }
                else if (t > 1f) { t = 1f; s = Mathf.Clamp01((b - cc) / a); }
            }
        }
        cp = p0 + d1 * s; cq = q0 + d2 * t;
    }

    void Apply(Chain c)
    {
        for (int i = 0; i < c.bones.Count; i++)
        {
            Transform bone = c.bones[i];
            Vector3 animDir = Animated(c, i + 1) - bone.position;
            Vector3 simDir = c.pos[i + 1] - c.pos[i];
            if (animDir.sqrMagnitude < 1e-10f || simDir.sqrMagnitude < 1e-10f) continue;
            bone.rotation = Quaternion.FromToRotation(animDir, simDir) * bone.rotation;
        }
    }

    void OnDrawGizmosSelected()
    {
        Gizmos.color = new Color(1f, 0.5f, 0f, 0.6f);
        foreach (var k in colliders)
        {
            if (k.start == null || k.end == null) continue;
            Gizmos.DrawWireSphere(k.start.position, k.radius);
            Gizmos.DrawWireSphere(k.end.position, k.radius);
            Gizmos.DrawLine(k.start.position, k.end.position);
        }
    }
}
