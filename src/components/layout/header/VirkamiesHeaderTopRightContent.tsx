import React, { FunctionComponent } from "react";
import ButtonLink from "@components/button/ButtonLink";
import useCurrentUser from "../../../hooks/useCurrentUser";
import StyledLink from "@components/StyledLink";

const VirkamiesHeaderTopRightContent: FunctionComponent<{ mobile?: true }> = ({ mobile }) => {
  const { data: kayttaja } = useCurrentUser();
  const kayttajaNimi = kayttaja && kayttaja.etunimi && kayttaja.sukunimi && `${kayttaja.sukunimi}, ${kayttaja.etunimi}`;
  const logoutHref = process.env.NEXT_PUBLIC_VAYLA_EXTRANET_URL;

  return (
    <div className="flex flex-wrap items-center justify-between md:justify-end gap-x-5 gap-y-3 py-5 md:py-0 vayla-paragraph">
      <span>{kayttajaNimi}</span>
      {mobile ? (
        <StyledLink href={logoutHref} useNextLink={false}>
          Poistu Palvelusta
        </StyledLink>
      ) : (
        <ButtonLink href={logoutHref} useNextLink={false} endIcon="external-link-alt">
          Poistu Palvelusta
        </ButtonLink>
      )}
    </div>
  );
};

export default VirkamiesHeaderTopRightContent;
