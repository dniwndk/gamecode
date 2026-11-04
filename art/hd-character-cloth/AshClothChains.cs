using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Cloth sway for the coat / front-panel / wing bone chains of character_rigged.fbx.
/// Each chain is a spring (verlet) simulation that hangs with gravity, lags behind body
/// motion and is pushed out of leg capsules and off the floor, so the cloth does not pass
/// through the legs or fold into the ground when the character crouches.
/// Put it on the character root (the object that holds the GameRig). With autoSetup on,
/// chains and leg colliders are found by bone name (DEF-skirt_*, DEF-wing*, DEF-thigh/shin).
/// </summary>
[DefaultExecutionOrder(1000)]
public class AshClothChains : MonoBehaviour
{
    [System.Serializable]
    public class Chain
    {
        public Transform root;
        [Range(0f, 1f)] public float stiffness = 0.08f;   // pull back toward the animated pose
        [Range(0f, 1f)] public float damping = 0.12f;     // velocity loss per step
        public float gravity = 2.0f;                      // m/s^2 along world down
        [Range(0f, 1f)] public float inertia = 0.6f;      // how much body motion is ignored (0 = follows, 1 = lags fully)
        public float particleRadius = 0.02f;
        [HideInInspector] public List<Transform> bones = new List<Transform>();
        [HideInInspector] public Vector3[] pos, prev;
        [HideInInspector] public float[] len;
        [HideInInspector] public Quaternion[] restLocalRot;
        [HideInInspector] public Vector3[] restLocalPos;
        [HideInInspector] public Vector3 tailLocal;     // virtual tip past the last bone
    }

    [System.Serializable]
    public class Capsule
    {
        public Transform start;
        public Transform end;
        public float radius = 0.07f;
    }

    public bool autoSetup = true;
    public List<Chain> chains = new List<Chain>();
    public List<Capsule> colliders = new List<Capsule>();
    [Range(1, 4)] public int substeps = 2;
    [Tooltip("Keep cloth above the character's feet (local Y of this transform). Stops the hem folding into the floor when crouching.")]
    public bool floorCollision = true;
    public float floorOffset = 0.01f;

    Vector3 lastRootPos;

    void Awake()
    {
        if (autoSetup) AutoSetup();
        chains.RemoveAll(c => c == null || c.root == null);
        foreach (var c in chains) Init(c);
        lastRootPos = transform.position;
    }

    void AutoSetup()
    {
        var all = new Dictionary<string, Transform>();
        foreach (var t in GetComponentsInChildren<Transform>(true)) all[t.name] = t;
        void AddChain(string name, float stiff, float grav, float inertia)
        {
            if (all.TryGetValue(name, out var t) && !chains.Exists(c => c.root == t))
                chains.Add(new Chain { root = t, stiffness = stiff, gravity = grav, inertia = inertia });
        }
        AddChain("DEF-skirt_front", 0.06f, 2.0f, 0.55f);
        foreach (var s in new[] { "L", "R" })
        {
            AddChain("DEF-skirt_back." + s, 0.05f, 2.0f, 0.6f);
            AddChain("DEF-skirt_side." + s, 0.06f, 2.0f, 0.55f);
            AddChain("DEF-wing." + s, 0.35f, 0.3f, 0.25f);   // wings: stiff, slight follow-through
            if (all.TryGetValue("DEF-thigh." + s, out var th) && all.TryGetValue("DEF-shin." + s, out var sh))
                colliders.Add(new Capsule { start = th, end = sh, radius = 0.075f });
            if (all.TryGetValue("DEF-shin." + s, out var sh2) && all.TryGetValue("DEF-foot." + s, out var ft))
                colliders.Add(new Capsule { start = sh2, end = ft, radius = 0.055f });
        }
        if (all.TryGetValue("DEF-spine", out var hip) && all.TryGetValue("DEF-spine.002", out var chest))
            colliders.Add(new Capsule { start = hip, end = chest, radius = 0.11f });
    }

    void Init(Chain c)
    {
        c.bones.Clear();
        for (var t = c.root; t != null; t = t.childCount > 0 ? FirstBoneChild(t) : null) c.bones.Add(t);
        int n = c.bones.Count + 1;   // + virtual tail
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

    // Restore the rest pose before the Animator writes; unanimated chain bones would
    // otherwise keep last frame's simulated rotation as their "animated" pose.
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
        Vector3 rootMove = transform.position - lastRootPos;
        lastRootPos = transform.position;
        float h = dt / substeps;
        foreach (var c in chains)
        {
            if (c.bones.Count == 0) continue;
            for (int i = 1; i < c.pos.Length; i++)    // keep part of the body's travel (inertia)
            {
                c.pos[i] += rootMove * (1f - c.inertia);
                c.prev[i] += rootMove * (1f - c.inertia);
            }
            for (int s = 0; s < substeps; s++) Step(c, h);
            Apply(c);
        }
    }

    void Step(Chain c, float h)
    {
        c.pos[0] = c.prev[0] = c.bones[0].position;   // pinned to the waist / shoulder
        for (int i = 1; i < c.pos.Length; i++)
        {
            Vector3 v = (c.pos[i] - c.prev[i]) * (1f - c.damping);
            c.prev[i] = c.pos[i];
            c.pos[i] += v + Vector3.down * c.gravity * h * h;
            // spring toward where the animation puts this joint, measured from the simulated parent
            Vector3 target = c.pos[i - 1] + (Animated(c, i) - Animated(c, i - 1));
            c.pos[i] = Vector3.Lerp(c.pos[i], target, c.stiffness);
            Collide(ref c.pos[i], c.particleRadius);
            if (floorCollision)
            {
                float floorY = transform.position.y + floorOffset + c.particleRadius;
                if (c.pos[i].y < floorY) c.pos[i].y = floorY;
            }
            // keep segment length
            Vector3 d = c.pos[i] - c.pos[i - 1];
            float m = d.magnitude;
            if (m > 1e-6f) c.pos[i] = c.pos[i - 1] + d * (c.len[i] / m);
        }
    }

    void Collide(ref Vector3 p, float pr)
    {
        foreach (var k in colliders)
        {
            if (k.start == null || k.end == null) continue;
            Vector3 a = k.start.position, b = k.end.position, ab = b - a;
            float t = Mathf.Clamp01(Vector3.Dot(p - a, ab) / Mathf.Max(ab.sqrMagnitude, 1e-8f));
            Vector3 q = a + ab * t;
            Vector3 d = p - q;
            float r = k.radius + pr, dist = d.magnitude;
            if (dist < r)
            {
                Vector3 nrm = dist > 1e-6f ? d / dist : transform.forward;
                p = q + nrm * r;
            }
        }
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
