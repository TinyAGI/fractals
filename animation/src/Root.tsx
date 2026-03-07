import { Composition } from "remotion";
import { FractalsAnimation, sampleTree } from "./FractalsAnimation";

const FPS = 30;
const DURATION_S = 12;

export const RemotionRoot = () => {
  return (
    <Composition
      id="FractalsAnimation"
      component={FractalsAnimation}
      durationInFrames={DURATION_S * FPS}
      fps={FPS}
      width={1280}
      height={720}
      defaultProps={{ tree: sampleTree }}
    />
  );
};
