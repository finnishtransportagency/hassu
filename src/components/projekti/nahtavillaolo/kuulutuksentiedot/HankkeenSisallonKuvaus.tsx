import Section from "@components/layout/Section";
import React from "react";

type Props = {};

export default function HankkeenSisallonKuvaus({}: Props) {
  return (
    <Section>
      <h4 className="vayla-small-title">Kuulutus ja julkaisupäivä</h4>
      <p>
        Kansalaisten tulee muistututtaa suunnitelmista järjestelmän kautta viimeistään alla olevana päivämääränä.
        Muistutusten päivämäärä määräytyy kuulutuksen nähtävilläoloajan mukaan ja sitä ei voi muokata.
      </p>
    </Section>
  );
}
