import React from "react";
import { styled, experimental_sx as sx } from "@mui/material";

interface Props {
  onClick?: () => void;
  teksti: string;
}

const JataPalautettaNappi = (
  { onClick, ...props }: Props & Omit<React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>, "ref">,
  ref: React.ForwardedRef<HTMLButtonElement>
) => {
  return (
    <>
      <TavallinenNappi
        id="feedback_button"
        {...props}
        ref={ref}
        className="btn btn-primary"
        onClick={onClick}
        style={{ borderRadius: 0, width: "100%", textTransform: "none", paddingTop: "13px", paddingBottom: "13px", fontWeight: "bold" }}
      >
        {props.teksti}
        <img style={{ display: "inline", marginLeft: "1em" }} src="/kysymys-ikoni.svg" alt="kysymysikoni" />
      </TavallinenNappi>
      <LeijuvaNappi
        id="feedback_button_hovering"
        {...props}
        className="btn btn-primary fixed bottom-6 right-6 bg-primary text-white rounded p-4"
        onClick={onClick}
        style={{ borderRadius: "50%", display: "absolute", right: "1em", bottom: "1em" }}
      >
        <img src="/kysymys-ikoni.svg" alt="avaa palautteenantolomake" />
      </LeijuvaNappi>
    </>
  );
};

export const LeijuvaNappi = styled("button")(sx({ display: { xs: "block!important", sm: "none!important" } }));
export const TavallinenNappi = styled("button")(sx({ display: { xs: "none!important", sm: "block!important" } }));

export default React.forwardRef(JataPalautettaNappi);
