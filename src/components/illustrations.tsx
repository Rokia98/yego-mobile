import React from 'react';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { COLORS } from '../theme';

// Illustrations vectorielles pour l'onboarding. viewBox commun : 260 × 200.

type Props = { size?: number };

function base(size: number) {
  return { width: size, height: (size * 200) / 260 };
}

export function IllustrationRecherche({ size = 240 }: Props) {
  return (
    <Svg {...base(size)} viewBox="0 0 260 200">
      <Line x1={20} y1={168} x2={240} y2={168} stroke={COLORS.border} strokeWidth={4} strokeLinecap="round" />
      {/* Autocar */}
      <Rect x={26} y={78} width={150} height={78} rx={16} fill={COLORS.orange} />
      <Rect x={38} y={92} width={36} height={30} rx={6} fill={COLORS.white} />
      <Rect x={84} y={92} width={30} height={30} rx={6} fill={COLORS.white} />
      <Rect x={124} y={92} width={30} height={30} rx={6} fill={COLORS.white} />
      <Rect x={30} y={132} width={142} height={8} rx={4} fill={COLORS.orangeSombre} />
      <Circle cx={64} cy={158} r={15} fill={COLORS.dark} />
      <Circle cx={64} cy={158} r={6} fill={COLORS.white} />
      <Circle cx={140} cy={158} r={15} fill={COLORS.dark} />
      <Circle cx={140} cy={158} r={6} fill={COLORS.white} />
      {/* Épingle de destination */}
      <G transform="translate(178, 26)">
        <Path
          d="M28 0 C 12 0, 0 12, 0 28 C 0 48, 28 60, 28 60 C 28 60, 56 48, 56 28 C 56 12, 44 0, 28 0 Z"
          fill={COLORS.dark}
        />
        <Circle cx={28} cy={26} r={13} fill={COLORS.white} />
      </G>
    </Svg>
  );
}

export function IllustrationPaiement({ size = 240 }: Props) {
  return (
    <Svg {...base(size)} viewBox="0 0 260 200">
      <Line x1={20} y1={172} x2={240} y2={172} stroke={COLORS.border} strokeWidth={4} strokeLinecap="round" />
      {/* Téléphone */}
      <Rect x={86} y={20} width={104} height={158} rx={18} fill={COLORS.dark} />
      <Rect x={96} y={34} width={84} height={118} rx={8} fill={COLORS.white} />
      <Rect x={124} y={162} width={28} height={6} rx={3} fill={COLORS.white} opacity={0.5} />
      {/* Montant à l'écran */}
      <Circle cx={138} cy={74} r={22} fill={COLORS.orange} />
      <Circle cx={138} cy={74} r={12} fill={COLORS.white} opacity={0.35} />
      <Rect x={108} y={108} width={60} height={8} rx={4} fill={COLORS.border} />
      <Rect x={108} y={124} width={40} height={8} rx={4} fill={COLORS.border} />
      {/* Pastille validée */}
      <Circle cx={178} cy={150} r={24} fill={COLORS.green} />
      <Path d="M167 150 l7 7 l14 -15" stroke={COLORS.white} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Pièces flottantes */}
      <Circle cx={54} cy={70} r={14} fill={COLORS.orangeWash} />
      <Circle cx={54} cy={70} r={6} fill={COLORS.orange} />
      <Circle cx={40} cy={116} r={10} fill={COLORS.orangeWash} />
    </Svg>
  );
}

export function IllustrationTicket({ size = 240 }: Props) {
  const modules = [
    [0, 0], [1, 0], [2, 0], [4, 0],
    [0, 1], [2, 1], [3, 1],
    [0, 2], [1, 2], [4, 2],
    [2, 3], [3, 3],
    [0, 4], [1, 4], [3, 4], [4, 4],
  ];
  return (
    <Svg {...base(size)} viewBox="0 0 260 200">
      {/* Billet */}
      <Rect x={34} y={46} width={192} height={108} rx={16} fill={COLORS.white} stroke={COLORS.border} strokeWidth={2} />
      {/* Perforation */}
      <Line
        x1={158}
        y1={58}
        x2={158}
        y2={142}
        stroke={COLORS.border}
        strokeWidth={3}
        strokeDasharray="6 7"
        strokeLinecap="round"
      />
      <Circle cx={158} cy={46} r={9} fill={COLORS.background} />
      <Circle cx={158} cy={154} r={9} fill={COLORS.background} />
      {/* QR */}
      <G transform="translate(54, 62)">
        {modules.map(([c, r], i) => (
          <Rect key={i} x={c * 15} y={r * 15} width={12} height={12} rx={2} fill={COLORS.dark} />
        ))}
      </G>
      {/* Lignes d'info à droite */}
      <Rect x={176} y={72} width={38} height={8} rx={4} fill={COLORS.dark} />
      <Rect x={176} y={92} width={30} height={7} rx={3.5} fill={COLORS.border} />
      <Rect x={176} y={108} width={34} height={7} rx={3.5} fill={COLORS.border} />
      <Rect x={176} y={124} width={22} height={7} rx={3.5} fill={COLORS.orange} />
    </Svg>
  );
}
