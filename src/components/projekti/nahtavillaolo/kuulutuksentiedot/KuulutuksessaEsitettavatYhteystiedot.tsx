import Section from "@components/layout/Section";
import React from "react";

type Props = {};

export default function KuulutuksessaEsitettavatYhteystiedot({}: Props) {
  return (
    <Section>
      <h4 className="vayla-small-title">Kuulutuksessa esitettävät yhteystiedot</h4>
      <p>
        Voit valita kuulutuksessa esitettäviin yhteystietoihin projektiin tallennetun henkilön tai lisätä uuden
        yhteystiedon. Projektipäällikön tiedot esitetään aina. Projektiin tallennettujen henkilöiden yhteystiedot
        haetaan Projektin henkilöt -sivulle tallennetuista tiedoista.
      </p>
    </Section>
  );
}
