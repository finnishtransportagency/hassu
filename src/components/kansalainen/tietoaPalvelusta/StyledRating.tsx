import * as React from "react";
import { styled } from "@mui/material/styles";
import Rating, { IconContainerProps, RatingProps } from "@mui/material/Rating";
import { Box, Slider, SliderProps, useMediaQuery, useTheme } from "@mui/material";
import useTranslation from "next-translate/useTranslation";
import { useCallback, useEffect, useState } from "react";
import { keyframes } from "@mui/system";

const MAX_RATING = 10;
const ratingElementHeight = "57px";

type ResponsiveRatingProps = { value: number; onChange: (value: number) => void };
type DesktopRatingProps = ResponsiveRatingProps & Omit<RatingProps, "value" | "onChange">;
type MobileRatingProps = ResponsiveRatingProps & Omit<SliderProps, "value" | "onChange">;

const DesktopRating = styled(({ onChange: onChangeProp, ...props }: DesktopRatingProps) => {
  const { t } = useTranslation("tietoa-palvelusta/palautetta-palvelusta-dialog");
  const getLabelText: NonNullable<RatingProps["getLabelText"]> = useCallback(
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

const slide = keyframes`
  0% {
    transform: translate(-50%, -50%);
  }
  50% {
    transform: translate(700%, -50%);
  }
  100% {
    transform: translate(-50%, -50%);
  }
`;

const expand = keyframes`
  0% {
    left: 0;
    width: 0;
  }
  50% {
    left: 0;
    width: 12em
  }
  100% {
    left: 0;
    width: 0;
  }
`;

const MobileRating = styled(
  ({
    onChange: onChangeProp,
    animationValue,
    hasAnimated,
    ...props
  }: MobileRatingProps & { animationValue: number; hasAnimated: boolean }) => {
    const onChange = useCallback(
      (_event: Event, value: number | number[]) => {
        if (typeof value === "number") {
          onChangeProp(value);
        }
      },
      [onChangeProp]
    );
    return <Slider step={1} max={MAX_RATING} onChange={onChange} {...props} />;
  }
)(({ theme, value, animationValue, hasAnimated }) => ({
  color: theme.palette.primary.dark,
  height: 3,
  padding: "13px 0",
  "& .MuiSlider-thumb": {
    height: 27,
    width: 27,
    animation: !hasAnimated && !value && `${slide} 1000ms ease-in-out`, // Pelkkä "!hasAnimated" riittäisi ehdoksi, mutta tuplavarmistu parempi tulevaisuuden kannalta
    color: "current-color",
    boxShadow: !value && value !== animationValue && "0 0 0 14px rgba(0, 153, 255, 0.08)", // Näytetään "halo" sliderille animaation ajan
    "&:hover": {
      boxShadow: "0 0 0 8px rgba(0, 153, 255, 0.08)",
    },
  },
  "& .MuiSlider-track": {
    animation: !hasAnimated && !value && `${expand} 1000ms ease-in-out`, // Pelkkä "!hasAnimated" riittäisi ehdoksi, mutta tuplavarmistu parempi tulevaisuuden kannalta
  },
  "& .MuiSlider-thumb.Mui-active": {
    boxShadow: "0 0 0 14px rgba(0, 153, 255, 0.08)",
  },
  "& .MuiSlider-rail": {
    color: "#d8d8d8",
  },
}));

function recursiveTimeout(setter: (value: number) => void, value: number, direction: number, endSetter: () => void) {
  let nextDirection = direction;
  if ((direction === 1 && value < 8) || (direction === -1 && value > 0)) {
    setter(value + direction);
  } else if (value === 8) {
    nextDirection = -1;
  } else if (value === 0) {
    return endSetter();
  }
  setTimeout(() => {
    recursiveTimeout(setter, value + direction, nextDirection, endSetter);
  }, 50);
}

export const ResponsiveRating = styled((props: ResponsiveRatingProps) => {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("lg"));
  const [animationValue, setAnimationValue] = useState(0); //Arvo, joka näytetään Sliderille animaation ajan.
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!hasAnimated && !props.value) {
      recursiveTimeout(setAnimationValue, 0, 1, () => setHasAnimated(true));
      /**
       * Tässä useEffectissä kutsutaan funktiota, joka asettaa animaation aikana näytettävän
       * arvon 0, 1, ...8, 7, ...0 tasaisin välein.
       * Toivotaan sormet ristissä, että käyttäjä tämä komponentti ei häviä DOMista
       * ennen kuin setteri on vikan kerran ajettu.
       */
    }
  }, [hasAnimated, setAnimationValue, setHasAnimated, props.value]);

  useEffect(() => {
    if (props.value) {
      setHasAnimated(true);
      /**
       * HasAnimatedResetoituu jos palautelomakkeen sulkee, mutta props.value ei reseoitu.
       * Silloin ei kuitenkaan haluta animoida enää, jos käyttäjä selvästi on antanut jo jonkin arvosanan.
       * Tällä estetään olennaisesti ottaen se, että jos käyttäjä itse slaidaa arvosanan nollaksi, niin animaatio ei toistu.
       */
    }
  }, [props.value, setHasAnimated]);

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
        <MobileRating animationValue={animationValue} hasAnimated={hasAnimated} {...props} />
        <p>{animationValue || props.value}</p>
        {/* Näytetään animationValue animaation ajan. Animaation ajan se on muuta kuin nolla.*/}
      </Box>
    );
  }
})(() => ({}));

function IconContainer(props: IconContainerProps) {
  const { value, ...other } = props;
  return <Box {...other}>{value}</Box>;
}
