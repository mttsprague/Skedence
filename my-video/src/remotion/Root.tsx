import { Composition } from "remotion";
import {
  COMP_NAME,
  defaultMyCompProps,
  DURATION_IN_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  SKEDENCE_COMP_NAME,
  SKEDENCE_DURATION,
  SKEDENCE_FPS,
  SKEDENCE_WIDTH,
  SKEDENCE_HEIGHT,
  VOLLEYBALL_COMP_NAME,
  VOLLEYBALL_DURATION,
  VOLLEYBALL_FPS,
  VOLLEYBALL_WIDTH,
  VOLLEYBALL_HEIGHT,
  HOWITWORKS_COMP_NAME,
  HOWITWORKS_DURATION,
  HOWITWORKS_FPS,
  HOWITWORKS_WIDTH,
  HOWITWORKS_HEIGHT,
  JOURNEY_COMP_NAME,
  JOURNEY_DURATION,
  JOURNEY_FPS,
  JOURNEY_WIDTH,
  JOURNEY_HEIGHT,
  BASKETBALL_COMP_NAME,
  BASKETBALL_DURATION,
  BASKETBALL_FPS,
  BASKETBALL_WIDTH,
  BASKETBALL_HEIGHT,
  SOCCER_COMP_NAME,
  SOCCER_DURATION,
  SOCCER_FPS,
  SOCCER_WIDTH,
  SOCCER_HEIGHT,
  BASEBALL_COMP_NAME,
  BASEBALL_DURATION,
  BASEBALL_FPS,
  BASEBALL_WIDTH,
  BASEBALL_HEIGHT,
} from "../../types/constants";
import { Main } from "./MyComp/Main";
import { NextLogo } from "./MyComp/NextLogo";
import { SkedenceMain } from "./Skedence/Main";
import { VolleyballMain } from "./Volleyball/Main";
import { Main as HowItWorksMain } from "./HowItWorks/Main";
import { Main as JourneyMain } from "./TheJourney/Main";
import { BasketballMain } from "./Basketball/Main";
import { SoccerMain } from "./Soccer/Main";
import { BaseballMain } from "./Baseball/Main";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id={COMP_NAME}
        component={Main}
        durationInFrames={DURATION_IN_FRAMES}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultMyCompProps}
      />
      <Composition
        id="NextLogo"
        component={NextLogo}
        durationInFrames={300}
        fps={30}
        width={140}
        height={140}
        defaultProps={{
          outProgress: 0,
        }}
      />
      <Composition
        id={SKEDENCE_COMP_NAME}
        component={SkedenceMain}
        durationInFrames={SKEDENCE_DURATION}
        fps={SKEDENCE_FPS}
        width={SKEDENCE_WIDTH}
        height={SKEDENCE_HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id={VOLLEYBALL_COMP_NAME}
        component={VolleyballMain}
        durationInFrames={VOLLEYBALL_DURATION}
        fps={VOLLEYBALL_FPS}
        width={VOLLEYBALL_WIDTH}
        height={VOLLEYBALL_HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id={HOWITWORKS_COMP_NAME}
        component={HowItWorksMain}
        durationInFrames={HOWITWORKS_DURATION}
        fps={HOWITWORKS_FPS}
        width={HOWITWORKS_WIDTH}
        height={HOWITWORKS_HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id={JOURNEY_COMP_NAME}
        component={JourneyMain}
        durationInFrames={JOURNEY_DURATION}
        fps={JOURNEY_FPS}
        width={JOURNEY_WIDTH}
        height={JOURNEY_HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id={BASKETBALL_COMP_NAME}
        component={BasketballMain}
        durationInFrames={BASKETBALL_DURATION}
        fps={BASKETBALL_FPS}
        width={BASKETBALL_WIDTH}
        height={BASKETBALL_HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id={SOCCER_COMP_NAME}
        component={SoccerMain}
        durationInFrames={SOCCER_DURATION}
        fps={SOCCER_FPS}
        width={SOCCER_WIDTH}
        height={SOCCER_HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id={BASEBALL_COMP_NAME}
        component={BaseballMain}
        durationInFrames={BASEBALL_DURATION}
        fps={BASEBALL_FPS}
        width={BASEBALL_WIDTH}
        height={BASEBALL_HEIGHT}
        defaultProps={{}}
      />
    </>
  );
};
