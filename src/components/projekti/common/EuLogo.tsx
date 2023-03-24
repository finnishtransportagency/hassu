import React, { ReactElement } from "react";
import { Kieli, ProjektiJulkinen } from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import useTranslation from "next-translate/useTranslation";
import useKansalaiskieli from "../../../hooks/useKansalaiskieli";

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
    <Section noDivider>
      <SectionContent>
        {kieli === Kieli.SUOMI && projekti.euRahoitusLogot.logoFI && (
          <img src={projekti.euRahoitusLogot?.logoFI} width={134} alt={t(`ui-kuvatekstit.eu_aluerahoitus`)} />
        )}
        {kieli === Kieli.RUOTSI && projekti.euRahoitusLogot.logoSV && (
          <img src={projekti.euRahoitusLogot?.logoSV} width={134} alt={t(`ui-kuvatekstit.eu_aluerahoitus`)} />
        )}
      </SectionContent>
    </Section>
  );
}
