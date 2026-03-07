import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { SOCCER_COLORS } from '../../../types/constants';
import { MobileFrame } from '../HowItWorks/MobileFrame';

export const Scene3System: React.FC = () => {
  const frame = useCurrentFrame();

  // Shot 1: Scheduling dashboard (0-5s)
  const shot1Opacity = interpolate(frame, [0, 30, 120, 150], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const text1Delay = 40;
  const text1Opacity = interpolate(
    frame,
    [text1Delay, text1Delay + 20, 120, 150],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Shot 2: Packages (5-10s)
  const shot2Opacity = interpolate(frame, [120, 150, 270, 300], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const text2Delay = 160;
  const text2Opacity = interpolate(
    frame,
    [text2Delay, text2Delay + 20, 270, 300],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Shot 3: Revenue (10-15s)
  const shot3Opacity = interpolate(frame, [270, 300, 420, 450], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const text3Delay = 310;
  const text3Opacity = interpolate(
    frame,
    [text3Delay, text3Delay + 20, 420, 450],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Shot 4: Mobile apps side-by-side (15-20s)
  const shot4Opacity = interpolate(frame, [420, 450], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const text4Delay = 460;
  const text4Opacity = interpolate(frame, [text4Delay, text4Delay + 20], [0, 1], {
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
            'radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.5) 100%)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* Shot 1: Scheduling */}
      <div style={{ opacity: shot1Opacity }}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 120,
            paddingBottom: 120,
          }}
        >
          <Img
            src={staticFile('web-app-time-slots.png')}
            style={{
              width: '70%',
              height: 'auto',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          />
        </AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: text1Opacity,
            zIndex: 5,
          }}
        >
          <div
            style={{
              color: SOCCER_COLORS.accent,
              fontSize: 52,
              fontWeight: 600,
            }}
          >
            One schedule for all your athletes
          </div>
        </div>
      </div>

      {/* Shot 2: Packages */}
      <div style={{ opacity: shot2Opacity }}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 120,
            paddingBottom: 120,
          }}
        >
          <Img
            src={staticFile('web-app-lesson-packages.png')}
            style={{
              width: '70%',
              height: 'auto',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          />
        </AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: text2Opacity,
            zIndex: 5,
          }}
        >
          <div
            style={{
              color: SOCCER_COLORS.accent,
              fontSize: 52,
              fontWeight: 600,
            }}
          >
            Sell training packages upfront
          </div>
        </div>
      </div>

      {/* Shot 3: Revenue */}
      <div style={{ opacity: shot3Opacity }}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 120,
            paddingBottom: 120,
          }}
        >
          <Img
            src={staticFile('web-app-revenue-report.png')}
            style={{
              width: '70%',
              height: 'auto',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          />
        </AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: text3Opacity,
            zIndex: 5,
          }}
        >
          <div
            style={{
              color: SOCCER_COLORS.accent,
              fontSize: 52,
              fontWeight: 600,
            }}
          >
            Track every dollar automatically
          </div>
        </div>
      </div>

      {/* Shot 4: Mobile apps */}
      <div style={{ opacity: shot4Opacity }}>
        <div
          style={{
            position: 'absolute',
            left: '22%',
            top: '50%',
            transform: 'translateY(-50%) scale(0.7)',
          }}
        >
          <MobileFrame src="client-app-book-button.PNG" startFrame={420} animationDuration={30} />
        </div>
        <div
          style={{
            position: 'absolute',
            right: '22%',
            top: '50%',
            transform: 'translateY(-50%) scale(0.7)',
          }}
        >
          <MobileFrame
            src="trainer-app-scheduleview.PNG"
            startFrame={420}
            animationDuration={30}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: text4Opacity,
            zIndex: 5,
          }}
        >
          <div
            style={{
              color: SOCCER_COLORS.accent,
              fontSize: 48,
              fontWeight: 600,
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
            }}
          >
            Athletes book. You get paid. Everyone stays synced
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
