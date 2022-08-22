import React, { ReactElement } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { PageProps } from "@pages/_app";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import Notification, { NotificationType } from "@components/notification/Notification";
import Tabs from "@components/layout/tabs/Tabs";
import KuulutuksenTiedot from "@components/projekti/hyvaksyminen/kuulutuksenTiedot/index";
import PaatosAineistot from "@components/projekti/hyvaksyminen/aineistot/index";
import { useProjekti } from "src/hooks/useProjekti";
import { Link } from "@mui/material";
import { HyvaksymisPaatosVaiheTila } from "@services/api";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import FormatDate from "@components/FormatDate";
import Section from "@components/layout/Section";

export default function Hyvaksymispaatos({ setRouteLabels }: PageProps): ReactElement {
  useProjektiBreadcrumbs(setRouteLabels);
  const { data: projekti } = useProjekti();

  const kertaalleenLahetettyHyvaksyttavaksi =
    projekti?.hyvaksymisPaatosVaiheJulkaisut && projekti.hyvaksymisPaatosVaiheJulkaisut.length >= 1;

  const hyvaksymisPaatosVaiheJulkaisu = projekti?.hyvaksymisPaatosVaiheJulkaisut
    ? projekti.hyvaksymisPaatosVaiheJulkaisut[projekti.hyvaksymisPaatosVaiheJulkaisut.length - 1]
    : null;

  let { kuulutusPaiva, published } = examineKuulutusPaiva(hyvaksymisPaatosVaiheJulkaisu?.kuulutusPaiva);
  return (
    <ProjektiPageLayout title="Kuulutus hyväksymispäätöksestä">
      {!kertaalleenLahetettyHyvaksyttavaksi && (
        <Notification closable type={NotificationType.INFO} hideIcon>
          <div>
            <h3 className="vayla-small-title">Ohjeet</h3>
            <ul className="list-disc block pl-5">
              <li>
                Aloita lisäämällä päätös ja sen liitteenä olevat aineistot kuulutuksen ensimmäiseltä välilehdeltä.
              </li>
              <li>Jatka täyttämään kuulutuksen perustiedot valitsemalla &quot;Tallenna luonnos&quot;.</li>
              <li>
                Anna päivämäärä, jolloin suunnitelman hyväksymispäätöksestä kuulutetaan. Kuulutus julkaistaan samana
                päivänä Valtion liikenneväylien suunnittelu -palvelun kansalaispuolella.
              </li>
              <li>
                Pääkäyttäjä lisää projektille Liikenne- ja viestintäviraston päätöksen ja asianumeron{" "}
                <Link underline="none" href={`/yllapito/projekti/${projekti?.oid}/kasittelyntila`}>
                  Käsittelyn tila
                </Link>{" "}
                -sivulla.
              </li>
              <li>Valitse hallinto-oikeus, jolta muutoksenhakua voidaan hakea.</li>
              <li>Valitse ja lisää kuulutuksessa esitettävät yhteystiedot ja ilmoituksen vastaanottajat.</li>
              <li>Esikatsele ja lähetä hyväksymispäätöksen kuulutus hyväksyttäväksi projektipäällikölle.</li>
            </ul>
          </div>
        </Notification>
      )}
      <Section noDivider>
        {!published && hyvaksymisPaatosVaiheJulkaisu?.tila === HyvaksymisPaatosVaiheTila.HYVAKSYTTY && (
          <Notification type={NotificationType.WARN}>
            Kuulutusta ei ole vielä julkaistu. Kuulutuspäivä {kuulutusPaiva}.
          </Notification>
        )}
        {published && hyvaksymisPaatosVaiheJulkaisu?.tila === HyvaksymisPaatosVaiheTila.HYVAKSYTTY && (
          <Notification type={NotificationType.INFO_GREEN}>
            Kuulutus nähtäville asettamisesta on julkaistu {kuulutusPaiva}. Projekti näytetään kuulutuspäivästä lasketun
            määräajan jälkeen palvelun julkisella puolella suunnittelussa olevana. Kuulutusvaihe päättyy{" "}
            <FormatDate date={hyvaksymisPaatosVaiheJulkaisu.kuulutusVaihePaattyyPaiva} />.
          </Notification>
        )}
        {hyvaksymisPaatosVaiheJulkaisu?.tila !== HyvaksymisPaatosVaiheTila.HYVAKSYTTY && (
          <Notification type={NotificationType.WARN}>
            Kuulutus nähtäville asettamisesta odottaa hyväksyntää. Tarkasta kuulutus ja a) hyväksy tai b) palaute
            kuulutus korjattavaksi, jos havaitset puutteita tai virheen.
          </Notification>
        )}
      </Section>
      <Tabs
        tabStyle="Underlined"
        defaultValue={0}
        tabs={
          kertaalleenLahetettyHyvaksyttavaksi
            ? [
                { label: "Kuulutuksen tiedot", content: <KuulutuksenTiedot /> },
                { label: "Päätös ja liitteenä oleva aineisto", content: <PaatosAineistot /> },
              ]
            : [
                { label: "Päätös ja liitteenä oleva aineisto", content: <PaatosAineistot /> },
                { label: "Kuulutuksen tiedot", content: <KuulutuksenTiedot /> },
              ]
        }
      />
    </ProjektiPageLayout>
  );
}
