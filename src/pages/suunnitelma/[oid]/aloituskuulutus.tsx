import { useRouter } from "next/router";
import React, { ReactElement } from "react";
import { useProjektiJulkinen } from "../../../hooks/useProjektiJulkinen";
import FormatDate from "@components/FormatDate";
import useTranslation from "next-translate/useTranslation";
import { AloitusKuulutusJulkaisu, Kieli } from "../../../../common/graphql/apiModel";
import ExtLink from "@components/ExtLink";

function formatYhteystiedotText(kuulutus: AloitusKuulutusJulkaisu) {
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

export default function AloituskuulutusJulkinen(): ReactElement {
  const router = useRouter();
  const { t } = useTranslation("projekti");
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti } = useProjektiJulkinen(oid);

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

  let aloituskuulutusPDFPath =
    kuulutus.aloituskuulutusPDFt?.[kuulutus.kielitiedot?.ensisijainenKieli || Kieli.SUOMI]?.aloituskuulutusPDFPath;
  let kuulutusFileName = aloituskuulutusPDFPath?.replace(/.*\//, "").replace(/\.\w+$/, "");
  let kuulutusFileExt = aloituskuulutusPDFPath?.replace(/.*\./, "");
  return (
    <>
      <h3 className="vayla-title">Yhteyshenkilöt</h3>
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
          <p>{suunnitteluSopimus.logo}</p>
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
      <h2>Kuulutus suunnittelun aloittamisesta</h2>
      <p>
        Nähtävilläoloaika <FormatDate date={kuulutus.kuulutusPaiva} />-
        <FormatDate date={kuulutus.siirtyySuunnitteluVaiheeseen} />
      </p>
      <p>Hankkeen sijainti {sijainti}</p>
      <p>Suunnitelman tyyppi {velho?.tyyppi && t(`projekti-tyyppi.${velho?.tyyppi}`)}</p>
      <h2>Suunnitteluhankkeen kuvaus</h2>
      <p>{kuulutus.hankkeenKuvaus?.[kuulutus.kielitiedot?.ensisijainenKieli || Kieli.SUOMI]}</p>
      <h2>Yhteystiedot</h2>
      <p>Lisätietoja antavat {yhteystiedot}</p>
      <h2>Ladattava kuulutus</h2>
      <ExtLink href={aloituskuulutusPDFPath}>{kuulutusFileName}</ExtLink> ({kuulutusFileExt}) (
      <FormatDate date={kuulutus.kuulutusPaiva} />-
      <FormatDate date={kuulutus.siirtyySuunnitteluVaiheeseen} />){projekti.euRahoitus && <p>EU-logo tähän</p>}
    </>
  );
}
