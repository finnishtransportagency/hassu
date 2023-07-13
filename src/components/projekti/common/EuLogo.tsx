import React, { ReactElement } from "react";
import { Kieli, ProjektiJulkinen } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import useKansalaiskieli from "../../../hooks/useKansalaiskieli";
import { experimental_sx as sx, styled } from "@mui/system";

interface Props {
  projekti?: ProjektiJulkinen | null;
}

export default function EuLogo({ projekti }: Props): ReactElement {
  const { t } = useTranslation("projekti");
  const kieli = useKansalaiskieli();
  if (!projekti?.euRahoitus || !projekti.euRahoitusLogot) {
    return <></>;
  }
  return (
    <>
      {kieli === Kieli.SUOMI && projekti.euRahoitusLogot.logoFI && (
        <Img src={projekti.euRahoitusLogot?.logoFI} width={134} alt={t(`ui-kuvatekstit.eu_aluerahoitus`)} />
      )}
      {kieli === Kieli.RUOTSI && projekti.euRahoitusLogot.logoSV && (
        <Img src={projekti.euRahoitusLogot?.logoSV} width={134} alt={t(`ui-kuvatekstit.eu_aluerahoitus`)} />
      )}
    </>
  );
}

const Img = styled("img")(sx({ marginTop: 12 }));
