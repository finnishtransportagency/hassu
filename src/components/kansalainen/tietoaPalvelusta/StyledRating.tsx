import * as React from "react";
import { styled } from "@mui/material/styles";
import Rating, { IconContainerProps, RatingProps } from "@mui/material/Rating";
import { Box } from "@mui/material";
import useTranslation from "next-translate/useTranslation";
import { useCallback } from "react";

const ratingElementHeight = "57px";

const StyledRating = styled((props: RatingProps) => {
  const { t } = useTranslation("tietoa-palvelusta/yhteystiedot-ja-palaute");
  const getLabelText: RatingProps["getLabelText"] = useCallback(
    (pistemaara) => t("palautetta-palvelusta.dialogi.minka-arvosanan-antaisit-palvelulle.pistearvio", { pistemaara }),
    [t]
  );
  return <Rating max={MAX_RATING} IconContainerComponent={IconContainer} highlightSelectedOnly getLabelText={getLabelText} {...props} />;
})(({ theme }) => ({
  background: "white",
  ".MuiRating-iconHover.MuiRating-iconActive": {
    transform: "scale(1.1)",
  },
  ".MuiRating-iconFocus.MuiRating-iconActive": {
    transform: "scale(1.1)",
    outline: "none",
  },
  ".MuiRating-labelEmptyValueActive": {
    outlineColor: theme.palette.primary.dark,
    outlineWidth: "1px",
    outlineStyle: "solid",
    outlineOffset: "-1px",
  },
  ".MuiRating-icon": {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: 700,
    marginLeft: "6px",
    marginRight: "6px",
    margin: "6px",
    borderRadius: "50%",
    borderWidth: "1px",
    borderColor: theme.palette.primary.dark,
    width: ratingElementHeight,
    height: ratingElementHeight,
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

function IconContainer(props: IconContainerProps) {
  const { value, ...other } = props;
  return <Box {...other}>{value}</Box>;
}

export default StyledRating;
