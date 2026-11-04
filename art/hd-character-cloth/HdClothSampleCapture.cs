using System.IO;
using UnityEngine;

/// Captures the sample from a 3/4 front camera and a side camera into <project>/SampleShots as JPG.
/// Runs at a fixed 30 fps capture clock so the result is the same in batch mode and in the editor.
/// Execution order 2000: renders after the cloth simulation (1000) has posed the bones this frame.
[DefaultExecutionOrder(2000)]
public class HdClothSampleCapture : MonoBehaviour
{
    public Transform target;
    public float duration = 11f;
    public int everyNthFrame = 3;       // 30 fps clock -> 10 shots per second
    public int width = 960, height = 540;
    public string outDir;
    Camera camA, camB, camC;
    Quaternion startRot; float facing = 1f;
    RenderTexture rt; Texture2D tex;
    int frame, shot;

    void Start()
    {
        Time.captureFramerate = 30;
        if (string.IsNullOrEmpty(outDir)) outDir = Path.Combine(Application.dataPath, "..", "SampleShots");
        Directory.CreateDirectory(outDir);
        camA = MakeCam("CamFront"); camB = MakeCam("CamSide"); camC = MakeCam("CamFace");
        startRot = target.rotation;
        rt = new RenderTexture(width, height, 24); tex = new Texture2D(width, height, TextureFormat.RGB24, false);
    }

    Camera MakeCam(string n)
    {
        var go = new GameObject(n); var c = go.AddComponent<Camera>();
        c.fieldOfView = 35f; c.nearClipPlane = 0.05f; c.clearFlags = CameraClearFlags.SolidColor;
        c.backgroundColor = new Color(0.32f, 0.34f, 0.38f); c.enabled = false; return c;
    }

    void Aim(Camera c, Vector3 offsetDir, float dist)
    {
        Vector3 focus = new Vector3(target.position.x, 0f, target.position.z) + Vector3.up * 0.95f;
        c.transform.position = focus + offsetDir.normalized * dist + Vector3.up * 0.15f;
        c.transform.LookAt(focus);
    }

    void LateUpdate()
    {
        if (target == null) return;
        frame++;
        if (frame % everyNthFrame != 0) return;
        var cloth = target.GetComponent<AshClothChains>();
        if (cloth) facing = cloth.facing;
        // front/side follow the character's position but keep the starting direction (the turn is visible);
        // the face camera always looks at the character's front three-quarter.
        Vector3 f0 = startRot * Vector3.forward * facing, r0 = startRot * Vector3.right * facing;
        Vector3 f1 = target.forward * facing, r1 = target.right * facing;
        Aim(camA, f0 + r0 * 0.6f, 3.4f);
        Aim(camB, r0, 3.4f);
        Aim(camC, f1 - r1 * 0.6f, 3.0f);
        Save(camA, $"front_{shot:D3}.jpg"); Save(camB, $"side_{shot:D3}.jpg"); Save(camC, $"face_{shot:D3}.jpg");
        shot++;
        if (frame * (1f / 30f) >= duration) Finish();
    }

    void Save(Camera c, string name)
    {
        c.targetTexture = rt; c.Render(); RenderTexture.active = rt;
        tex.ReadPixels(new Rect(0, 0, width, height), 0, 0); tex.Apply();
        RenderTexture.active = null; c.targetTexture = null;
        File.WriteAllBytes(Path.Combine(outDir, name), tex.EncodeToJPG(85));
    }

    void Finish()
    {
        File.WriteAllText(Path.Combine(outDir, "DONE.txt"), $"{shot} shots");
        enabled = false;
#if UNITY_EDITOR
        UnityEditor.EditorApplication.isPlaying = false;
        if (Application.isBatchMode) UnityEditor.EditorApplication.Exit(0);
#endif
    }
}
