import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { HOWITWORKS_COLORS, HOWITWORKS_FPS } from '../../../types/constants';

export const Scene8FullSystem: React.FC = () => {
  const frame = useCurrentFrame();

  // Panels fade in
  const panelsOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const panelsScale = interpolate(frame, [0, 40], [0.9, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Headline timing
  const headlineDelay = 50;
  const headlineOpacity = interpolate(frame, [headlineDelay, headlineDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Subtext items stagger
  const subtext1Delay = HOWITWORKS_FPS * 2;
  const subtext2Delay = HOWITWORKS_FPS * 2.5;
  const subtext3Delay = HOWITWORKS_FPS * 3;
  const subtext4Delay = HOWITWORKS_FPS * 3.5;

  const subtext1Opacity = interpolate(frame, [subtext1Delay, subtext1Delay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subtext2Opacity = interpolate(frame, [subtext2Delay, subtext2Delay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subtext3Opacity = interpolate(frame, [subtext3Delay, subtext3Delay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subtext4Opacity = interpolate(frame, [subtext4Delay, subtext4Delay + 15], [0, 1], {
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

      {/* Three panels arranged horizontally */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          gap: 40,
          padding: '100px 80px',
          opacity: panelsOpacity,
          transform: `scale(${panelsScale})`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 30,
            width: '100%',
          }}
        >
          {/* Web Dashboard */}
          <div
            style={{
              flex: 1,
              maxWidth: 500,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <Img
              src={staticFile('web-app-dashboard-preview.png')}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>

          {/* Trainer App (smaller phone) */}
          <div
            style={{
              width: 220,
              height: 450,
              borderRadius: 30,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              border: '6px solid #1a1a1a',
              background: '#000',
            }}
          >
            <Img
              src={staticFile('trainer-app-scheduleview.PNG')}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>

          {/* Client App (smaller phone) */}
          <div
            style={{
              width: 220,
              height: 450,
              borderRadius: 30,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              border: '6px solid #1a1a1a',
              background: '#000',
            }}
          >
            <Img
              src={staticFile('client-app-viewtrainer.PNG')}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        </div>
      </AbsoluteFill>

      {/* Headline */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingTop: 40,
          zIndex: 5,
        }}
      >
        <div
          style={{
            color: HOWITWORKS_COLORS.accent,
            fontSize: 56,
            fontWeight: 600,
            textAlign: 'center',
            opacity: headlineOpacity,
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
          }}
        >
          One system for your entire training business
        </div>
      </AbsoluteFill>

      {/* Subtext items */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 60,
          zIndex: 5,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              color: HOWITWORKS_COLORS.accent,
              fontSize: 36,
              fontWeight: 400,
              opacity: subtext1Opacity,
              marginBottom: 12,
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
            }}
          >
            Sell lesson packages
          </div>
          <div
            style={{
              color: HOWITWORKS_COLORS.accent,
              fontSize: 36,
              fontWeight: 400,
              opacity: subtext2Opacity,
              marginBottom: 12,
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
            }}
          >
            Manage trainers
          </div>
          <div
            style={{
              color: HOWITWORKS_COLORS.accent,
              fontSize: 36,
              fontWeight: 400,
              opacity: subtext3Opacity,
              marginBottom: 12,
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
            }}
          >
            Track revenue
          </div>
          <div
            style={{
              color: HOWITWORKS_COLORS.accent,
              fontSize: 36,
              fontWeight: 400,
              opacity: subtext4Opacity,
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
            }}
          >
            Automate scheduling
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
