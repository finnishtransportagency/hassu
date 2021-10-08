import { VelhoHakuTulos } from "@graphql/apiModel";
import React, { ReactElement } from "react";
import styles from "@styles/ProjektiTaulu.module.css";

interface Props {
  projektit: VelhoHakuTulos[];
  isLoading?: boolean;
}

export default function ProjektiTaulu({ projektit, isLoading }: Props): ReactElement {
  return (
    <table className={styles["project-table"]}>
      <thead>
        <tr>
          <th>Asiatunnus</th>
          <th>Nimi</th>
          <th>Tyyppi</th>
        </tr>
      </thead>
      <tbody>
        {isLoading
          ? Array.from({ length: 3 }, (_, index) => (
              <tr key={index} className="animate-pulse">
                <td className="sm:w-1/4" data-label="Asiatunnus">
                  <div className="bg-gray h-4 w-1/2 md:w-full rounded-md ml-auto mr-0 my-1 align-middle" />
                </td>
                <td className="sm:w-1/2" data-label="Nimi">
                  <div className="bg-gray h-4 w-1/2 md:w-full rounded-md ml-auto mr-0 my-1 align-middle" />
                </td>
                <td className="sm:w-1/4" data-label="Tyyppi">
                  <div className="bg-gray h-4 w-1/2 md:w-full rounded-md ml-auto mr-0 my-1 align-middle" />
                </td>
              </tr>
            ))
          : projektit.map(({ oid, nimi, tyyppi }) => (
              <tr key={oid} className={styles["project-row"]}>
                <td className="sm:w-1/4" data-label="Asiatunnus">
                  {oid}
                </td>
                <td className="sm:w-1/2" data-label="Nimi">
                  {nimi}
                </td>
                <td className="sm:w-1/4" data-label="Tyyppi">
                  {tyyppi}
                </td>
              </tr>
            ))}
      </tbody>
    </table>
  );
}
