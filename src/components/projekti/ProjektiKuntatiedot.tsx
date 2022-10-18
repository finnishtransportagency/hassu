import React, { ReactElement } from "react";
import { Kieli, Projekti } from "@services/api";
import Section from "@components/layout/Section";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";
import { kuntametadata } from "../../../common/kuntametadata";

interface Props {
  projekti?: Projekti | null;
}

export default function ProjektiPerustiedot({ projekti }: Props): ReactElement {
  const kuntatiedot: KeyValueData[] = [
    { header: "Maakunnat", data: kuntametadata.namesForMaakuntaIds(projekti?.velho?.maakunnat, Kieli.SUOMI).join(", ") },
    {
      header: "Kunnat",
      data: kuntametadata.namesForKuntaIds(projekti?.velho?.kunnat, Kieli.SUOMI).join(", "),
    },
  ];

  return (
    <Section smallGaps>
      <h4 className="vayla-small-title">Projektiin liittyvät maakunnat ja kunnat</h4>
      <KeyValueTable rows={kuntatiedot} />
    </Section>
  );
}
