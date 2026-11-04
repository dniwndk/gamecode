using UnityEngine;

/// Procedural test motion for the cloth sample: walk forward, turn in place, crouch, stand.
/// Drives the leg bones and the root directly so no animation clip is needed.
public class HdClothSampleMotion : MonoBehaviour
{
    public float duration = 9f;
    public float walkSpeed = 1.0f;
    Transform thighL, thighR, shinL, shinR, spine;
    Quaternion rtL, rtR, rsL, rsR, rsp;
    Vector3 startPos; Quaternion startRot;
    public float T { get; private set; }

    Transform Find(string n) { foreach (var t in GetComponentsInChildren<Transform>(true)) if (t.name == n) return t; return null; }

    void Start()
    {
        thighL = Find("DEF-thigh.L"); thighR = Find("DEF-thigh.R");
        shinL = Find("DEF-shin.L"); shinR = Find("DEF-shin.R"); spine = Find("DEF-spine.002");
        if (thighL) rtL = thighL.localRotation; if (thighR) rtR = thighR.localRotation;
        if (shinL) rsL = shinL.localRotation; if (shinR) rsR = shinR.localRotation; if (spine) rsp = spine.localRotation;
        startPos = transform.position; startRot = transform.rotation;
    }

    static float Smooth(float a, float b, float t) => Mathf.SmoothStep(a, b, Mathf.Clamp01(t));

    void Update()
    {
        T += Time.deltaTime;
        float t = T;
        float thighA_L = 0, thighA_R = 0, shinA_L = 0, shinA_R = 0, yaw = 0, drop = 0, twist = 0;
        Vector3 pos = startPos;
        if (t < 3.5f)                          // walk: legs swing +-35 deg, shin bends on the back swing
        {
            float w = t * Mathf.PI * 2f * 1.1f;
            float s = Mathf.Sin(w);
            thighA_L = 35f * s; thighA_R = -35f * s;
            shinA_L = Mathf.Max(0, -s) * 45f; shinA_R = Mathf.Max(0, s) * 45f;
            pos = startPos + transform.forward * 0f + startRot * Vector3.forward * (walkSpeed * t);
            drop = Mathf.Abs(Mathf.Cos(w)) * -0.03f;
        }
        else if (t < 5f)                       // turn 180 deg in place, slight lean
        {
            yaw = Smooth(0, 180, (t - 3.5f) / 1.5f);
            pos = startPos + startRot * Vector3.forward * (walkSpeed * 3.5f);
            twist = Mathf.Sin((t - 3.5f) / 1.5f * Mathf.PI) * 20f;
        }
        else if (t < 7.5f)                     // crouch and hold: thighs 80 deg forward, shins 100 deg back, root down 0.3 m
        {
            float k = Smooth(0, 1, (t - 5f) / 1.0f);
            yaw = 180; thighA_L = thighA_R = 80f * k; shinA_L = shinA_R = 100f * k; drop = -0.30f * k;
            pos = startPos + startRot * Vector3.forward * (walkSpeed * 3.5f);
        }
        else                                   // stand up
        {
            float k = Smooth(1, 0, (t - 7.5f) / 1.0f);
            yaw = 180; thighA_L = thighA_R = 80f * k; shinA_L = shinA_R = 100f * k; drop = -0.30f * k;
            pos = startPos + startRot * Vector3.forward * (walkSpeed * 3.5f);
        }
        transform.rotation = startRot * Quaternion.AngleAxis(yaw, Vector3.up);
        transform.position = pos + Vector3.up * drop;
        // Blender/Rigify thigh: forward swing is a negative rotation about the bone's local X
        if (thighL) thighL.localRotation = rtL * Quaternion.AngleAxis(-thighA_L, Vector3.right);
        if (thighR) thighR.localRotation = rtR * Quaternion.AngleAxis(-thighA_R, Vector3.right);
        if (shinL) shinL.localRotation = rsL * Quaternion.AngleAxis(shinA_L, Vector3.right);
        if (shinR) shinR.localRotation = rsR * Quaternion.AngleAxis(shinA_R, Vector3.right);
        if (spine) spine.localRotation = rsp * Quaternion.AngleAxis(twist, Vector3.up);
    }
}
