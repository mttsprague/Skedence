import React from 'react';
import { AbsoluteFill, interpolate, Img, useCurrentFrame, staticFile } from 'remotion';
import { SKEDENCE_COLORS, SKEDENCE_FPS } from '../../../types/constants';
import { AnimatedHeadline } from './AnimatedHeadline';
import { ScreenshotCard } from './ScreenshotCard';

export const Act4Identity: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade to dark
  const fadeInDuration = 30;
  const fadeOpacity = interpolate(frame, [0, fadeInDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Split screen timing
  const splitScreenStart = SKEDENCE_FPS * 2;
  const splitScreenDuration = 40;

  const splitOpacity = interpolate(
    frame,
    [splitScreenStart, splitScreenStart + splitScreenDuration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Headlines
  const headline1Delay = splitScreenStart + 20;
  const headline2Delay = splitScreenStart + 70;

  // Final logo timing
  const logoStart = SKEDENCE_FPS * 8;
  const logoOpacity = interpolate(
    frame,
    [logoStart, logoStart + 40],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const logoScale = interpolate(
    frame,
    [logoStart, logoStart + 40],
    [0.9, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Tagline
  const taglineDelay = logoStart + 50;

  // Fade out split screen for final branding
  const splitFadeOut = interpolate(
    frame,
    [logoStart - 20, logoStart + 10],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SKEDENCE_COLORS.background,
        opacity: fadeOpacity,
      }}
    >
      {/* Split screen section */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          opacity: splitOpacity * splitFadeOut,
        }}
      >
        {/* Left side - Professional chaos representation */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(15, 17, 21, 0.9) 0%, rgba(25, 28, 35, 0.95) 100%)',
          }}
        >
          {/* Scattered chaos elements */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(4, 1fr)',
              gap: 20,
              padding: 40,
              opacity: 0.4,
              filter: 'blur(1px)',
            }}
          >
            {[
              '📧', '📱', '💬', '📋', '📅', '💵',
              '❓', '⏰', '📝', '🔄', '⚠️', '📊'
            ].map((emoji, i) => (
              <div
                key={i}
                style={{
                  fontSize: 48,
                  opacity: 0.3 + (i % 3) * 0.1,
                  transform: `rotate(${(i % 4) * 15 - 20}deg)`,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {emoji}
              </div>
            ))}
          </div>
          
          {/* Overlapping text messages */}
          <div
            style={{
              position: 'relative',
              width: '80%',
              display: 'flex',
              flexDirection: 'column',
              gap: 30,
            }}
          >
            {[
              'Are you free Tuesday?',
              'Can we reschedule?',
              'Did you get Venmo?',
              'How many sessions left?',
              'What time again?'
            ].map((text, i) => (
              <div
                key={i}
                style={{
                  color: SKEDENCE_COLORS.textSecondary,
                  fontSize: 22,
                  fontWeight: 400,
                  opacity: 0.4 - i * 0.05,
                  fontStyle: 'italic',
                  transform: `translateX(${(i % 2) * 20 - 10}px)`,
                }}
              >
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Center divider line */}
        <div
          style={{
            width: 2,
            background: `linear-gradient(to bottom, transparent, ${SKEDENCE_COLORS.accent}, transparent)`,
            opacity: 0.5,
          }}
        />

        {/* Right side - Clean dashboard */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 40,
          }}
        >
          <div
            style={{
              width: '90%',
              height: '70%',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <Img
              src={staticFile('dashboard-preview.png')}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        </div>
      </div>

      {/* Headlines over split screen */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 5,
          opacity: splitOpacity * splitFadeOut,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 'calc(50% - 50px)',
            transform: 'translate(-50%, -50%)',
            color: '#ff6b35',
            fontSize: 72,
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: '-0.02em',
            opacity: frame >= headline1Delay && frame < (logoStart - 40) ? 1 : 0,
            transition: 'opacity 0.5s',
          }}
        >
          Optimize your business.
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 'calc(50% + 50px)',
            transform: 'translate(-50%, -50%)',
            color: '#ff6b35',
            fontSize: 72,
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: '-0.02em',
            opacity: frame >= headline2Delay && frame < (logoStart - 40) ? 1 : 0,
            transition: 'opacity 0.5s',
          }}
        >
          Optimize your side hustle.
        </div>
      </AbsoluteFill>

      {/* Final branding section */}
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
            }}
          >
            <Img 
              src={staticFile('skedence-logo.png')} 
              style={{ 
                width: 400, 
                height: 'auto',
                objectFit: 'contain',
                filter: 'invert(1) sepia(1) saturate(5) hue-rotate(330deg) brightness(1.1) drop-shadow(0 0 30px rgba(255, 107, 53, 0.8))',
              }} 
            />
          </div>

          {/* Tagline */}
          <div
            style={{
              color: '#ff6b35',
              fontSize: 48,
              fontWeight: 400,
              textAlign: 'center',
              letterSpacing: '-0.02em',
              opacity: frame >= taglineDelay ? 1 : 0,
              transition: 'opacity 0.5s',
            }}
          >
            {frame >= taglineDelay && 'Run it like a business.'}
          </div>
        </div>
      </AbsoluteFill>

      {/* Subtle vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, transparent 50%, rgba(0, 0, 0, 0.4) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
