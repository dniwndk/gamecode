using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace CombatProto
{
    /// <summary>Works with both the new Input System and the old Input Manager.</summary>
    public static class ProtoInput
    {
#if ENABLE_INPUT_SYSTEM
        static readonly Key[] Digits =
        {
            Key.Digit0, Key.Digit1, Key.Digit2, Key.Digit3, Key.Digit4,
            Key.Digit5, Key.Digit6, Key.Digit7, Key.Digit8, Key.Digit9,
        };

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
                if (s.sqrMagnitude > 0.04f) v = s;
            }
            return v.sqrMagnitude > 1f ? v.normalized : v;
        }

        public static bool AttackPressed()
        {
            var m = Mouse.current;
            var g = Gamepad.current;
            return Down(Key.J)
                || (m != null && m.leftButton.wasPressedThisFrame)
                || (g != null && g.buttonWest.wasPressedThisFrame);
        }

        public static bool DashPressed()
        {
            var m = Mouse.current;
            var g = Gamepad.current;
            return Down(Key.Space) || Down(Key.LeftShift) || Down(Key.K)
                || (m != null && m.rightButton.wasPressedThisFrame)
                || (g != null && g.buttonSouth.wasPressedThisFrame);
        }

        public static bool DigitDown(int d) { return Down(Digits[d]); }
        public static bool ToggleAimDown() { return Down(Key.M); }
        public static bool SlowMoDown() { return Down(Key.T); }
        public static bool ResetDown() { return Down(Key.R); }
        public static bool HudDown() { return Down(Key.Tab); }

        public static Vector2? MouseScreen()
        {
            var m = Mouse.current;
            if (m == null) return null;
            return m.position.ReadValue();
        }

        public static Vector2 AimStick()
        {
            var g = Gamepad.current;
            return g != null ? g.rightStick.ReadValue() : Vector2.zero;
        }
#else
        public static Vector2 Move()
        {
            Vector2 v = Vector2.zero;
            if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) v.x -= 1f;
            if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) v.x += 1f;
            if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) v.y -= 1f;
            if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) v.y += 1f;
            return v.sqrMagnitude > 1f ? v.normalized : v;
        }

        public static bool AttackPressed() { return Input.GetKeyDown(KeyCode.J) || Input.GetMouseButtonDown(0); }

        public static bool DashPressed()
        {
            return Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.LeftShift)
                || Input.GetKeyDown(KeyCode.K) || Input.GetMouseButtonDown(1);
        }

        public static bool DigitDown(int d) { return Input.GetKeyDown((KeyCode)((int)KeyCode.Alpha0 + d)); }
        public static bool ToggleAimDown() { return Input.GetKeyDown(KeyCode.M); }
        public static bool SlowMoDown() { return Input.GetKeyDown(KeyCode.T); }
        public static bool ResetDown() { return Input.GetKeyDown(KeyCode.R); }
        public static bool HudDown() { return Input.GetKeyDown(KeyCode.Tab); }
        public static Vector2? MouseScreen() { return (Vector2)Input.mousePosition; }
        public static Vector2 AimStick() { return Vector2.zero; }
#endif

        public static Vector2? MouseWorld()
        {
            Vector2? s = MouseScreen();
            Camera cam = Camera.main;
            if (!s.HasValue || cam == null) return null;
            Vector3 w = cam.ScreenToWorldPoint(new Vector3(s.Value.x, s.Value.y, -cam.transform.position.z));
            return new Vector2(w.x, w.y);
        }
    }
}
