import { styled } from "@mui/system";

export const EmailLink = styled("a")({
  fontWeight: 700,
  ["&:hover"]: {
    textDecoration: "underline",
  },
});

export default EmailLink;
