import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { SKEDENCE_COLORS, SKEDENCE_FPS } from '../../../types/constants';
import { ScreenshotCard } from './ScreenshotCard';
import { AnimatedHeadline } from './AnimatedHeadline';

export const Act2Shift: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow push-in effect toward the UI
  const scale = interpolate(frame, [0, SKEDENCE_FPS * 12], [1, 1.15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // First headline timing
  const headline1Delay = 20;
  const headline2Delay = 60;

  // Transition to revenue screenshot
  const revenueTransitionStart = SKEDENCE_FPS * 6;
  const schedulingOpacity = interpolate(
    frame,
    [revenueTransitionStart, revenueTransitionStart + 20],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Revenue screenshot appearance
  const revenueOpacity = interpolate(
    frame,
    [revenueTransitionStart + 10, revenueTransitionStart + 40],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const revenueScale = interpolate(
    frame,
    [revenueTransitionStart + 10, revenueTransitionStart + 40],
    [0.9, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Horizontal pan for revenue
  const panX = interpolate(
    frame,
    [revenueTransitionStart + 40, SKEDENCE_FPS * 12],
    [0, -50],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Revenue headlines
  const revenueHeadline1 = revenueTransitionStart + 45;
  const revenueHeadline2 = revenueTransitionStart + 70;
  const revenueHeadline3 = revenueTransitionStart + 95;

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
            'radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.5) 100%)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* Scheduling dashboard screenshot */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${scale})`,
          opacity: schedulingOpacity,
        }}
      >
        <ScreenshotCard
          src="scheduling-dashboard.png"
          startFrame={0}
          animationDuration={30}
        />
      </div>

      {/* First set of headlines - "Everything. In one place." */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: schedulingOpacity,
          zIndex: 5,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 'calc(50% - 60px)',
            transform: 'translate(-50%, -50%)',
            color: '#ff6b35',
            fontSize: 90,
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: '-0.02em',
            opacity: frame >= headline1Delay && frame < (revenueTransitionStart - 30) ? 1 : 0,
            transition: 'opacity 0.5s',
          }}
        >
          Everything.
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 'calc(50% + 60px)',
            transform: 'translate(-50%, -50%)',
            color: '#ff6b35',
            fontSize: 90,
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: '-0.02em',
            opacity: frame >= headline2Delay && frame < (revenueTransitionStart - 30) ? 1 : 0,
            transition: 'opacity 0.5s',
          }}
        >
          In one place.
        </div>
      </AbsoluteFill>

      {/* Revenue screenshot with pan */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateX(${panX}px) scale(${revenueScale})`,
          opacity: revenueOpacity,
        }}
      >
        <ScreenshotCard
          src="revenue-report.png"
          startFrame={revenueTransitionStart + 10}
          animationDuration={30}
        />
      </div>

      {/* Revenue headlines */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingLeft: '10%',
          opacity: revenueOpacity,
          zIndex: 5,
        }}
      >
        <div style={{ marginBottom: 30 }}>
          <div
            style={{
              color: '#ff6b35',
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              opacity: frame >= revenueHeadline1 ? 1 : 0,
              transition: 'opacity 0.5s',
            }}
          >
            Customize your schedule.
          </div>
        </div>
        <div style={{ marginBottom: 30 }}>
          <div
            style={{
              color: '#ff6b35',
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              opacity: frame >= revenueHeadline2 ? 1 : 0,
              transition: 'opacity 0.5s',
            }}
          >
            Collect instant payments.
          </div>
        </div>
        <div>
          <div
            style={{
              color: '#ff6b35',
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              opacity: frame >= revenueHeadline3 ? 1 : 0,
              transition: 'opacity 0.5s',
            }}
          >
            Understand your revenue.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
