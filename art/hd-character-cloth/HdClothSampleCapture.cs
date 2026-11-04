using System.IO;
using UnityEngine;

/// Captures the sample from a 3/4 front camera and a side camera into <project>/SampleShots as JPG.
/// Runs at a fixed 30 fps capture clock so the result is the same in batch mode and in the editor.
public class HdClothSampleCapture : MonoBehaviour
{
    public Transform target;
    public float duration = 9f;
    public int everyNthFrame = 3;       // 30 fps clock -> 10 shots per second
    public int width = 960, height = 540;
    public string outDir;
    Camera camA, camB;
    RenderTexture rt; Texture2D tex;
    int frame, shot;

    void Start()
    {
        Time.captureFramerate = 30;
        if (string.IsNullOrEmpty(outDir)) outDir = Path.Combine(Application.dataPath, "..", "SampleShots");
        Directory.CreateDirectory(outDir);
        camA = MakeCam("CamFront"); camB = MakeCam("CamSide");
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
        Vector3 focus = target.position + Vector3.up * 1.0f;
        c.transform.position = focus + offsetDir.normalized * dist + Vector3.up * 0.15f;
        c.transform.LookAt(focus);
    }

    void LateUpdate()
    {
        if (target == null) return;
        frame++;
        if (frame % everyNthFrame != 0) return;
        // cameras follow the character in world space (not its yaw), so the turn is visible
        Aim(camA, new Vector3(-0.7f, 0f, -1f), 3.2f);
        Aim(camB, new Vector3(1f, 0f, 0f), 3.2f);
        Save(camA, $"front_{shot:D3}.jpg"); Save(camB, $"side_{shot:D3}.jpg");
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
