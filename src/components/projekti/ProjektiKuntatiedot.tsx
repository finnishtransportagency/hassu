import React, { ReactElement } from "react";
import styles from "@styles/projekti/ProjektiPerustiedot.module.css";
import { Projekti } from "@services/api";

interface Props {
  projekti?: Projekti | null;
}

export default function ProjektiPerustiedot({ projekti }: Props): ReactElement {
  const kuntatiedot = [
    { header: "Maakunnat", data: projekti?.velho?.maakunnat?.toString() },
    {
      header: "Kunnat",
      data: projekti?.velho?.kunnat?.toString(),
    },
  ];

  return (
    <>
      <h4 className="vayla-small-title">Projektiin liittyvät maakunnat ja kunnat</h4>
      <div className={styles["base-data-grid"]}>
        {kuntatiedot.map(({ header, data }, index) => (
          <div key={index} className={styles["data-row"]}>
            <div className={styles.cell}>{header}</div>
            <div className={styles.cell}>{data || "-"}</div>
          </div>
        ))}
      </div>
    </>
  );
}
