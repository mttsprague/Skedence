import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { SOCCER_COLORS } from '../../../types/constants';

interface FloatingMessage {
  text: string;
  delay: number;
  x: number;
  y: number;
}

export const Scene2Reality: React.FC = () => {
  const frame = useCurrentFrame();

  const messages: FloatingMessage[] = [
    { text: 'Can we reschedule tomorrow?', delay: 20, x: 18, y: 15 },
    { text: 'Which package did I buy?', delay: 50, x: 68, y: 22 },
    { text: 'Venmo sent for 3 sessions', delay: 80, x: 15, y: 58 },
    { text: 'Available for 6am workouts?', delay: 110, x: 62, y: 68 },
  ];

  // First overlay text - "With 5 athletes..."
  const overlay1Delay = 180;
  const overlay1Opacity = interpolate(frame, [overlay1Delay, overlay1Delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Second overlay text - "With 15+..."
  const overlay2Delay = 270;
  const overlay2Opacity = interpolate(frame, [overlay2Delay, overlay2Delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SOCCER_COLORS.background,
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
              opacity: messageOpacity,
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '32px 48px',
              borderRadius: 24,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                color: SOCCER_COLORS.text,
                fontSize: 40,
                fontWeight: 400,
              }}
            >
              {message.text}
            </div>
          </div>
        );
      })}

      {/* Overlay text */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 200px',
          zIndex: 5,
        }}
      >
        <div
          style={{
            opacity: overlay1Opacity,
            marginBottom: 30,
          }}
        >
          <div
            style={{
              color: SOCCER_COLORS.accent,
              fontSize: 50,
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            With 5 athletes, you can manage this
          </div>
        </div>

        <div
          style={{
            opacity: overlay2Opacity,
          }}
        >
          <div
            style={{
              color: SOCCER_COLORS.accent,
              fontSize: 56,
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            With 15+, you're losing money
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
