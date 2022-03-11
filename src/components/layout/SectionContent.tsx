import { styled, experimental_sx as sx } from "@mui/material";
import isPropValid from "@emotion/is-prop-valid";

interface Props {
  largeGap?: boolean;
}

const SectionContent = styled("div", { shouldForwardProp: isPropValid })((props: Props) =>
  sx({
    "& > *": { margin: 0 },
    "& > * + *": {
      marginTop: props.largeGap ? 7 : 4,
    },
  })
);

export default SectionContent;
