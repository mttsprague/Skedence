import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';

interface MobileFrameProps {
  src: string;
  startFrame: number;
  animationDuration: number;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  src,
  startFrame,
  animationDuration,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  // Scale animation
  const scale = interpolate(localFrame, [0, animationDuration], [0.95, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Opacity animation
  const opacity = interpolate(localFrame, [0, animationDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        transform: `scale(${scale * 0.9})`,
        opacity,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 480,
          height: 1040,
          borderRadius: 50,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '10px solid #1a1a1a',
          background: '#000',
        }}
      >
        {/* Phone screen notch */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 148,
            height: 37,
            background: '#1a1a1a',
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
            zIndex: 10,
          }}
        />

        {/* Screenshot */}
        <Img
          src={staticFile(src)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  );
};
