import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { HOWITWORKS_COLORS, HOWITWORKS_FPS } from '../../../types/constants';

interface FloatingMessage {
  text: string;
  delay: number;
  x: number;
  y: number;
}

export const Scene1Problem: React.FC = () => {
  const frame = useCurrentFrame();

  const messages: FloatingMessage[] = [
    { text: 'Are you free Tuesday?', delay: 20, x: 20, y: 15 },
    { text: 'Can we move to 6:30?', delay: 40, x: 70, y: 25 },
    { text: 'Did you get the Venmo?', delay: 60, x: 15, y: 60 },
    { text: 'How many sessions do we have left?', delay: 80, x: 65, y: 70 },
  ];

  // Headline timing (appears after 3 seconds)
  const headlineDelay = HOWITWORKS_FPS * 3;
  const headlineOpacity = interpolate(frame, [headlineDelay, headlineDelay + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fade out everything at the end (last 1.5 seconds)
  const fadeOutStart = HOWITWORKS_FPS * 6.5;
  const fadeOutOpacity = interpolate(frame, [fadeOutStart, fadeOutStart + 45], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: HOWITWORKS_COLORS.background,
      }}
    >
      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.6) 100%)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* Floating messages */}
      {messages.map((message, index) => {
        const messageOpacity = interpolate(frame, [message.delay, message.delay + 20], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const yOffset = interpolate(frame, [message.delay, message.delay + 60], [20, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: `${message.x}%`,
              top: `${message.y}%`,
              transform: `translateY(${yOffset}px)`,
              opacity: messageOpacity * fadeOutOpacity,
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '32px 48px',
              borderRadius: 24,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                color: HOWITWORKS_COLORS.textSecondary,
                fontSize: 40,
                fontWeight: 400,
              }}
            >
              {message.text}
            </div>
          </div>
        );
      })}

      {/* Headline */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 200px',
          opacity: headlineOpacity * fadeOutOpacity,
        }}
      >
        <div
          style={{
            color: HOWITWORKS_COLORS.accent,
            fontSize: 56,
            fontWeight: 600,
            textAlign: 'center',
            lineHeight: 1.3,
          }}
        >
          Managing private training through texts and spreadsheets gets messy fast
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
