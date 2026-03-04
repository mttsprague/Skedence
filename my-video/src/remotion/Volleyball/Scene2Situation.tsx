import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { VOLLEYBALL_COLORS, VOLLEYBALL_FPS } from '../../../types/constants';
import { FloatingText } from '../Skedence/FloatingText';

export const Scene2Situation: React.FC = () => {
  const frame = useCurrentFrame();

  // Floating messages data
  const messages = [
    { text: 'Are you free Tuesday?', delay: 10, x: 25, y: 20 },
    { text: 'Can we move to 6:30?', delay: 30, x: 65, y: 30 },
    { text: 'Did you get Venmo?', delay: 50, x: 20, y: 60 },
    { text: 'How many sessions left?', delay: 70, x: 70, y: 70 },
  ];

  // Overlay text timing
  const overlay1Delay = VOLLEYBALL_FPS * 5; // 5 seconds
  const overlay1Opacity = interpolate(
    frame,
    [overlay1Delay, overlay1Delay + 20],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const overlay2Delay = VOLLEYBALL_FPS * 7.5; // 7.5 seconds
  const overlay2Opacity = interpolate(
    frame,
    [overlay2Delay, overlay2Delay + 20],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Fade out messages when overlay appears
  const messagesFadeOut = interpolate(
    frame,
    [overlay1Delay - 20, overlay1Delay],
    [1, 0.3],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: VOLLEYBALL_COLORS.background,
      }}
    >
      {/* Vignette effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.6) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Floating text messages */}
      <div style={{ opacity: messagesFadeOut }}>
        {messages.map((msg, i) => (
          <FloatingText key={i} {...msg} />
        ))}
      </div>

      {/* Overlay text */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {/* First overlay */}
          <div
            style={{
              color: VOLLEYBALL_COLORS.accent,
              fontSize: 56,
              fontWeight: 400,
              opacity: overlay1Opacity,
              marginBottom: 60,
            }}
          >
            At 5 athletes, it works.
          </div>

          {/* Second overlay */}
          <div
            style={{
              color: VOLLEYBALL_COLORS.accent,
              fontSize: 56,
              fontWeight: 600,
              opacity: overlay2Opacity,
            }}
          >
            At 15+, it gets messy.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
