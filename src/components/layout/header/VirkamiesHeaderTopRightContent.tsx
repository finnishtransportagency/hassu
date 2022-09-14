import React, { FC } from "react";
import ButtonLink from "@components/button/ButtonLink";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { styled } from "@mui/material";

const VirkamiesHeaderTopRightContent: FC<{ mobile?: true }> = ({ mobile }) => {
  const { data: kayttaja } = useCurrentUser();
  const kayttajaNimi = kayttaja && kayttaja.etuNimi && kayttaja.sukuNimi && `${kayttaja.sukuNimi}, ${kayttaja.etuNimi}`;
  const logoutHref = process.env.NEXT_PUBLIC_VAYLA_EXTRANET_URL;

  return (
    <div className="flex flex-wrap items-end justify-between md:justify-end gap-x-5 gap-y-3 py-5 md:py-0 vayla-paragraph">
      <span>{kayttajaNimi}</span>
      {mobile ? (
        <Linkki href={logoutHref}>Poistu Palvelusta</Linkki>
      ) : (
        <ButtonLink href={logoutHref} useNextLink={false} endIcon="external-link-alt">
          Poistu Palvelusta
        </ButtonLink>
      )}
    </div>
  );
};

export const Linkki = styled("a")((props) => ({
  display: "inline-block",
  "&:hover": {
    textDecoration: "underline",
  },
  color: props.theme.palette.primary.dark,
}));

export default VirkamiesHeaderTopRightContent;
