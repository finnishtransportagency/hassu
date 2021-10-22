import React, { ReactElement } from "react";
import styles from "@styles/projekti/ProjektiPerustiedot.module.css";

interface Props {
  perustiedot: { header: string; data: string | undefined }[];
}

export default function ProjektiPerustiedot({ perustiedot }: Props): ReactElement {
  return (
    <div className={styles["base-data-grid"]}>
      {perustiedot.map(({ header, data }, index) => (
        <div key={index} className={styles["data-row"]}>
          <div className={styles.cell}>{header}</div>
          <div className={styles.cell}>{data || "-"}</div>
        </div>
      ))}
    </div>
  );
}
