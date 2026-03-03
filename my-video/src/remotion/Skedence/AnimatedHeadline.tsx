import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { SKEDENCE_COLORS } from '../../../types/constants';

interface AnimatedHeadlineProps {
  text: string;
  delay: number;
  duration?: number;
  fadeOutStart?: number;
  fadeOutDuration?: number;
  fontSize?: number;
  fontWeight?: number;
  centered?: boolean;
  yOffset?: number;
}

export const AnimatedHeadline: React.FC<AnimatedHeadlineProps> = ({
  text,
  delay,
  duration = 20,
  fadeOutStart,
  fadeOutDuration = 15,
  fontSize = 80,
  fontWeight = 700,
  yOffset = 0,
  centered = true,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - delay;

  // Fade in
  let opacity = interpolate(localFrame, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fade out (if specified)
  if (fadeOutStart !== undefined) {
    const fadeOutFrame = frame - fadeOutStart;
    const fadeOutOpacity = interpolate(
      fadeOutFrame,
      [0, fadeOutDuration],
      [1, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );
    opacity = Math.min(opacity, fadeOutOpacity);
  }

  const translateY = interpolate(localFrame, [0, duration], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (localFrame < 0) return null;

  return (
    <div
      style={{
        position: centered ? 'absolute' : 'relative',
        left: centered ? '50%' : undefined,
        top: centered ? `calc(50% + ${yOffset}px)` : undefined,
        transform: centered
          ? `translate(-50%, calc(-50% + ${translateY}px))`
          : `translateY(${translateY}px)`,
        color: SKEDENCE_COLORS.text,
        fontSize,
        fontWeight,
        opacity,
        textAlign: centered ? 'center' : 'left',
        letterSpacing: '-0.02em',
      }}
    >
      {text}
    </div>
  );
};
