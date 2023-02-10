import * as React from "react";
import { styled } from "@mui/material/styles";
import Rating, { IconContainerProps, RatingProps } from "@mui/material/Rating";
import { Box, Slider, SliderProps, useMediaQuery, useTheme } from "@mui/material";
import useTranslation from "next-translate/useTranslation";
import { useCallback } from "react";

const MAX_RATING = 10;
const ratingElementHeight = "57px";

type ResponsiveRatingProps = { value: number; onChange: (value: number) => void };
type DesktopRatingProps = ResponsiveRatingProps & Omit<RatingProps, "value" | "onChange">;
type MobileRatingProps = ResponsiveRatingProps & Omit<SliderProps, "value" | "onChange">;

const DesktopRating = styled(({ onChange: onChangeProp, ...props }: DesktopRatingProps) => {
  const { t } = useTranslation("tietoa-palvelusta/palautetta-palvelusta-dialog");
  const getLabelText: RatingProps["getLabelText"] = useCallback(
    (pistemaara) => t("minka-arvosanan-antaisit-palvelulle.pistearvio", { pistemaara }),
    [t]
  );

  const onChange = useCallback(
    (_event: React.SyntheticEvent<Element, Event>, value: number | null) => {
      if (typeof value === "number") {
        onChangeProp(value);
      } else {
        onChangeProp(0);
      }
    },
    [onChangeProp]
  );

  return (
    <Rating
      max={MAX_RATING}
      IconContainerComponent={IconContainer}
      highlightSelectedOnly
      getLabelText={getLabelText}
      onChange={onChange}
      {...props}
    />
  );
})(({ theme }) => ({
  background: "white",
  userSelect: "none",
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

const MobileRating = styled(({ onChange: onChangeProp, ...props }: MobileRatingProps) => {
  const onChange = useCallback(
    (_event: Event, value: number | number[]) => {
      if (typeof value === "number") {
        onChangeProp(value);
      }
    },
    [onChangeProp]
  );
  return <Slider step={1} max={MAX_RATING} onChange={onChange} {...props} />;
})(({ theme }) => ({
  color: theme.palette.primary.dark,
  height: 3,
  padding: "13px 0",
  "& .MuiSlider-thumb": {
    height: 27,
    width: 27,
    color: "current-color",
    "&:hover": {
      boxShadow: "0 0 0 8px rgba(0, 153, 255, 0.08)",
    },
  },
  "& .MuiSlider-thumb.Mui-active": {
    boxShadow: "0 0 0 14px rgba(0, 153, 255, 0.08)",
  },
  "& .MuiSlider-rail": {
    color: "#d8d8d8",
  },
}));

export const ResponsiveRating = styled((props: ResponsiveRatingProps) => {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("lg"));

  if (desktop) {
    return <DesktopRating {...props} />;
  } else {
    return (
      <Box
        sx={{
          marginLeft: 7,
          marginRight: 7,
          "& p": {
            textAlign: "center",
          },
        }}
      >
        <MobileRating {...props} />
        <p>{props.value}</p>
      </Box>
    );
  }
})(() => ({}));

function IconContainer(props: IconContainerProps) {
  const { value, ...other } = props;
  return <Box {...other}>{value}</Box>;
}
