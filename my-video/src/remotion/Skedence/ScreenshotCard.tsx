import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile } from 'remotion';

interface ScreenshotCardProps {
  src: string;
  startFrame?: number;
  animationDuration?: number;
  scale?: number;
  blur?: boolean;
}

export const ScreenshotCard: React.FC<ScreenshotCardProps> = ({
  src,
  startFrame = 0,
  animationDuration = 30,
  scale = 1,
  blur = false,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  const opacity = interpolate(localFrame, [0, animationDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scaleValue = interpolate(
    localFrame,
    [0, animationDuration],
    [0.9, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      <div
        style={{
          width: '80%',
          height: 'auto',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          transform: `scale(${scaleValue * scale})`,
          filter: blur ? 'blur(2px)' : 'none',
        }}
      >
        <Img
          src={staticFile(src)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        {/* Soft glow effect */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 0 40px rgba(255, 107, 53, 0.3)',
            pointerEvents: 'none',
            borderRadius: 16,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
