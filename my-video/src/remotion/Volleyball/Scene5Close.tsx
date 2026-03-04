import React from 'react';
import { AbsoluteFill, interpolate, Img, useCurrentFrame, staticFile } from 'remotion';
import { VOLLEYBALL_COLORS, VOLLEYBALL_FPS } from '../../../types/constants';
import { ScreenshotCard } from '../Skedence/ScreenshotCard';

export const Scene5Close: React.FC = () => {
  const frame = useCurrentFrame();

  // Dashboard visibility (0-5s)
  const dashboardOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dashboardFadeOut = interpolate(
    frame,
    [VOLLEYBALL_FPS * 4, VOLLEYBALL_FPS * 5],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Text 1 timing
  const text1Delay = 40;
  const text1Opacity = interpolate(frame, [text1Delay, text1Delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const text1FadeOut = interpolate(
    frame,
    [VOLLEYBALL_FPS * 4, VOLLEYBALL_FPS * 5],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Logo appearance (5s+)
  const logoStart = VOLLEYBALL_FPS * 5;
  const logoOpacity = interpolate(frame, [logoStart, logoStart + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const logoScale = interpolate(frame, [logoStart, logoStart + 30], [0.9, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Text 2 timing
  const text2Delay = logoStart + 40;
  const text2Opacity = interpolate(frame, [text2Delay, text2Delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: VOLLEYBALL_COLORS.background,
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

      {/* Dashboard screenshot */}
      <div style={{ opacity: dashboardOpacity * dashboardFadeOut }}>
        <ScreenshotCard
          src="dashboard-preview.png"
          startFrame={0}
          animationDuration={30}
        />
      </div>

      {/* Text over dashboard */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 5,
          opacity: dashboardOpacity * dashboardFadeOut,
        }}
      >
        <div
          style={{
            color: VOLLEYBALL_COLORS.accent,
            fontSize: 52,
            fontWeight: 400,
            textAlign: 'center',
            opacity: text1Opacity * text1FadeOut,
            maxWidth: '80%',
          }}
        >
          Skedence is built for private training businesses.
        </div>
      </AbsoluteFill>

      {/* Logo section */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: logoOpacity,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            transform: `scale(${logoScale})`,
          }}
        >
          {/* Logo */}
          <div
            style={{
              marginBottom: 60,
              padding: 20,
              borderRadius: 20,
              background: '#000000',
              display: 'inline-block',
            }}
          >
            <Img
              src={staticFile('skedence-logo.png')}
              style={{
                width: 400,
                height: 'auto',
                display: 'block',
                filter:
                  'invert(1) sepia(1) saturate(5) hue-rotate(330deg) brightness(1.1) drop-shadow(0 0 30px rgba(255, 107, 53, 0.8))',
              }}
            />
          </div>

          {/* Tagline */}
          <div
            style={{
              color: VOLLEYBALL_COLORS.accent,
              fontSize: 48,
              fontWeight: 400,
              textAlign: 'center',
              letterSpacing: '-0.02em',
              opacity: text2Opacity,
            }}
          >
            Run your lessons like a business.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
