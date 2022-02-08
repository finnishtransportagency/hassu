import React, { ReactElement } from "react";
import styles from "@styles/projekti/ProjektiPerustiedot.module.css";
import { Projekti } from "@services/api";
import useTranslation from "next-translate/useTranslation";

interface Props {
  projekti?: Projekti | null;
}

export default function ProjektiPerustiedot({ projekti }: Props): ReactElement {
  const { t } = useTranslation("projekti");
  const velho = projekti?.velho;
  const perustiedot = [
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
    <>
      <h4 className="vayla-small-title">Suunnitteluhankkeen perustiedot</h4>
      <div className={styles["base-data-grid"]}>
        {perustiedot.map(({ header, data }, index) => (
          <div key={index} className={styles["data-row"]}>
            <div className={styles.cell}>{header}</div>
            <div className={styles.cell}>{data || "-"}</div>
          </div>
        ))}
      </div>
    </>
  );
}
