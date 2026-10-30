import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

export const titleCardSchema = z.object({
  titleText: z.string(),
  subtitleText: z.string(),
  titleColor: z.string(),
  backgroundColor: z.string(),
  accentColor: z.string(),
});

export const TitleCard: React.FC<z.infer<typeof titleCardSchema>> = ({
  titleText,
  subtitleText,
  titleColor,
  backgroundColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const barWidth = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const subtitleOpacity = interpolate(frame, [25, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        justifyContent: "center",
        padding: 200,
        fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
        opacity: exit,
      }}
    >
      <h1
        style={{
          color: titleColor,
          fontSize: 120,
          fontWeight: 800,
          letterSpacing: "-0.035em",
          margin: 0,
          transform: `translateY(${interpolate(enter, [0, 1], [60, 0])}px)`,
          opacity: enter,
        }}
      >
        {titleText}
      </h1>
      <div
        style={{
          height: 12,
          width: `${barWidth * 40}%`,
          backgroundColor: accentColor,
          borderRadius: 6,
          margin: "40px 0",
        }}
      />
      <p
        style={{
          color: titleColor,
          fontSize: 52,
          margin: 0,
          opacity: subtitleOpacity * 0.75,
        }}
      >
        {subtitleText}
      </p>
    </AbsoluteFill>
  );
};
