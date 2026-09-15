import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { brand } from '../theme/colors';
import { font } from '../theme/typography';

/** O coração de fio com a conta dourada, por baixo do nome. */
export function HeartThread({ width = 70, color = '#6F7A66', bead = brand.bead }: { width?: number; color?: string; bead?: string }) {
  const height = (width * 20) / 68;
  const heart =
    'M34 15.2 C30.5 11.6 24.2 8.6 24.2 5.2 C24.2 2.3 27.6 1.1 30.1 2.2 C32 3 33.5 4.6 34 6.3 ' +
    'C34.5 4.6 36 3 37.9 2.2 C40.4 1.1 43.8 2.3 43.8 5.2 C43.8 8.6 37.5 11.6 34 15.2';
  const tails = 'M1.5 15.9 C12 14.2 24 16.2 34 15.2 C44 16.2 56 14.2 66.5 15.9';
  return (
    <Svg width={width} height={height} viewBox="0 0 68 20">
      {/* traço largo e transparente por baixo = aspeto de fio de lã */}
      <Path d={heart} stroke={color} strokeOpacity={0.28} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <Path d={tails} stroke={color} strokeOpacity={0.22} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d={heart} stroke={color} strokeWidth={1.05} fill="none" strokeLinecap="round" />
      <Path d={tails} stroke={color} strokeWidth={0.8} fill="none" strokeLinecap="round" />
      <Circle cx={34} cy={15.4} r={1.9} fill={bead} />
      <Circle cx={33.4} cy={14.8} r={0.6} fill="#FFF6E0" />
    </Svg>
  );
}

interface LogoProps {
  size?: number;
  /** Cor das letras e do anel. */
  color?: string;
  ringColor?: string;
  showRing?: boolean;
  background?: string;
}

/** Logótipo Araméa: anel duplo fino, nome espaçado, "feito à mão" e coração de fio. */
export function Logo({ size = 180, color = brand.primary, ringColor = brand.ring, showRing = true, background }: LogoProps) {
  const nameSize = size * 0.145;
  const spacing = size * 0.028;
  return (
    <View style={[{ width: size, height: size }, background ? { backgroundColor: background, borderRadius: size / 2 } : null]}>
      {showRing && (
        <Svg width={size} height={size} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
          <Circle cx={100} cy={100} r={97} stroke={ringColor} strokeWidth={1.3} fill="none" />
          <Circle cx={100} cy={100} r={91.5} stroke={ringColor} strokeWidth={0.8} fill="none" />
        </Svg>
      )}
      <View style={[StyleSheet.absoluteFill, styles.center, { paddingTop: size * 0.06 }]}>
        <Text
          allowFontScaling={false}
          style={{ fontFamily: font.serif, fontSize: nameSize, letterSpacing: spacing, paddingLeft: spacing, color }}
        >
          ARAMÉA
        </Text>
        <Text
          allowFontScaling={false}
          style={{ fontFamily: font.serifMedium, fontSize: size * 0.078, color, marginTop: size * 0.03, letterSpacing: size * 0.004 }}
        >
          feito à mão
        </Text>
        <View style={{ marginTop: size * 0.055 }}>
          <HeartThread width={size * 0.42} color={color} />
        </View>
      </View>
    </View>
  );
}

/** Versão pequena para cabeçalhos: anel duplo com o "A" e a conta dourada. */
export function LogoMark({ size = 44, color = brand.primary, ringColor = brand.ring }: { size?: number; color?: string; ringColor?: string }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Circle cx={50} cy={50} r={47} stroke={ringColor} strokeWidth={2.2} fill="none" />
        <Circle cx={50} cy={50} r={41.5} stroke={ringColor} strokeWidth={1.2} fill="none" />
        <Circle cx={50} cy={79} r={3.2} fill={brand.bead} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text allowFontScaling={false} style={{ fontFamily: font.serif, fontSize: size * 0.5, color, marginTop: -size * 0.06 }}>
          A
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
