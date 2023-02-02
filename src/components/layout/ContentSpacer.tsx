import { styled, experimental_sx as sx } from "@mui/material";
import isPropValid from "@emotion/is-prop-valid";

export type HassuGaps = 2 | 4 | 7 | 8 | 12 | 27.5;

export type ContentSpacerProps = {
  gap?: HassuGaps;
};

const ContentSpacer = styled("div", { shouldForwardProp: isPropValid })<ContentSpacerProps>(({ gap = 4 }: ContentSpacerProps) =>
  sx({
    "& > *": { marginTop: 0, marginBottom: 0 },
    "& > * + *": {
      marginTop: gap,
    },
  })
);

export default ContentSpacer;
