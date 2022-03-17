import { useRouter } from "next/router";
import React, { ReactElement, useEffect } from "react";
import { useProjektiJulkinen } from "../../../hooks/useProjektiJulkinen";
import FormatDate from "@components/FormatDate";
import useTranslation from "next-translate/useTranslation";
import { AloitusKuulutusJulkaisuJulkinen, Kieli } from "../../../../common/graphql/apiModel";
import ExtLink from "@components/ExtLink";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";
import { PageProps } from "@pages/_app";
import { bgcolor } from "@mui/system";

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

export default function AloituskuulutusJulkinen({ setRouteLabels }: PageProps): ReactElement {
  const router = useRouter();
  const { t } = useTranslation("projekti");
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti } = useProjektiJulkinen(oid);
  const kuulutus = projekti?.aloitusKuulutusJulkaisut?.[0];
  const velho = kuulutus?.velho;

  useEffect(() => {
    console.log("oid", oid);
    if (router.isReady) {
      let routeLabel = "";
      if (kuulutus?.velho?.nimi) {
        routeLabel = kuulutus.velho.nimi;
      } else if (typeof oid === "string") {
        routeLabel = oid;
      }
      if (routeLabel) {
        setRouteLabels({ "/suunnitelma/[oid]": { label: routeLabel } });
        console.log("Aseta bread crumbs");
      }
    }
  }, [router.isReady, oid, kuulutus, setRouteLabels]);

  if (!projekti || !velho || !kuulutus) {
    return <div />;
  }

  let sijainti = "";
  if (velho.maakunnat) {
    sijainti = sijainti + velho.maakunnat.join(", ") + "; ";
  }
  if (velho.kunnat) {
    sijainti = sijainti + velho.kunnat.join(", ");
  }
  const yhteystiedot = formatYhteystiedotText(kuulutus);
  const keyValueData: KeyValueData[] = [
    { header: "Nähtävilläoloaika", data: `${kuulutus.kuulutusPaiva} - ${kuulutus.siirtyySuunnitteluVaiheeseen}` },
    { header: "Hankkeen sijainti", data: sijainti },
    { header: "Suunnitelman tyyppi", data: velho?.tyyppi && t(`projekti-tyyppi.${velho?.tyyppi}`) },
  ];

  let aloituskuulutusPDFPath =
    kuulutus.aloituskuulutusPDFt?.[kuulutus.kielitiedot?.ensisijainenKieli || Kieli.SUOMI]?.aloituskuulutusPDFPath;
  let kuulutusFileName = aloituskuulutusPDFPath?.replace(/.*\//, "").replace(/\.\w+$/, "");
  let kuulutusFileExt = aloituskuulutusPDFPath?.replace(/.*\./, "");

  return (
    <ProjektiJulkinenPageLayout title="Kuulutus suunnittelun aloittamisesta">
      <>
        <Section noDivider>
          <KeyValueTable rows={keyValueData}></KeyValueTable>
          <p>
            Kuulutus on julkaistu tietoverkossa Väyläviraston verkkosivuilla {kuulutus.kuulutusPaiva}. Asianosaisten
            katsotaan saaneen tiedon suunnittelun käynnistymisestä ja tutkimusoikeudesta seitsemäntenä päivänä
            kuulutuksen julkaisusta (hallintolaki 62 a §). Suunnitelmasta vastaavalla on oikeus tehdä kiinteistöillä
            suunnittelutyön edellyttämiä mittauksia, maaperätutkimuksia ja muita valmistelevia toimenpiteitä (laki
            liikennejärjestelmästä ja maanteistä LjMTL 16 §).{" "}
          </p>
          <h4 className="vayla-small-title">Suunnitteluhankkeen kuvaus</h4>
          <p>{kuulutus.hankkeenKuvaus?.[kuulutus.kielitiedot?.ensisijainenKieli || Kieli.SUOMI]}</p>
          <h4 className="vayla-small-title">Yhteystiedot</h4>
          <p>Lisätietoja antavat {yhteystiedot}</p>
          <h4 className="vayla-small-title">Ladattava kuulutus</h4>
          <ExtLink href={aloituskuulutusPDFPath}>{kuulutusFileName}</ExtLink> ({kuulutusFileExt}) (
          <FormatDate date={kuulutus.kuulutusPaiva} />-
          <FormatDate date={kuulutus.siirtyySuunnitteluVaiheeseen} />)
          {projekti.euRahoitus && (
            <img src="/eu-logo.jpg" width={134} height={138} alt="EU aluerahoitus" style={{ backgroundColor: "yellow" }} />
          )}
        </Section>
      </>
    </ProjektiJulkinenPageLayout>
  );
}
