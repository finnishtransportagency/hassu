import React, { ReactElement, useMemo } from "react";
import useTranslation from "next-translate/useTranslation";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";
import getAsiatunnus from "src/util/getAsiatunnus";
import ContentSpacer from "@components/layout/ContentSpacer";
import { PerusosioProps } from "./Perusosio";
import { ProjektiTyyppi } from "@services/api";
import { H2 } from "../../Headings";

export default function ProjektiPerustiedot({ projekti }: PerusosioProps): ReactElement {
  const { t } = useTranslation("projekti");

  const perustiedot: KeyValueData[] = useMemo(() => {
    const velho = projekti?.velho;
    const tiedot = [
      { header: "Asiatunnus", data: getAsiatunnus(projekti) },
      {
        header: "Suunnittelusta vastaava viranomainen",
        data: velho?.suunnittelustaVastaavaViranomainen && t(`vastaava-viranomainen.${velho?.suunnittelustaVastaavaViranomainen}`),
      },
      {
        header: "Suunnitelman tyyppi",
        data: velho?.tyyppi && t(`projekti-tyyppi.${velho.tyyppi}`),
      },
    ];
    if (velho.tyyppi === ProjektiTyyppi.YLEINEN) {
      tiedot.push({
        header: "Väylämuoto",
        data: velho?.vaylamuoto?.map((muoto) => t(`projekti-vayla-muoto.${muoto}`)).join(", "),
      });
    }
    return tiedot;
  }, [projekti, t]);

  return (
    <ContentSpacer>
      <H2>Projektin perustiedot</H2>
      <KeyValueTable rows={perustiedot} />
    </ContentSpacer>
  );
}
