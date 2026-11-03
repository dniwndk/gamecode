// Presents the 320x180 render target. _Shift moves the red channel one way and the blue channel the other (chromatic aberration).
Shader "Hidden/Ashblade/AshPresent"
{
    Properties { _MainTex ("Texture", 2D) = "white" {} _Shift ("Shift (uv)", Float) = 0 }
    SubShader
    {
        Cull Off ZWrite Off ZTest Always Lighting Off
        Blend Off
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            sampler2D _MainTex;
            float _Shift;
            struct appdata { float4 vertex : POSITION; float2 uv : TEXCOORD0; };
            struct v2f { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; };
            v2f vert (appdata v) { v2f o; o.pos = UnityObjectToClipPos(v.vertex); o.uv = v.uv; return o; }
            fixed4 frag (v2f i) : SV_Target
            {
                fixed4 c = tex2D(_MainTex, i.uv);
                c.r = tex2D(_MainTex, saturate(i.uv - float2(_Shift, 0))).r;
                c.b = tex2D(_MainTex, saturate(i.uv + float2(_Shift, 0))).b;
                c.a = 1;
                return c;
            }
            ENDCG
        }
    }
}
