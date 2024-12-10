import { styled } from "@mui/system";

export const DashedList = styled("ul")(({ theme }) => ({
  listStylePosition: "inside",
  marginLeft: theme.spacing(4),
  "& > li": {
    "&:before": {
      content: "''",
      paddingLeft: theme.spacing(1),
    },
    "&::marker": {
      content: "'-'",
    },
    "& > p,a": {
      marginBottom: "0px",
    },
    "&:not(:last-child)": {
      marginBottom: theme.spacing(1),
    },
  },
}));
