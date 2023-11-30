import { styled } from "@mui/material";

export const SideCard = styled("div")(() => ({
  backgroundColor: "#F8F8F8",
}));
export const SideCardHeading = styled("h4")(() => ({
  textAlign: "center",
  paddingTop: "18px",
  paddingBottom: "18px",
  backgroundColor: "#0064AF",
  color: "white",
  fontWeight: "700",
  marginBottom: 0,
}));
export const SideCardContent = styled("div")(({ theme }) => ({
  padding: theme.spacing(10),
}));
