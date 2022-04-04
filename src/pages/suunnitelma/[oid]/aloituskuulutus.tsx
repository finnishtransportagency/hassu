import { useRouter } from "next/router";
import React, { ReactElement, useEffect } from "react";
import { useProjektiJulkinen } from "../../../hooks/useProjektiJulkinen";
import FormatDate from "@components/FormatDate";
import useTranslation from "next-translate/useTranslation";
import { AloitusKuulutusJulkaisuJulkinen, Kieli, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import ExtLink from "@components/ExtLink";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";
import { PageProps } from "@pages/_app";
import Notification, { NotificationType } from "@components/notification/Notification";
import SectionContent from "@components/layout/SectionContent";
import { formatDate } from "src/util/dateUtils";
import HassuStack from "@components/layout/HassuStack";

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
  const suunnittelusopimus = kuulutus?.suunnitteluSopimus;

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
    <ProjektiJulkinenPageLayout selectedStep={0} title="Kuulutus suunnittelun aloittamisesta">
      <>
        <Section noDivider>
          <KeyValueTable rows={keyValueData}></KeyValueTable>
          {velho.tyyppi !== ProjektiTyyppi.RATA && (
            <SectionContent>
              {suunnittelusopimus && (
                <p>
                  {suunnittelusopimus.kunta} ja{" "}
                  {velho.suunnittelustaVastaavaViranomainen
                    ? t(`vastaava-viranomainen.${velho.suunnittelustaVastaavaViranomainen}`)
                    : velho.tilaajaOrganisaatio}{" "}
                  aloittavat yleissuunnitelman laatimisen tarpeellisine tutkimuksineen.
                </p>
              )}
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
          )}
          {velho.tyyppi === ProjektiTyyppi.RATA && (
            <SectionContent>
              <p>
                Väylävirasto on julkaissut kuulutuksen suunnittelun aloittamisesta ja maastotutkimuksista{" "}
                <FormatDate date={kuulutus.kuulutusPaiva} />.
              </p>
              <p>
                Asianosaisten katsotaan saaneen tiedon suunnittelun käynnistymisestä ja tutkimusoikeudesta seitsemäntenä
                päivänä kuulutuksen julkaisemisesta. (ratalaki 95 §, HL 62 a §)
              </p>
              <p>
                Rataverkon haltijalla on oikeus tehdä suunnittelualueeseen kuuluvalla kiinteistöllä suunnitteluun
                liittyviä mittauksia, maaperätutkimuksia ja muita valmistelevia toimenpiteitä (ratalaki 9 §).
              </p>
            </SectionContent>
          )}

          <h4 className="vayla-small-title">Suunnitteluhankkeen kuvaus</h4>
          <SectionContent>
            <p>{kuulutus.hankkeenKuvaus?.[kuulutus.kielitiedot?.ensisijainenKieli || Kieli.SUOMI]}</p>
          </SectionContent>
          <h4 className="vayla-small-title">Asianosaisen oikeudet</h4>
          <Notification type={NotificationType.INFO} hideIcon>
            <SectionContent sx={{ padding: "1rem 1rem" }}>
              {velho.tyyppi !== ProjektiTyyppi.RATA && (
                <ul>
                  <li>
                    Kiinteistön omistajilla ja muilla asianosaisilla sekä niillä, joiden asumiseen, työntekoon tai
                    muihin oloihin suunnitelma saattaa vaikuttaa on oikeus olla tutkimuksissa saapuvilla ja lausua
                    mielipiteensä asiassa (LjMTL 16 § ja 27 §).
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
              )}
              {velho.tyyppi === ProjektiTyyppi.RATA && (
                <ul>
                  <li>
                    Kiinteistön omistajilla ja muilla asianosaisilla sekä niillä, joiden asumiseen, työntekoon tai
                    muihin oloihin suunnitelma saattaa vaikuttaa on oikeus olla tutkimuksissa saapuvilla ja lausua
                    mielipiteensä asiassa (ratalaki 22 § ja 9 §).
                  </li>
                  <li>
                    Suunnittelun edetessä tullaan myöhemmin erikseen ilmoitettavalla tavalla varaamaan tilaisuus
                    mielipiteen ilmaisemiseen suunnitelmasta.
                  </li>
                  <li>
                    Valmistuttuaan suunnitelma asetetaan yleisesti nähtäville, jolloin asianosaisilla on mahdollisuus
                    tehdä kirjallinen muistutus suunnitelmasta. (ratalaki 22 §).
                  </li>
                </ul>
              )}
            </SectionContent>
          </Notification>
          <SectionContent>
            {velho.tyyppi !== ProjektiTyyppi.RATA && (
              <p>
                Väylävirasto käsittelee suunnitelman laatimiseen liittyen tarpeellisia henkilötietoja. Halutessasi
                tietää tarkemmin väyläsuunnittelun tietosuojakäytänteistä, tutustu verkkosivujen tietosuojaosioon
                osoitteessa www.vayla.fi/tietosuoja.
              </p>
            )}
            {velho.tyyppi === ProjektiTyyppi.RATA && (
              <p>
                Väylävirasto käsittelee suunnitelmaan laatimiseen liittyen tarpeellisia henkilötietoja. Halutessasi
                tietää tarkemmin väyläsuunnittelun tietosuojakäytänteistä, tutustu verkkosivujen tietosuojaosioon
                osoitteessa https://www.vayla.fi/tietosuoja.
              </p>
            )}
          </SectionContent>
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
          {projekti.euRahoitus && <img src="/eu-logo.jpg" width={134} alt="EU aluerahoitus" />}
          <SectionContent sx={{ marginTop: "2rem" }}>
            <HassuStack rowGap={0}>
              <ExtLink hideIcon href="https://www.vayla.fi/tietosuoja">
                Tutustu osallistumismahdollisuuksiin
              </ExtLink>
              <ExtLink hideIcon href="https://vayla.fi/suunnittelu-rakentaminen/hankkeiden-suunnittelu">
                Tutustu hankesuunnitteluun
              </ExtLink>
            </HassuStack>
          </SectionContent>
        </Section>
      </>
    </ProjektiJulkinenPageLayout>
  );
}
