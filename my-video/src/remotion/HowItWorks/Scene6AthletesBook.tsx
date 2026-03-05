import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { HOWITWORKS_COLORS, HOWITWORKS_FPS } from '../../../types/constants';
import { MobileFrame } from './MobileFrame';

export const Scene6AthletesBook: React.FC = () => {
  const frame = useCurrentFrame();

  // Screen 1: View trainer (0-4.5s)
  const screen1Opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const screen1FadeOut = interpolate(
    frame,
    [HOWITWORKS_FPS * 4, HOWITWORKS_FPS * 4.5],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Headline 1 timing
  const headline1Delay = 40;
  const headline1Opacity = interpolate(frame, [headline1Delay, headline1Delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Screen 2: Purchase passes (4.5-8.5s)
  const screen2Start = HOWITWORKS_FPS * 4.5;
  const screen2Opacity = interpolate(
    frame,
    [screen2Start, screen2Start + 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const screen2FadeOut = interpolate(
    frame,
    [HOWITWORKS_FPS * 8, HOWITWORKS_FPS * 8.5],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Subtext 1 timing
  const subtext1Delay = screen2Start + 40;
  const subtext1Opacity = interpolate(frame, [subtext1Delay, subtext1Delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Screen 3: Book button (8.5-12s)
  const screen3Start = HOWITWORKS_FPS * 8.5;
  const screen3Opacity = interpolate(
    frame,
    [screen3Start, screen3Start + 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Headline 2 timing
  const headline2Delay = screen3Start + 40;
  const headline2Opacity = interpolate(frame, [headline2Delay, headline2Delay + 20], [0, 1], {
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
            'radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.5) 100%)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* Screen 1: View trainer */}
      <div style={{ opacity: screen1Opacity * screen1FadeOut }}>
        <MobileFrame src="client-app-viewtrainer.PNG" startFrame={0} animationDuration={30} />
      </div>

      {/* Headline 1 */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 80,
          zIndex: 5,
          opacity: screen1Opacity * screen1FadeOut,
        }}
      >
        <div
          style={{
            color: HOWITWORKS_COLORS.accent,
            fontSize: 52,
            fontWeight: 600,
            textAlign: 'center',
            opacity: headline1Opacity,
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
          }}
        >
          Athletes choose their trainer
        </div>
      </AbsoluteFill>

      {/* Screen 2: Purchase passes */}
      <div style={{ opacity: screen2Opacity * screen2FadeOut }}>
        <MobileFrame
          src="client-app-purchase-passes.PNG"
          startFrame={screen2Start}
          animationDuration={30}
        />
      </div>

      {/* Subtext 1 */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 80,
          zIndex: 5,
          opacity: screen2Opacity * screen2FadeOut,
        }}
      >
        <div
          style={{
            color: HOWITWORKS_COLORS.accent,
            fontSize: 44,
            fontWeight: 400,
            textAlign: 'center',
            opacity: subtext1Opacity,
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
          }}
        >
          Purchase lesson packages
        </div>
      </AbsoluteFill>

      {/* Screen 3: Book button */}
      <div style={{ opacity: screen3Opacity }}>
        <MobileFrame
          src="client-app-book-button.PNG"
          startFrame={screen3Start}
          animationDuration={30}
        />
      </div>

      {/* Headline 2 */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 80,
          zIndex: 5,
          opacity: screen3Opacity,
        }}
      >
        <div
          style={{
            color: HOWITWORKS_COLORS.accent,
            fontSize: 52,
            fontWeight: 600,
            textAlign: 'center',
            opacity: headline2Opacity,
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
          }}
        >
          Book lessons instantly
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
