import Section from "@components/layout/Section";
import React from "react";

type Props = {};

export default function MuistutustenAntaminen({}: Props) {
  return (
    <Section>
      <h4 className="vayla-small-title">Kuulutus ja julkaisupäivä</h4>
      <p>
        Kirjoita nähtäville asettamisen kuulutusta varten tiivistetty sisällönkuvaus hankkeesta. Kuvauksen on hyvä
        sisältää esimerkiksi tieto suunnittelukohteen alueellista rajauksesta (maantiealue ja vaikutusalue),
        suunnittelun tavoitteet, vaikutukset ja toimenpiteet pääpiirteittäin karkealla tasolla. Älä lisää tekstiin
        linkkejä.
      </p>
    </Section>
  );
}
