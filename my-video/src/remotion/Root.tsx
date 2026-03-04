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
} from "../../types/constants";
import { Main } from "./MyComp/Main";
import { NextLogo } from "./MyComp/NextLogo";
import { SkedenceMain } from "./Skedence/Main";
import { VolleyballMain } from "./Volleyball/Main";

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
    </>
  );
};
