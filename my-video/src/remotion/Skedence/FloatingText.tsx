import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { SKEDENCE_COLORS } from '../../../types/constants';

interface FloatingTextProps {
  text: string;
  delay: number;
  x: number;
  y: number;
  opacity?: number;
}

export const FloatingText: React.FC<FloatingTextProps> = ({
  text,
  delay,
  x,
  y,
  opacity: maxOpacity = 0.4,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - delay;

  const opacity = interpolate(localFrame, [0, 20], [0, maxOpacity], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(localFrame, [0, 60], [0, -20], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (localFrame < 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        color: SKEDENCE_COLORS.textSecondary,
        fontSize: 24,
        fontWeight: 400,
        opacity,
        transform: `translateY(${translateY}px)`,
        filter: 'blur(1px)',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};
