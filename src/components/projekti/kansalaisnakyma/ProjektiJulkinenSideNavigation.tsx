import React, { ReactElement } from "react";
import HassuLink from "../../HassuLink";
import styles from "@styles/projekti/ProjektiSideNavigation.module.css";
import classNames from "classnames";
import { useRouter } from "next/router";
import useProjekti from "src/hooks/useProjekti";
import { AloitusKuulutusJulkaisuJulkinen, Status } from "@services/api";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import Section from "@components/layout/Section";

interface Route {
  title: string;
  href?: string;
  disabled?: boolean;
}

function formatYhteystiedotText(kuulutus: AloitusKuulutusJulkaisuJulkinen) {
  const yhteystiedotList = kuulutus.yhteystiedot.map(
    (yt) =>
      yt.etunimi +
      " " +
      yt.sukunimi +
      ", puh. " +
      yt.puhelinnumero +
      ", " +
      yt.sahkoposti +
      " (" +
      yt.organisaatio +
      ")"
  );

  if (yhteystiedotList.length == 1) {
    return yhteystiedotList[0];
  } else {
    return (
      yhteystiedotList.slice(0, yhteystiedotList.length - 1).join(", ") +
      " ja " +
      yhteystiedotList[yhteystiedotList.length - 1]
    );
  }
}

export default function ProjektiSideNavigation(): ReactElement {
  const router = useRouter();
  const oidParam = router.query.oid;
  const { data: projekti } = useProjektiJulkinen(oidParam as string);
  if (!projekti) {
    return <div />;
  }
  if (!projekti.aloitusKuulutusJulkaisut || !projekti.aloitusKuulutusJulkaisut[0]) {
    return <div />;
  }
  const kuulutus = projekti.aloitusKuulutusJulkaisut[0];
  const velho = kuulutus.velho;
  const suunnitteluSopimus = kuulutus.suunnitteluSopimus;

  let sijainti = "";
  if (velho.maakunnat) {
    sijainti = sijainti + velho.maakunnat.join(", ") + "; ";
  }
  if (velho.kunnat) {
    sijainti = sijainti + velho.kunnat.join(", ");
  }
  const yhteystiedot = formatYhteystiedotText(kuulutus);

  return (
    <div role="navigation" className={styles["side-nav"]}>
      <h4>Suunnitteluhankkeen yhteyshenkilöt</h4>
      {kuulutus.yhteystiedot.map((yt) => (
        <div key={yt.etunimi + yt.sukunimi}>
          <p>{yt.organisaatio}</p>
          <p>
            <b>
              {yt.etunimi} {yt.sukunimi}
            </b>
          </p>
          <p>{yt.puhelinnumero}</p>
          <p>{yt.sahkoposti}</p>
        </div>
      ))}
      {suunnitteluSopimus && (
        <div>
          <p>{suunnitteluSopimus.logo && <img src={suunnitteluSopimus.logo} alt="Suunnittelusopimus logo" />}</p>
          <p>{suunnitteluSopimus.kunta}</p>
          <p>PROJEKTIPÄÄLLIKKÖ</p>
          <p>
            <b>
              {suunnitteluSopimus.etunimi} {suunnitteluSopimus.sukunimi}
            </b>
          </p>
          <p>{suunnitteluSopimus.puhelinnumero}</p>
          <p>{suunnitteluSopimus.email}</p>
        </div>
      )}
    </div>
  );
}
