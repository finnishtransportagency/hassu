import { experimental_sx as sx, styled } from "@mui/material";
import Section from "./Section";

export const SearchSection = styled(Section)(
  sx({
    backgroundColor: "#F7F7F7",
    borderBottom: "5px solid #0063AF",
    padding: 7,
    paddingBottom: 8,
    marginBottom: "1.5rem",
  })
);

export default SearchSection;
