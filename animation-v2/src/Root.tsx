import { Composition } from "remotion";
import { PixelOffice } from "./PixelOffice";
import { FPS, TOTAL_SECONDS, LAYOUT } from "./types";

export const RemotionRoot = () => {
  return (
    <Composition
      id="PixelOffice"
      component={PixelOffice}
      durationInFrames={TOTAL_SECONDS * FPS}
      fps={FPS}
      width={LAYOUT.W}
      height={LAYOUT.H}
      defaultProps={{}}
    />
  );
};
