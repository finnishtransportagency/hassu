import React, { ReactElement } from "react";
import { Kieli } from "@services/api";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";
import { kuntametadata } from "hassu-common/kuntametadata";
import ContentSpacer from "@components/layout/ContentSpacer";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";

interface Props {
  projekti: ProjektiLisatiedolla | null;
}

export default function ProjektiKuntatiedot({ projekti }: Props): ReactElement {
  const kuntatiedot: KeyValueData[] = [
    { header: "Maakunnat", data: kuntametadata.namesForMaakuntaIds(projekti?.velho?.maakunnat, Kieli.SUOMI).join(", ") },
    {
      header: "Kunnat",
      data: kuntametadata.namesForKuntaIds(projekti?.velho?.kunnat, Kieli.SUOMI).join(", "),
    },
  ];

  return (
    <ContentSpacer>
      <h3 className="vayla-subtitle">Projektiin liittyvät maakunnat ja kunnat</h3>
      <KeyValueTable rows={kuntatiedot} />
    </ContentSpacer>
  );
}
