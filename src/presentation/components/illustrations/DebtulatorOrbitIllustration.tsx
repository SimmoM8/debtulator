import React from "react";
import Svg, {
    Circle,
    Defs,
    Ellipse,
    G,
    LinearGradient,
    Path,
    Rect,
    Stop,
} from "react-native-svg";

type Props = {
  width?: number;
  height?: number;
  compact?: boolean;
};

export function DebtulatorOrbitIllustration({
  width = 180,
  height = 140,
  compact = false,
}: Props) {
  const orbitStroke = compact ? 1.5 : 2;

  return (
    <Svg width={width} height={height} viewBox="0 0 180 140" fill="none">
      <Defs>
        <LinearGradient
          id="glassGlow"
          x1="22"
          y1="18"
          x2="156"
          y2="116"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#FFFFFF" stopOpacity="0.92" />
          <Stop offset="1" stopColor="#DDD6FE" stopOpacity="0.28" />
        </LinearGradient>
        <LinearGradient
          id="indigoOrb"
          x1="68"
          y1="22"
          x2="122"
          y2="118"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#3730A3" />
          <Stop offset="1" stopColor="#24185F" />
        </LinearGradient>
        <LinearGradient
          id="peachOrb"
          x1="24"
          y1="58"
          x2="68"
          y2="118"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#FDBA9B" />
          <Stop offset="1" stopColor="#FF6B6B" />
        </LinearGradient>
      </Defs>

      <Ellipse cx="94" cy="122" rx="52" ry="10" fill="#24185F" opacity="0.08" />
      <Circle cx="128" cy="26" r="22" fill="#DDD6FE" opacity="0.52" />
      <Circle cx="38" cy="92" r="26" fill="#FDBA9B" opacity="0.22" />

      <Path
        d="M26 84C41 42 82 18 124 26C148 31 164 48 156 68C147 90 117 100 90 98C56 96 36 114 28 126"
        stroke="#3730A3"
        strokeOpacity="0.16"
        strokeWidth={orbitStroke}
        strokeLinecap="round"
      />
      <Path
        d="M48 22C76 10 128 12 144 38C160 64 126 86 98 86C63 86 38 70 32 48"
        stroke="#24185F"
        strokeOpacity="0.1"
        strokeWidth={orbitStroke}
        strokeLinecap="round"
      />

      <G>
        <Circle cx="98" cy="70" r="38" fill="url(#indigoOrb)" />
        <Circle cx="98" cy="70" r="18" fill="#FFFFFF" fillOpacity="0.12" />
        <Path
          d="M84 79C88 74 93 69 100 64C107 60 114 56 120 51"
          stroke="#FFFFFF"
          strokeOpacity="0.7"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Circle cx="87" cy="82" r="4.5" fill="#2FBF8F" />
        <Circle cx="116" cy="52" r="4" fill="#FDBA9B" />
      </G>

      <G>
        <Circle cx="52" cy="92" r="18" fill="url(#peachOrb)" />
        <Path
          d="M44 92H60"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Path
          d="M52 84V100"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </G>

      <Rect
        x="116"
        y="86"
        width="34"
        height="22"
        rx="11"
        fill="url(#glassGlow)"
        stroke="#FFFFFF"
        strokeOpacity="0.5"
      />
      <Path
        d="M126 97H140"
        stroke="#3730A3"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <Circle cx="148" cy="42" r="6" fill="#2FBF8F" />
      <Circle cx="24" cy="52" r="4" fill="#F59E0B" />
    </Svg>
  );
}
