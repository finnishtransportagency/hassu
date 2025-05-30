import React from "react";
import { styled, experimental_sx as sx, Fab } from "@mui/material";
import { useSetSnackbarFabAdjust } from "src/hooks/useSetSnackbarFabAdjust";
import { useIsBelowBreakpoint } from "src/hooks/useIsSize";

interface Props {
  onClick?: () => void;
  teksti: string;
}

const JataPalautettaNappi = ({
  onClick,
  color,
  ...props
}: Props & Omit<React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>, "ref">) => {
  const isSmall = useIsBelowBreakpoint("sm");
  useSetSnackbarFabAdjust();

  return !isSmall ? (
    <TavallinenNappi id="feedback_button" {...props} onClick={onClick}>
      {props.teksti}
      <img src="/assets/kysymys-ikoni.svg" alt="kysymysikoni" role="presentation" />
    </TavallinenNappi>
  ) : (
    <LeijuvaNappi disableRipple size="large" id="feedback_button_hovering" onClick={onClick} {...props}>
      <img src="/assets/kysymys-ikoni.svg" alt="avaa palautteenantolomake" role="presentation" />
    </LeijuvaNappi>
  );
};

const LeijuvaNappi = styled(Fab)(
  sx({
    position: "fixed",
    bottom: "1.75rem",
    right: "1.75rem",
    backgroundColor: "#0064AF !important",
    "&.MuiFab-sizeLarge": {
      width: "83px",
      height: "83px",
    },
  })
);

const TavallinenNappi = styled("button")(
  sx({
    color: "#FFFFFF",
    backgroundColor: "#0064AF !important",
    borderRadius: 0,
    width: "100%",
    textTransform: "none",
    paddingTop: "13px",
    paddingBottom: "13px",
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 10,
    "& img": {
      display: "inline",
      marginLeft: "1em",
    },
  })
);

export default JataPalautettaNappi;
