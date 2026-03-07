import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import {
  SC_SCENE1_DURATION,
  SC_SCENE2_DURATION,
  SC_SCENE3_DURATION,
  SC_SCENE4_DURATION,
  SC_SCENE5_DURATION,
  SOCCER_DURATION,
} from '../../../types/constants';
import { Scene1Hook } from './Scene1Hook';
import { Scene2Reality } from './Scene2Reality';
import { Scene3System } from './Scene3System';
import { Scene4Math } from './Scene4Math';
import { Scene5Close } from './Scene5Close';

export const SoccerMain: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        fontFamily: 'Inter',
      }}
    >
      {/* Background music */}
      <Audio src={staticFile('background.mp3')} volume={0.3} endAt={SOCCER_DURATION} />

      {/* Scene 1: Hook - "You need an operating system" */}
      <Sequence durationInFrames={SC_SCENE1_DURATION}>
        <Scene1Hook />
      </Sequence>

      {/* Scene 2: Reality - Message chaos & scale problem */}
      <Sequence from={SC_SCENE1_DURATION} durationInFrames={SC_SCENE2_DURATION}>
        <Scene2Reality />
      </Sequence>

      {/* Scene 3: System - 4-shot platform demo */}
      <Sequence
        from={SC_SCENE1_DURATION + SC_SCENE2_DURATION}
        durationInFrames={SC_SCENE3_DURATION}
      >
        <Scene3System />
      </Sequence>

      {/* Scene 4: Math - Revenue calculation & identity shift */}
      <Sequence
        from={SC_SCENE1_DURATION + SC_SCENE2_DURATION + SC_SCENE3_DURATION}
        durationInFrames={SC_SCENE4_DURATION}
      >
        <Scene4Math />
      </Sequence>

      {/* Scene 5: Close - Logo & tagline */}
      <Sequence
        from={
          SC_SCENE1_DURATION +
          SC_SCENE2_DURATION +
          SC_SCENE3_DURATION +
          SC_SCENE4_DURATION
        }
        durationInFrames={SC_SCENE5_DURATION}
      >
        <Scene5Close />
      </Sequence>
    </AbsoluteFill>
  );
};
