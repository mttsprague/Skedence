import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { SKEDENCE_COLORS, SKEDENCE_FPS } from '../../../types/constants';
import { ScreenshotCard } from './ScreenshotCard';
import { AnimatedHeadline } from './AnimatedHeadline';

export const Act3Power: React.FC = () => {
  const frame = useCurrentFrame();

  // Parallax effect - subtle elevation
  const parallaxY = interpolate(frame, [0, SKEDENCE_FPS * 10], [0, -30], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [0, 40], [0.95, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Zoom out effect at the end
  const zoomOutStart = SKEDENCE_FPS * 7;
  const finalScale = interpolate(
    frame,
    [zoomOutStart, zoomOutStart + 60],
    [1, 0.85],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Headlines timing
  const headline1Delay = 30;
  const headline2Delay = 60;
  const headline3Delay = 90;
  const headline4Delay = 120;

  // Glow pulse effect (subtle)
  const glowIntensity = interpolate(
    Math.sin(frame * 0.1),
    [-1, 1],
    [0.2, 0.4]
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SKEDENCE_COLORS.background,
        overflow: 'hidden',
      }}
    >
      {/* Vignette effect */}
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

      {/* Third screenshot (Packages/Trainers) with parallax */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${parallaxY}px) scale(${scale * finalScale})`,
        }}
      >
        <ScreenshotCard
          src="packages-or-trainers.png"
          startFrame={0}
          animationDuration={40}
        />
        
        {/* Subtle glow pulse around key areas */}
        {frame > 150 && (
          <div
            style={{
              position: 'absolute',
              top: '30%',
              left: '30%',
              width: '40%',
              height: '20%',
              boxShadow: `0 0 60px rgba(255, 107, 53, ${glowIntensity})`,
              borderRadius: 12,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Headlines stacked vertically */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 5,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 'calc(50% - 120px)',
            transform: 'translate(-50%, -50%)',
            color: '#1a1d24',
            fontSize: 80,
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: '-0.02em',
            opacity: frame >= headline1Delay ? 1 : 0,
            transition: 'opacity 0.5s',
          }}
        >
          Structure.
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 'calc(50% - 20px)',
            transform: 'translate(-50%, -50%)',
            color: '#1a1d24',
            fontSize: 80,
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: '-0.02em',
            opacity: frame >= headline2Delay ? 1 : 0,
            transition: 'opacity 0.5s',
          }}
        >
          Control.
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 'calc(50% + 80px)',
            transform: 'translate(-50%, -50%)',
            color: '#1a1d24',
            fontSize: 80,
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: '-0.02em',
            opacity: frame >= headline3Delay ? 1 : 0,
            transition: 'opacity 0.5s',
          }}
        >
          Visibility.
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 'calc(50% + 200px)',
            transform: 'translate(-50%, -50%)',
            color: '#1a1d24',
            fontSize: 56,
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: '-0.02em',
            opacity: frame >= headline4Delay ? 1 : 0,
            transition: 'opacity 0.5s',
          }}
        >
          All in one dashboard.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
