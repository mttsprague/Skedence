import React from 'react';
import { fontFamily, loadFont } from '@remotion/google-fonts/Inter';
import { AbsoluteFill, Sequence, Audio, staticFile } from 'remotion';
import {
  ACT1_DURATION,
  ACT2_DURATION,
  ACT3_DURATION,
  ACT4_DURATION,
  SKEDENCE_DURATION,
} from '../../../types/constants';
import { Act1Problem } from './Act1Problem';
import { Act2Shift } from './Act2Shift';
import { Act3Power } from './Act3Power';
import { Act4Identity } from './Act4Identity';

// Load Inter font with multiple weights
loadFont('normal', {
  subsets: ['latin'],
  weights: ['400', '500', '600', '700', '800'],
});

export const SkedenceMain: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        fontFamily,
        backgroundColor: '#0f1115',
      }}
    >
      {/* Background music - trimmed to video length */}
      <Audio 
        src={staticFile('background.mp3')} 
        volume={0.3}
        endAt={SKEDENCE_DURATION}
      />

      {/* Act 1 - The Problem */}
      <Sequence name="Act 1: Problem" durationInFrames={ACT1_DURATION}>
        <Act1Problem />
      </Sequence>

      {/* Act 2 - The Shift */}
      <Sequence
        name="Act 2: Shift"
        from={ACT1_DURATION}
        durationInFrames={ACT2_DURATION}
      >
        <Act2Shift />
      </Sequence>

      {/* Act 3 - The Power */}
      <Sequence
        name="Act 3: Power"
        from={ACT1_DURATION + ACT2_DURATION}
        durationInFrames={ACT3_DURATION}
      >
        <Act3Power />
      </Sequence>

      {/* Act 4 - The Identity Shift */}
      <Sequence
        name="Act 4: Identity"
        from={ACT1_DURATION + ACT2_DURATION + ACT3_DURATION}
        durationInFrames={ACT4_DURATION}
      >
        <Act4Identity />
      </Sequence>
    </AbsoluteFill>
  );
};
