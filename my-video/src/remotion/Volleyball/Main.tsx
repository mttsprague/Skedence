import React from 'react';
import { fontFamily, loadFont } from '@remotion/google-fonts/Inter';
import { AbsoluteFill, Sequence } from 'remotion';
import {
  VB_SCENE1_DURATION,
  VB_SCENE2_DURATION,
  VB_SCENE3_DURATION,
  VB_SCENE4_DURATION,
  VB_SCENE5_DURATION,
} from '../../../types/constants';
import { Scene1Hook } from './Scene1Hook';
import { Scene2Situation } from './Scene2Situation';
import { Scene3System } from './Scene3System';
import { Scene4Revenue } from './Scene4Revenue';
import { Scene5Close } from './Scene5Close';

// Load Inter font with multiple weights
loadFont('normal', {
  subsets: ['latin'],
  weights: ['400', '500', '600', '700', '800'],
});

export const VolleyballMain: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        fontFamily,
        backgroundColor: '#0f1115',
      }}
    >
      {/* Scene 1: Direct Hook (0-5s) */}
      <Sequence name="Scene 1: Hook" durationInFrames={VB_SCENE1_DURATION}>
        <Scene1Hook />
      </Sequence>

      {/* Scene 2: Real Situation (5-15s) */}
      <Sequence
        name="Scene 2: Situation"
        from={VB_SCENE1_DURATION}
        durationInFrames={VB_SCENE2_DURATION}
      >
        <Scene2Situation />
      </Sequence>

      {/* Scene 3: The System (15-35s) */}
      <Sequence
        name="Scene 3: System"
        from={VB_SCENE1_DURATION + VB_SCENE2_DURATION}
        durationInFrames={VB_SCENE3_DURATION}
      >
        <Scene3System />
      </Sequence>

      {/* Scene 4: Revenue Reality (35-50s) */}
      <Sequence
        name="Scene 4: Revenue"
        from={VB_SCENE1_DURATION + VB_SCENE2_DURATION + VB_SCENE3_DURATION}
        durationInFrames={VB_SCENE4_DURATION}
      >
        <Scene4Revenue />
      </Sequence>

      {/* Scene 5: Close (50-60s) */}
      <Sequence
        name="Scene 5: Close"
        from={
          VB_SCENE1_DURATION +
          VB_SCENE2_DURATION +
          VB_SCENE3_DURATION +
          VB_SCENE4_DURATION
        }
        durationInFrames={VB_SCENE5_DURATION}
      >
        <Scene5Close />
      </Sequence>
    </AbsoluteFill>
  );
};
