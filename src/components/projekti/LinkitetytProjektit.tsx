import React, { ReactElement } from "react";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { LinkitettyVelhoProjekti, Projekti } from "@services/api";
import ExtLink from "@components/ExtLink";
import useTranslation from "next-translate/useTranslation";
import { Translate } from "next-translate";

interface Props {
  projekti?: Projekti | null;
}

export default function LinkitetytProjektit({ projekti }: Props): ReactElement {
  const linkitetytProjektit = projekti?.velho?.linkitetytProjektit;
  const { t } = useTranslation("projekti");

  return (
    <Section smallGaps>
      <h3 className="vayla-subtitle">Projektiin liittyvät suunnitelmat</h3>
      {!linkitetytProjektit && (
        <SectionContent>
          <p>Projektiin ei ole liitetty muita suunnitelmia. Voit liittää projektiin suunnitelmia Projektivelhossa.</p>
        </SectionContent>
      )}
      {linkitetytProjektit && (
        <SectionContent>
          <p>
            Projektiin liittyy alla olevat muut suunnitelmat. Voit muokata tai lisätä projektiin liittyviä suunnitelmia Projektivelhossa.
          </p>
          {getExtLinks(linkitetytProjektit, t)}
        </SectionContent>
      )}
    </Section>
  );
}

function getExtLinks(linkitetytProjektit: LinkitettyVelhoProjekti[], t: Translate) {
  const velhoBaseURL = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-";
  return linkitetytProjektit.map((projekti) => (
    <p key={projekti.oid}>
      <ExtLink href={velhoBaseURL + projekti.oid}>
        {projekti.nimi} ({t(`projekti-tyyppi.${projekti.tyyppi}`)})
      </ExtLink>
    </p>
  ));
}
