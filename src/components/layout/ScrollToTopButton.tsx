import isPropValid from "@emotion/is-prop-valid";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { styled } from "@mui/system";
import throttle from "lodash/throttle";
import useTranslation from "next-translate/useTranslation";
import React, { FunctionComponent, useEffect, useState, ComponentProps } from "react";
import { animateScroll as scroll } from "react-scroll";
import { focusStyleSecondary } from "./HassuMuiThemeProvider";

const SCROLL_OFFSET = 200;
const ScrollToTopButton: FunctionComponent = () => {
  const [toTopEnabled, setToTopEnabled] = useState(false);

  useEffect(() => {
    const handleScroll = throttle(() => {
      setToTopEnabled(window.pageYOffset > SCROLL_OFFSET);
    }, 300);

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <StyledButton
      onClick={() => {
        scroll.scrollToTop({
          duration: 900,
          smooth: "easeInOutQuint",
        });
      }}
      hide={!toTopEnabled}
    />
  );
};

const StyledButton = styled(
  ({ ...props }: ComponentProps<"button"> & { hide: boolean }) => {
    const { t } = useTranslation("common");
    return (
      <button id="to-top-button" aria-label={t("takaisin_sivun_alkuun")} {...props}>
        <FontAwesomeIcon icon="chevron-up" size="lg" />
      </button>
    );
  },
  { shouldForwardProp: isPropValid }
)(({ theme, hide }) => ({
  backgroundColor: "#0064af",
  position: "fixed",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  bottom: theme.spacing(6),
  right: theme.spacing(6),
  color: "#ffffff",
  borderRadius: "4px",
  width: theme.spacing(13.5),
  height: theme.spacing(12.5),
  visibility: "hidden",
  [theme.breakpoints.up("sm")]: {
    visibility: hide ? "hidden" : "visible",
  },
  "&:focus": focusStyleSecondary,
}));

export default ScrollToTopButton;
