import Section from "@components/layout/Section";
import React from "react";

type Props = {};

export default function LausuntopyyntoonLiitettavaLisaaineisto({}: Props) {
  return (
    <Section>
      <h4 className="vayla-small-title">Lausuntopyyntöön liitettävä lisäaineisto</h4>
      <p>
        Lausuntopyyntöön liitettävää lisäaineistoa ei julkaista palvelun julkisella puolelle. Linkki lausuntopyyntöön
        liitettävään aineistoon muodostuu, kun aineisto on tuotu Velhosta. Linkin takana oleva sisältö muodostuu
        nähtäville asetetuista aineistoista sekä lausuntopyynnön lisäaineistosta.
      </p>
    </Section>
  );
}
