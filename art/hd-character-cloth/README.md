Unity cloth sample for the rigged HD character (coat / front panel / wing chains).

1. Copy this folder's files into the Unity project:
   Assets/Samples/HDCharacterCloth/character_rigged_cloth.fbx
   Assets/Samples/HDCharacterCloth/AshClothChains.cs
   Assets/Samples/HDCharacterCloth/HdClothSampleMotion.cs
   Assets/Samples/HDCharacterCloth/HdClothSampleCapture.cs
   Assets/Samples/HDCharacterCloth/Editor/HdClothSample.cs
2. Run (project closed in the editor):
   "<Unity.exe>" -projectPath <project> -batchmode -executeMethod HdClothSample.Run -logFile <project>\SampleShots\unity.log
   or open the project and use Tools > HD Cloth Sample > Build and Play.
3. Output: <project>/SampleShots/front_###.jpg, side_###.jpg, DONE.txt (9 s: walk, turn, crouch, stand).
