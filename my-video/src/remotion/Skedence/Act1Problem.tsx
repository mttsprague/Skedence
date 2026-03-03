import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { SKEDENCE_COLORS, SKEDENCE_FPS } from '../../../types/constants';
import { FloatingText } from './FloatingText';
import { AnimatedHeadline } from './AnimatedHeadline';

export const Act1Problem: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow push-in effect (removed camera shake)
  const scale = interpolate(frame, [0, SKEDENCE_FPS * 10], [1, 1.1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Floating messages data
  const messages = [
    { text: 'Are you free Tuesday?', delay: 10, x: 20, y: 20 },
    { text: 'Can we reschedule?', delay: 25, x: 70, y: 30 },
    { text: 'Did you get Venmo?', delay: 40, x: 15, y: 60 },
    { text: 'How many sessions left?', delay: 55, x: 65, y: 70 },
    { text: 'What time again?', delay: 70, x: 40, y: 40 },
    { text: 'Can I pay cash?', delay: 85, x: 25, y: 80 },
  ];

  // Main headline timing
  const listItemDelay = SKEDENCE_FPS * 1; // 1 second - list appears first
  const headlineDelay = SKEDENCE_FPS * 6; // 6 seconds - headline appears after list fades (moved back 1 second)
  const listItems = ['Text messages.', 'Venmo.', 'Spreadsheets.', 'Calendar apps.'];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SKEDENCE_COLORS.background,
        transform: `scale(${scale})`,
        overflow: 'hidden',
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
      {messages.map((msg, i) => (
        <FloatingText key={i} {...msg} />
      ))}

      {/* Main headline */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <AnimatedHeadline
          text="Still running your training like this?"
          delay={headlineDelay}
          duration={30}
          fadeOutStart={headlineDelay + 60}
          fadeOutDuration={20}
          fontSize={72}
        />
      </AbsoluteFill>

      {/* List items */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 120,
        }}
      >
        <div>
          {listItems.map((item, i) => {
            const itemDelay = listItemDelay + i * 25; // Slower stagger
            const localFrame = frame - itemDelay;

            // Fade in
            const fadeInOpacity = interpolate(localFrame, [0, 20], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            // Fade out before headline appears
            const fadeOutStart = headlineDelay - 30;
            const fadeOutOpacity = interpolate(frame, [fadeOutStart, fadeOutStart + 20], [1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            const opacity = fadeInOpacity * fadeOutOpacity;

            if (localFrame < 0) return null;

            return (
              <div
                key={i}
                style={{
                  color: SKEDENCE_COLORS.textSecondary,
                  fontSize: 48,
                  fontWeight: 400,
                  opacity,
                  textAlign: 'center',
                  marginBottom: 20,
                }}
              >
                {item}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
