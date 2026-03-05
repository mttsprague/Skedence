import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import {
  HIW_SCENE1_DURATION,
  HIW_SCENE2_DURATION,
  HIW_SCENE3_DURATION,
  HIW_SCENE4_DURATION,
  HIW_SCENE5_DURATION,
  HIW_SCENE6_DURATION,
  HIW_SCENE7_DURATION,
  HIW_SCENE8_DURATION,
  HIW_SCENE9_DURATION,
} from '../../../types/constants';
import { Scene1Problem } from './Scene1Problem';
import { Scene2RunBusiness } from './Scene2RunBusiness';
import { Scene3Packages } from './Scene3Packages';
import { Scene4Revenue } from './Scene4Revenue';
import { Scene5_TrainerApps } from './Scene5_TrainerApps';
import { Scene6_ClientApp } from './Scene6_ClientApp';
import { Scene7AutoUpdates } from './Scene7AutoUpdates';
import { Scene8FullSystem } from './Scene8FullSystem';
import { Scene9Closing } from './Scene9Closing';

const { fontFamily } = loadFont();

export const Main: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        fontFamily,
        backgroundColor: '#0f1115',
      }}
    >
      {/* Scene 1: The Problem */}
      <Sequence durationInFrames={HIW_SCENE1_DURATION}>
        <Scene1Problem />
      </Sequence>

      {/* Scene 2: Run Your Training Business */}
      <Sequence from={HIW_SCENE1_DURATION} durationInFrames={HIW_SCENE2_DURATION}>
        <Scene2RunBusiness />
      </Sequence>

      {/* Scene 3: Lesson Packages */}
      <Sequence
        from={HIW_SCENE1_DURATION + HIW_SCENE2_DURATION}
        durationInFrames={HIW_SCENE3_DURATION}
      >
        <Scene3Packages />
      </Sequence>

      {/* Scene 4: Track Revenue */}
      <Sequence
        from={HIW_SCENE1_DURATION + HIW_SCENE2_DURATION + HIW_SCENE3_DURATION}
        durationInFrames={HIW_SCENE4_DURATION}
      >
        <Scene4Revenue />
      </Sequence>

      {/* Scene 5: Trainer Apps */}
      <Sequence
        from={
          HIW_SCENE1_DURATION +
          HIW_SCENE2_DURATION +
          HIW_SCENE3_DURATION +
          HIW_SCENE4_DURATION
        }
        durationInFrames={HIW_SCENE5_DURATION}
      >
        <Scene5_TrainerApps />
      </Sequence>

      {/* Scene 6: Client App */}
      <Sequence
        from={
          HIW_SCENE1_DURATION +
          HIW_SCENE2_DURATION +
          HIW_SCENE3_DURATION +
          HIW_SCENE4_DURATION +
          HIW_SCENE5_DURATION
        }
        durationInFrames={HIW_SCENE6_DURATION}
      >
        <Scene6_ClientApp />
      </Sequence>

      {/* Scene 7: Everything Updates Automatically */}
      <Sequence
        from={
          HIW_SCENE1_DURATION +
          HIW_SCENE2_DURATION +
          HIW_SCENE3_DURATION +
          HIW_SCENE4_DURATION +
          HIW_SCENE5_DURATION +
          HIW_SCENE6_DURATION
        }
        durationInFrames={HIW_SCENE7_DURATION}
      >
        <Scene7AutoUpdates />
      </Sequence>

      {/* Scene 8: The Full System */}
      <Sequence
        from={
          HIW_SCENE1_DURATION +
          HIW_SCENE2_DURATION +
          HIW_SCENE3_DURATION +
          HIW_SCENE4_DURATION +
          HIW_SCENE5_DURATION +
          HIW_SCENE6_DURATION +
          HIW_SCENE7_DURATION
        }
        durationInFrames={HIW_SCENE8_DURATION}
      >
        <Scene8FullSystem />
      </Sequence>

      {/* Scene 9: Closing */}
      <Sequence
        from={
          HIW_SCENE1_DURATION +
          HIW_SCENE2_DURATION +
          HIW_SCENE3_DURATION +
          HIW_SCENE4_DURATION +
          HIW_SCENE5_DURATION +
          HIW_SCENE6_DURATION +
          HIW_SCENE7_DURATION +
          HIW_SCENE8_DURATION
        }
        durationInFrames={HIW_SCENE9_DURATION}
      >
        <Scene9Closing />
      </Sequence>
    </AbsoluteFill>
  );
};
