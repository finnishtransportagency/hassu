import { styled } from "@mui/material";
import isPropValid from "@emotion/is-prop-valid";

export type HassuGaps = 0 | 2 | 4 | 6 | 7 | 8 | 10 | 12 | 27.5;

export type ContentSpacerProps = {
  gap?: HassuGaps;
};

const ContentSpacer = styled("div", { shouldForwardProp: isPropValid })<ContentSpacerProps>(
  ({ gap = 4 }: ContentSpacerProps) =>
    ({ theme }) => ({
      "& > *": { marginTop: 0, marginBottom: 0 },
      "& > * + *": {
        marginTop: `${theme.spacing(gap)} !important`,
      },
    })
);

export default ContentSpacer;
