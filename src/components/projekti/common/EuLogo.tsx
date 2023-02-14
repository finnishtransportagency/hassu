import React, { ReactElement } from "react";
import { Kieli, ProjektiJulkinen } from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import useTranslation from "next-translate/useTranslation";

interface Props {
  projekti: ProjektiJulkinen;
  kieli: Kieli;
}

export default function EuLogo({ projekti, kieli }: Props): ReactElement {
  const { t } = useTranslation("projekti");
  return (
    <Section noDivider>
      <SectionContent>
        {projekti.euRahoitus && !(kieli === Kieli.RUOTSI && projekti.euRahoitusLogot?.logoSV) && projekti.euRahoitusLogot?.logoFI && (
          <img src={projekti.euRahoitusLogot?.logoFI} width={134} alt={t(`ui-kuvatekstit.eu_aluerahoitus`)} />
        )}
        {projekti.euRahoitus && kieli === Kieli.RUOTSI && projekti.euRahoitusLogot?.logoSV && (
          <img src={projekti.euRahoitusLogot?.logoSV} width={134} alt={t(`ui-kuvatekstit.eu_aluerahoitus`)} />
        )}
      </SectionContent>
    </Section>
  );
}
