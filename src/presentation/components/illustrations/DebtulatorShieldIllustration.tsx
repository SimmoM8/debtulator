import React from "react";
import Svg, {
    Circle,
    Defs,
    G,
    LinearGradient,
    Path,
    Rect,
    Stop,
} from "react-native-svg";

type Props = {
  width?: number;
  height?: number;
};

export function DebtulatorShieldIllustration({
  width = 160,
  height = 126,
}: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 126" fill="none">
      <Defs>
        <LinearGradient
          id="shieldMain"
          x1="49"
          y1="18"
          x2="108"
          y2="106"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#3730A3" />
          <Stop offset="1" stopColor="#24185F" />
        </LinearGradient>
        <LinearGradient
          id="shieldGlass"
          x1="22"
          y1="18"
          x2="132"
          y2="96"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#FFFFFF" stopOpacity="0.94" />
          <Stop offset="1" stopColor="#DDD6FE" stopOpacity="0.26" />
        </LinearGradient>
      </Defs>

      <Circle cx="28" cy="86" r="24" fill="#FDBA9B" opacity="0.22" />
      <Circle cx="124" cy="24" r="20" fill="#DDD6FE" opacity="0.48" />
      <Rect
        x="94"
        y="70"
        width="36"
        height="24"
        rx="12"
        fill="url(#shieldGlass)"
        stroke="#FFFFFF"
        strokeOpacity="0.48"
      />
      <Path
        d="M106 82H118"
        stroke="#3730A3"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      <G>
        <Path
          d="M80 16C90 24 102 28 116 30V58C116 80 102 97 80 108C58 97 44 80 44 58V30C58 28 70 24 80 16Z"
          fill="url(#shieldMain)"
        />
        <Path
          d="M80 24C88 30 97 33 108 35V57C108 74 98 87 80 97C62 87 52 74 52 57V35C63 33 72 30 80 24Z"
          fill="#FFFFFF"
          fillOpacity="0.12"
        />
        <Path
          d="M66 59L76 69L96 47"
          stroke="#FFFFFF"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>

      <Circle cx="46" cy="38" r="6" fill="#2FBF8F" />
      <Circle cx="118" cy="52" r="5" fill="#F59E0B" />
    </Svg>
  );
}
