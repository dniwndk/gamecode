using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace Ashblade
{
    /// <summary>Works with both the new Input System and the old Input Manager.</summary>
    public static class AshInput
    {
        public static bool PadActive;

#if ENABLE_INPUT_SYSTEM
        static readonly Key[] Digits = { Key.Digit0, Key.Digit1, Key.Digit2, Key.Digit3, Key.Digit4, Key.Digit5, Key.Digit6, Key.Digit7, Key.Digit8, Key.Digit9 };
        static bool Down(Key k) { var kb = Keyboard.current; return kb != null && kb[k].wasPressedThisFrame; }
        static bool Held(Key k) { var kb = Keyboard.current; return kb != null && kb[k].isPressed; }

        public static Vector2 Move()
        {
            Vector2 v = Vector2.zero;
            if (Held(Key.A) || Held(Key.LeftArrow)) v.x -= 1f;
            if (Held(Key.D) || Held(Key.RightArrow)) v.x += 1f;
            if (Held(Key.S) || Held(Key.DownArrow)) v.y -= 1f;
            if (Held(Key.W) || Held(Key.UpArrow)) v.y += 1f;
            var g = Gamepad.current;
            if (g != null)
            {
                Vector2 s = g.leftStick.ReadValue();
                if (s.sqrMagnitude > 0.04f) { v = s; PadActive = true; }
            }
            return v.sqrMagnitude > 1f ? v.normalized : v;
        }
        public static Vector2 AimStick()
        {
            var g = Gamepad.current;
            if (g == null) return Vector2.zero;
            Vector2 s = g.rightStick.ReadValue();
            if (s.sqrMagnitude > 0.09f) PadActive = true;
            return s;
        }
        public static bool AttackPressed()
        {
            var m = Mouse.current; var g = Gamepad.current;
            if (g != null && g.buttonWest.wasPressedThisFrame) PadActive = true;
            return Down(Key.J) || (m != null && m.leftButton.wasPressedThisFrame) || (g != null && g.buttonWest.wasPressedThisFrame);
        }
        public static bool AttackHeld()
        {
            var m = Mouse.current; var g = Gamepad.current;
            return Held(Key.J) || (m != null && m.leftButton.isPressed) || (g != null && g.buttonWest.isPressed);
        }
        public static bool DashPressed()
        {
            var m = Mouse.current; var g = Gamepad.current;
            return Down(Key.Space) || Down(Key.LeftShift) || Down(Key.K) || (m != null && m.rightButton.wasPressedThisFrame)
                || (g != null && (g.buttonSouth.wasPressedThisFrame || g.leftShoulder.wasPressedThisFrame));
        }
        public static bool BurstPressed()
        {
            var g = Gamepad.current;
            return Down(Key.Q) || Down(Key.E) || Down(Key.L) || (g != null && (g.buttonNorth.wasPressedThisFrame || g.rightShoulder.wasPressedThisFrame));
        }
        public static bool DigitDown(int d) { return Down(Digits[d]); }
        public static bool RerollDown(int i) { return Down(i == 0 ? Key.Z : i == 1 ? Key.X : Key.C); }
        public static bool ToggleAimDown() { return Down(Key.M); }
        public static bool SlowMoDown() { return Down(Key.T); }
        public static bool ResetDown() { var g = Gamepad.current; return Down(Key.R) || (g != null && g.selectButton.wasPressedThisFrame); }
        public static bool PauseDown() { var g = Gamepad.current; return Down(Key.P) || Down(Key.Escape) || (g != null && g.startButton.wasPressedThisFrame); }
        public static bool HudDown() { return Down(Key.Tab); }
        public static bool PanelDown() { return Down(Key.F1); }
        public static bool MouseMoved() { var m = Mouse.current; return m != null && m.delta.ReadValue().sqrMagnitude > 0.5f; }
        public static Vector2? MouseScreen() { var m = Mouse.current; if (m == null) return null; return m.position.ReadValue(); }

        static float rumbleUntil;
        public static void Rumble(float strong, float weak, float ms)
        {
            var g = Gamepad.current;
            if (g == null) return;
            g.SetMotorSpeeds(strong, weak);
            rumbleUntil = Time.unscaledTime + ms / 1000f;
        }
        public static void Tick()
        {
            if (rumbleUntil > 0f && Time.unscaledTime > rumbleUntil)
            {
                rumbleUntil = 0f;
                var g = Gamepad.current;
                if (g != null) g.SetMotorSpeeds(0f, 0f);
            }
        }
#else
        static float Axis(string name) { try { return Input.GetAxisRaw(name); } catch (System.ArgumentException) { return 0f; } }

        public static Vector2 Move()
        {
            Vector2 v = Vector2.zero;
            if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) v.x -= 1f;
            if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) v.x += 1f;
            if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) v.y -= 1f;
            if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) v.y += 1f;
            if (v == Vector2.zero)
            {
                var s = new Vector2(Axis("Horizontal"), Axis("Vertical"));
                if (s.sqrMagnitude > 0.04f) v = s;
            }
            return v.sqrMagnitude > 1f ? v.normalized : v;
        }
        public static Vector2 AimStick() { return Vector2.zero; }
        public static bool AttackPressed()
        {
            if (Input.GetKeyDown(KeyCode.JoystickButton2)) PadActive = true;
            return Input.GetKeyDown(KeyCode.J) || Input.GetMouseButtonDown(0) || Input.GetKeyDown(KeyCode.JoystickButton2);
        }
        public static bool AttackHeld() { return Input.GetKey(KeyCode.J) || Input.GetMouseButton(0) || Input.GetKey(KeyCode.JoystickButton2); }
        public static bool DashPressed()
        {
            return Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.K)
                || Input.GetMouseButtonDown(1) || Input.GetKeyDown(KeyCode.JoystickButton0) || Input.GetKeyDown(KeyCode.JoystickButton4);
        }
        public static bool BurstPressed()
        {
            return Input.GetKeyDown(KeyCode.Q) || Input.GetKeyDown(KeyCode.E) || Input.GetKeyDown(KeyCode.L)
                || Input.GetKeyDown(KeyCode.JoystickButton3) || Input.GetKeyDown(KeyCode.JoystickButton5);
        }
        public static bool DigitDown(int d) { return Input.GetKeyDown((KeyCode)((int)KeyCode.Alpha0 + d)); }
        public static bool RerollDown(int i) { return Input.GetKeyDown(i == 0 ? KeyCode.Z : i == 1 ? KeyCode.X : KeyCode.C); }
        public static bool ToggleAimDown() { return Input.GetKeyDown(KeyCode.M); }
        public static bool SlowMoDown() { return Input.GetKeyDown(KeyCode.T); }
        public static bool ResetDown() { return Input.GetKeyDown(KeyCode.R) || Input.GetKeyDown(KeyCode.JoystickButton6); }
        public static bool PauseDown() { return Input.GetKeyDown(KeyCode.P) || Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.JoystickButton7); }
        public static bool HudDown() { return Input.GetKeyDown(KeyCode.Tab); }
        public static bool PanelDown() { return Input.GetKeyDown(KeyCode.F1); }
        public static bool MouseMoved() { return Mathf.Abs(Axis("Mouse X")) + Mathf.Abs(Axis("Mouse Y")) > 0.01f; }
        public static Vector2? MouseScreen() { return (Vector2)Input.mousePosition; }
        public static void Rumble(float strong, float weak, float ms) { }
        public static void Tick() { }
#endif
    }
}
