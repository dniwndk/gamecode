using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

/// Builds the cloth sample scene from Assets/Samples/HDCharacterCloth/character_rigged_cloth.fbx and
/// enters play mode. Run from the command line:
///   Unity.exe -projectPath <proj> -batchmode -executeMethod HdClothSample.Run -logFile SampleShots/unity.log
/// or from the menu Tools > HD Cloth Sample > Build and Play.
public static class HdClothSample
{
    const string Dir = "Assets/Samples/HDCharacterCloth";
    const string Fbx = Dir + "/character_rigged_cloth.fbx";

    [MenuItem("Tools/HD Cloth Sample/Build and Play")]
    public static void Run()
    {
        var importer = AssetImporter.GetAtPath(Fbx) as ModelImporter;
        if (importer == null) { Debug.LogError("FBX not found at " + Fbx); if (Application.isBatchMode) EditorApplication.Exit(2); return; }
        importer.animationType = ModelImporterAnimationType.Generic;
        importer.importAnimation = false;
        importer.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
        importer.ExtractTextures(Dir + "/Textures");
        importer.SaveAndReimport();

        var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
        var floor = GameObject.CreatePrimitive(PrimitiveType.Plane); floor.name = "Floor"; floor.transform.localScale = Vector3.one * 2f;
        var fm = new Material(Shader.Find("Standard")); fm.color = new Color(0.55f, 0.55f, 0.58f); floor.GetComponent<Renderer>().sharedMaterial = fm;
        var light = Object.FindFirstObjectByType<Light>(); if (light) { light.transform.rotation = Quaternion.Euler(45, -35, 0); light.intensity = 1.2f; light.shadows = LightShadows.Soft; }

        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Fbx);
        var go = (GameObject)PrefabUtility.InstantiatePrefab(prefab); go.name = "Character";
        go.transform.position = new Vector3(0, 0, -2f);
        go.AddComponent<AshClothChains>();
        go.AddComponent<HdClothSampleMotion>();
        var cap = Object.FindFirstObjectByType<Camera>().gameObject.AddComponent<HdClothSampleCapture>(); cap.target = go.transform;
        cap.outDir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "SampleShots"));
        if (Directory.Exists(cap.outDir)) foreach (var f in Directory.GetFiles(cap.outDir, "*.jpg")) File.Delete(f);

        EditorSceneManager.SaveScene(scene, Dir + "/HdClothSample.unity");
        EditorApplication.EnterPlaymode();
    }
}
