import React, { ReactElement } from "react";
import { Projekti } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import SectionContent from "@components/layout/SectionContent";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";

interface Props {
  projekti?: Projekti | null;
}

export default function ProjektiPerustiedot({ projekti }: Props): ReactElement {
  const { t } = useTranslation("projekti");
  const velho = projekti?.velho;
  const perustiedot: KeyValueData[] = [
    { header: "Asiatunnus", data: velho?.asiatunnusELY },
    {
      header: "Vastaava viranomainen",
      data: velho?.tilaajaOrganisaatio,
    },
    {
      header: "Suunnitelman tyyppi",
      data: velho?.tyyppi && t(`projekti-tyyppi.${velho?.tyyppi}`),
    },
    {
      header: "Väylämuoto",
      data: velho?.vaylamuoto?.map((muoto) => t(`projekti-vayla-muoto.${muoto}`)).join(", "),
    },
  ];

  return (
    <SectionContent>
      <h4 className="vayla-small-title">Suunnitteluhankkeen perustiedot</h4>
      <KeyValueTable rows={perustiedot} />
    </SectionContent>
  );
}
