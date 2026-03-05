import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import {
  JOURNEY_DURATION,
  JOURNEY_SCENE1_DURATION,
  JOURNEY_SCENE2_DURATION,
  JOURNEY_SCENE3_DURATION,
  JOURNEY_SCENE4_DURATION,
  JOURNEY_SCENE5_DURATION,
  JOURNEY_SCENE6_DURATION,
  JOURNEY_SCENE7_DURATION,
  JOURNEY_SCENE8_DURATION,
} from '../../../types/constants';
import { Scene1Opening } from './Scene1Opening';
import { Scene2Setup } from './Scene2Setup';
import { Scene3Discovery } from './Scene3Discovery';
import { Scene4Booking } from './Scene4Booking';
import { Scene5Synced } from './Scene5Synced';
import { Scene6Insights } from './Scene6Insights';
import { Scene7Scale } from './Scene7Scale';
import { Scene9Closing } from '../HowItWorks/Scene9Closing';

const { fontFamily } = loadFont();

export const Main: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        fontFamily,
        backgroundColor: '#0f1115',
      }}
    >
      {/* Background music */}
      <Audio 
        src={staticFile('background.mp3')} 
        volume={0.3}
        endAt={JOURNEY_DURATION}
      />

      {/* Scene 1: Opening Hook */}
      <Sequence durationInFrames={JOURNEY_SCENE1_DURATION}>
        <Scene1Opening />
      </Sequence>

      {/* Scene 2: Quick Setup */}
      <Sequence from={JOURNEY_SCENE1_DURATION} durationInFrames={JOURNEY_SCENE2_DURATION}>
        <Scene2Setup />
      </Sequence>

      {/* Scene 3: Athlete Discovery */}
      <Sequence
        from={JOURNEY_SCENE1_DURATION + JOURNEY_SCENE2_DURATION}
        durationInFrames={JOURNEY_SCENE3_DURATION}
      >
        <Scene3Discovery />
      </Sequence>

      {/* Scene 4: The Booking */}
      <Sequence
        from={JOURNEY_SCENE1_DURATION + JOURNEY_SCENE2_DURATION + JOURNEY_SCENE3_DURATION}
        durationInFrames={JOURNEY_SCENE4_DURATION}
      >
        <Scene4Booking />
      </Sequence>

      {/* Scene 5: Staying Synced */}
      <Sequence
        from={
          JOURNEY_SCENE1_DURATION +
          JOURNEY_SCENE2_DURATION +
          JOURNEY_SCENE3_DURATION +
          JOURNEY_SCENE4_DURATION
        }
        durationInFrames={JOURNEY_SCENE5_DURATION}
      >
        <Scene5Synced />
      </Sequence>

      {/* Scene 6: Business Insights */}
      <Sequence
        from={
          JOURNEY_SCENE1_DURATION +
          JOURNEY_SCENE2_DURATION +
          JOURNEY_SCENE3_DURATION +
          JOURNEY_SCENE4_DURATION +
          JOURNEY_SCENE5_DURATION
        }
        durationInFrames={JOURNEY_SCENE6_DURATION}
      >
        <Scene6Insights />
      </Sequence>

      {/* Scene 7: Scale Effortlessly */}
      <Sequence
        from={
          JOURNEY_SCENE1_DURATION +
          JOURNEY_SCENE2_DURATION +
          JOURNEY_SCENE3_DURATION +
          JOURNEY_SCENE4_DURATION +
          JOURNEY_SCENE5_DURATION +
          JOURNEY_SCENE6_DURATION
        }
        durationInFrames={JOURNEY_SCENE7_DURATION}
      >
        <Scene7Scale />
      </Sequence>

      {/* Scene 8: Closing */}
      <Sequence
        from={
          JOURNEY_SCENE1_DURATION +
          JOURNEY_SCENE2_DURATION +
          JOURNEY_SCENE3_DURATION +
          JOURNEY_SCENE4_DURATION +
          JOURNEY_SCENE5_DURATION +
          JOURNEY_SCENE6_DURATION +
          JOURNEY_SCENE7_DURATION
        }
        durationInFrames={JOURNEY_SCENE8_DURATION}
      >
        <Scene9Closing />
      </Sequence>
    </AbsoluteFill>
  );
};
