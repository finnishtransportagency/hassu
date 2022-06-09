import Section from "@components/layout/Section";
import React from "react";

type Props = {};

export default function IlmoituksenVastaanottajat({}: Props) {
  return (
    <Section>
      <h4 className="vayla-small-title">Ilmoituksen vastaanottajat</h4>
      <p>
        Kuulutuksesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille. Kunnat on
        haettu Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle viranomaisorganisaatiolle, lisää
        uusi rivi Lisää uusi -painikkeella.
      </p>
      <p>Jos kuntatiedoissa on virhe, tee korjaus Projektivelhoon.</p>
    </Section>
  );
}
