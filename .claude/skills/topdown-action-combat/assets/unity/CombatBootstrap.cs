using UnityEngine;

namespace CombatProto
{
    /// <summary>
    /// Put this on an empty GameObject in an empty scene and press Play.
    /// It builds the camera, arena, player, a training dummy and chasers in code.
    /// </summary>
    [RequireComponent(typeof(CombatTuning))]
    public class CombatBootstrap : MonoBehaviour
    {
        [Tooltip("Optional: the sliced frames of hit-spark.png (spark-fx library), played at each hit")]
        public Sprite[] hitSparkFrames;
        public float hitSparkFps = 30f;

        void Start()
        {
            Camera cam = Camera.main;
            if (cam == null)
            {
                var go = new GameObject("Main Camera");
                go.tag = "MainCamera";
                cam = go.AddComponent<Camera>();
            }
            if (cam.GetComponent<AudioListener>() == null) cam.gameObject.AddComponent<AudioListener>();
            cam.orthographic = true;
            cam.orthographicSize = 180f / 2f / PixelArt.PPU; // 320 x 180 pixel view
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color32(18, 16, 26, 255);
            cam.transform.SetPositionAndRotation(new Vector3(0f, 0f, -10f), Quaternion.identity);

            EnsureGlobalLight2D();

            var arena = new GameObject("Arena").AddComponent<SpriteRenderer>();
            arena.sprite = PixelArt.Arena();
            arena.sortingOrder = -20000;

            Feel feel = gameObject.AddComponent<Feel>();
            feel.hitSparkFrames = hitSparkFrames;
            feel.hitSparkFps = hitSparkFps;
            feel.Init(cam);

            var player = new GameObject("Player").AddComponent<PlayerController>();
            player.pos = new Vector2(-4f, 0f);
            player.Init();

            SpawnEnemy("Training Dummy", true, new Vector2(-1f, 2.5f));
            CombatTuning t = CombatTuning.I;
            for (int i = 0; i < t.chaserCount; i++)
            {
                var at = new Vector2(Random.Range(2f, 9f), Random.Range(-4.5f, 4.5f));
                SpawnEnemy("Chaser " + (i + 1), false, at);
            }
        }

        /// <summary>
        /// URP 2D renders lit sprites black when the scene has no 2D light, so add a global one.
        /// Does nothing in the built-in pipeline or when a 2D light already exists.
        /// </summary>
        static void EnsureGlobalLight2D()
        {
            System.Type type = System.Type.GetType("UnityEngine.Rendering.Universal.Light2D, Unity.RenderPipelines.Universal.Runtime");
            if (type == null || Object.FindFirstObjectByType(type) != null) return;
            Component light = new GameObject("Global Light 2D").AddComponent(type);
            System.Reflection.PropertyInfo prop = type.GetProperty("lightType");
            if (prop != null && prop.CanWrite)
                prop.SetValue(light, System.Enum.Parse(prop.PropertyType, "Global"));
        }

        static void SpawnEnemy(string name, bool passive, Vector2 at)
        {
            var e = new GameObject(name).AddComponent<Enemy>();
            e.Init(passive, at);
        }
    }
}
