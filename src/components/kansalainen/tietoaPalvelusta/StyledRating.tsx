import * as React from "react";
import { styled } from "@mui/material/styles";
import Rating, { IconContainerProps, RatingProps } from "@mui/material/Rating";
import { Box } from "@mui/material";
import useTranslation from "next-translate/useTranslation";
import { useCallback } from "react";

const StyledRating = styled((props: RatingProps) => {
  const { t } = useTranslation("tietoa-palvelusta/yhteystiedot-ja-palaute");
  const getLabelText: RatingProps["getLabelText"] = useCallback(
    (pistemaara) => t("palautetta-palvelusta.dialogi.minka-arvosanan-antaisit-palvelulle.pistearvio", { pistemaara }),
    [t]
  );
  return <Rating max={MAX_RATING} IconContainerComponent={IconConst} highlightSelectedOnly getLabelText={getLabelText} {...props} />;
})(({ theme }) => ({
  marginLeft: "-6px !important",
  background: "white",
  ".MuiRating-iconHover.MuiRating-iconActive": {
    transform: "scale(1.1)",
  },
  ".MuiRating-icon": {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: 700,
    marginLeft: "6px",
    marginRight: "6px",
    borderRadius: "50%",
    borderWidth: "1px",
    borderColor: theme.palette.primary.dark,
    width: "57px",
    height: "57px",
  },
  ".MuiRating-iconFilled": {
    backgroundColor: theme.palette.primary.dark,
    color: "#FFFFFF",
  },
  ".MuiRating-iconEmpty": {
    backgroundColor: "#FFFFFF",
    color: theme.palette.primary.dark,
  },
}));

const MAX_RATING = 10;

function IconConst(props: IconContainerProps) {
  const { value, ...other } = props;
  return <Box {...other}>{value}</Box>;
}

export default StyledRating;
