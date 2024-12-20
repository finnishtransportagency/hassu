import { styled } from "@mui/system";

export const DottedList = styled("ul")({
  listStyleType: "disc",
  li: {
    paddingLeft: "1rem",
    "&:not(:last-child)": {
      marginBottom: "1rem",
    },
    "&::marker": {
      content: "'•'",
      textAlign: "left",
      fontSize: "1.125rem",
    },
  },
});
