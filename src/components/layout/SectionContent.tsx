import { styled, experimental_sx as sx } from "@mui/material";

interface Props {
  largeGap?: boolean;
}

const SectionContent = styled("div")((props: Props) =>
  sx({
    "& > *": { margin: 0 },
    "& > * + *": {
      marginTop: props.largeGap ? 7 : 4,
    },
  })
);

export default SectionContent;
