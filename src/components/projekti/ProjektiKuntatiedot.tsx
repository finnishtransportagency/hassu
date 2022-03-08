import React, { ReactElement } from "react";
import { Projekti } from "@services/api";
import Section from "@components/layout/Section";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";

interface Props {
  projekti?: Projekti | null;
}

export default function ProjektiPerustiedot({ projekti }: Props): ReactElement {
  const kuntatiedot: KeyValueData[] = [
    { header: "Maakunnat", data: projekti?.velho?.maakunnat?.toString() },
    {
      header: "Kunnat",
      data: projekti?.velho?.kunnat?.toString(),
    },
  ];

  return (
    <Section smallGaps>
      <h4 className="vayla-small-title">Projektiin liittyvät maakunnat ja kunnat</h4>
      <KeyValueTable rows={kuntatiedot} />
    </Section>
  );
}
