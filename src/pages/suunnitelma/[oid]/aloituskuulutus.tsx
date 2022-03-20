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
import Notification, { NotificationType } from "@components/notification/Notification";
import SectionContent from "@components/layout/SectionContent";
import { formatDate } from "src/util/dateUtils";

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
    {
      header: "Nähtävilläoloaika",
      data: `${formatDate(kuulutus.kuulutusPaiva)} - ${formatDate(kuulutus.siirtyySuunnitteluVaiheeseen)}`,
    },
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
          <SectionContent>
            <p>
              Kuulutus on julkaistu tietoverkossa Väyläviraston verkkosivuilla{" "}
              <FormatDate date={kuulutus.kuulutusPaiva} />. Asianosaisten katsotaan saaneen tiedon suunnittelun
              käynnistymisestä ja tutkimusoikeudesta seitsemäntenä päivänä kuulutuksen julkaisusta (hallintolaki 62 a
              §).
            </p>
            <p>
              Suunnitelmasta vastaavalla on oikeus tehdä kiinteistöillä suunnittelutyön edellyttämiä mittauksia,
              maaperätutkimuksia ja muita valmistelevia toimenpiteitä (laki liikennejärjestelmästä ja maanteistä LjMTL
              16 §).
            </p>
          </SectionContent>
          <h4 className="vayla-small-title">Suunnitteluhankkeen kuvaus</h4>
          <SectionContent>
            <p>{kuulutus.hankkeenKuvaus?.[kuulutus.kielitiedot?.ensisijainenKieli || Kieli.SUOMI]}</p>
          </SectionContent>
          <h4 className="vayla-small-title">Asianosaisen oikeudet</h4>
          <Notification type={NotificationType.INFO} hideIcon>
            <SectionContent sx={{ padding: "1rem 1rem" }}>
              <ul>
                <li>
                  Kiinteistön omistajilla ja muilla asianosaisilla sekä niillä, joiden asumiseen, työntekoon tai muihin
                  oloihin suunnitelma saattaa vaikuttaa on oikeus olla tutkimuksissa saapuvilla ja lausua mielipiteensä
                  asiassa (LjMTL 16 § ja 27 §).
                </li>
                <li>
                  Suunnittelun edetessä tullaan myöhemmin erikseen ilmoitettavalla tavalla varaamaan tilaisuus
                  mielipiteen ilmaisemiseen suunnitelmasta (LjMTL 27 § ja valtioneuvoston asetus maanteistä 3 §).
                </li>
                <li>
                  Valmistuttuaan suunnitelmat asetetaan yleisesti nähtäville, jolloin asianosaisilla on mahdollisuus
                  tehdä kirjallinen muistutus suunnitelmasta (LjMTL 27 §).
                </li>
              </ul>
            </SectionContent>
          </Notification>
          <h4 className="vayla-small-title">Yhteystiedot</h4>
          <SectionContent>
            <p>Lisätietoja antavat {yhteystiedot}</p>
          </SectionContent>
          <h4 className="vayla-small-title">Ladattava kuulutus</h4>
          <SectionContent className="flex gap-4">
            <ExtLink href={aloituskuulutusPDFPath}>{kuulutusFileName}</ExtLink> ({kuulutusFileExt}) (
            <FormatDate date={kuulutus.kuulutusPaiva} />-
            <FormatDate date={kuulutus.siirtyySuunnitteluVaiheeseen} />)
          </SectionContent>
          {projekti.euRahoitus && <img src="/eu-logo.jpg" width={134} height={138} alt="EU aluerahoitus" />}
        </Section>
      </>
    </ProjektiJulkinenPageLayout>
  );
}
