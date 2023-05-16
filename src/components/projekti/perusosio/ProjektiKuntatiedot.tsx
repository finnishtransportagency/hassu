import React, { ReactElement } from "react";
import { Kieli } from "@services/api";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";
import { kuntametadata } from "../../../../common/kuntametadata";
import ContentSpacer from "@components/layout/ContentSpacer";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";

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
      <h4 className="vayla-small-title">Projektiin liittyvät maakunnat ja kunnat</h4>
      <KeyValueTable rows={kuntatiedot} />
    </ContentSpacer>
  );
}
