import React, { ReactElement, useMemo, ReactNode } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section";
import { Link, Tabs } from "@mui/material";
import { useRouter } from "next/router";
import { UrlObject } from "url";
import { LinkTab, LinkTabProps } from "@components/layout/LinkTab";
import ProjektiConsumer from "../ProjektiConsumer";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { HyvaksymisPaatosVaiheTila, NahtavillaoloVaiheTila } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import FormatDate from "@components/FormatDate";

export enum PaatosTyyppi {
  HYVAKSYMISPAATOS = "HYVAKSYMISPAATOS",
  JATKOPAATOS1 = "JATKOPAATOS1",
  JATKOPAATOS2 = "JATKOPAATOS2",
}

interface PaatosTyyppiSpecificData {
  paatosRoutePart: string;
  pageTitle: string;
}

const paatosTyyppiSpecificContentMap: Record<PaatosTyyppi, PaatosTyyppiSpecificData> = {
  HYVAKSYMISPAATOS: { paatosRoutePart: "hyvaksyminen", pageTitle: "Kuulutus hyväksymispäätöksestä" },
  JATKOPAATOS1: { paatosRoutePart: "jatkaminen1", pageTitle: "Kuulutus hyväksymispäätöksen jatkamisesta" },
  JATKOPAATOS2: { paatosRoutePart: "jatkaminen2", pageTitle: "Kuulutus hyväksymispäätöksen jatkamisesta" },
};

export default function PaatosPageLayoutWrapper({ children, paatosTyyppi }: { children?: ReactNode; paatosTyyppi: PaatosTyyppi }) {
  return (
    <ProjektiConsumer>
      {(projekti) => (
        <PaatosPageLayout projekti={projekti} disableTabs={!projekti} paatosTyyppi={paatosTyyppi}>
          {children}
        </PaatosPageLayout>
      )}
    </ProjektiConsumer>
  );
}

function PaatosPageLayout({
  projekti,
  disableTabs,
  paatosTyyppi,
  children,
}: {
  projekti: ProjektiLisatiedolla;
  disableTabs?: boolean;
  children?: ReactNode;
  paatosTyyppi: PaatosTyyppi;
}): ReactElement {
  const router = useRouter();

  const nahtavillaolovaiheJulkaisu = projekti.nahtavillaoloVaiheJulkaisut?.[projekti.nahtavillaoloVaiheJulkaisut.length - 1];
  const migroitu = nahtavillaolovaiheJulkaisu?.tila == NahtavillaoloVaiheTila.MIGROITU;
  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  const { paatosRoutePart, pageTitle } = useMemo(() => paatosTyyppiSpecificContentMap[paatosTyyppi], [paatosTyyppi]);

  const kertaalleenLahetettyHyvaksyttavaksi = useMemo(
    () => projekti?.hyvaksymisPaatosVaiheJulkaisut && projekti.hyvaksymisPaatosVaiheJulkaisut.length >= 1,
    [projekti.hyvaksymisPaatosVaiheJulkaisut]
  );

  const hyvaksymisPaatosVaiheJulkaisu = projekti?.hyvaksymisPaatosVaiheJulkaisut
    ? projekti.hyvaksymisPaatosVaiheJulkaisut[projekti.hyvaksymisPaatosVaiheJulkaisut.length - 1]
    : null;

  let { kuulutusPaiva, published } = examineKuulutusPaiva(hyvaksymisPaatosVaiheJulkaisu?.kuulutusPaiva);

  const tabProps: LinkTabProps[] = useMemo(() => {
    const paatosRoute = paatosRoutePart;
    const result: LinkTabProps[] = [
      {
        linkProps: {
          href: {
            pathname: `/yllapito/projekti/[oid]/${paatosRoute}/aineisto`,
            query: { oid: projekti.oid },
          },
        },
        label: "Päätös ja liitteenä oleva aineisto",
        disabled: disableTabs,
        id: "aineisto_tab",
      },
      {
        linkProps: {
          href: {
            pathname: `/yllapito/projekti/[oid]/${paatosRoute}`,
            query: { oid: projekti.oid },
          },
        },
        label: "Kuulutuksen tiedot",
        disabled: disableTabs,
        id: "kuulutuksentiedot_tab",
      },
    ];
    if (kertaalleenLahetettyHyvaksyttavaksi) {
      result.reverse();
    }

    return result;
  }, [paatosRoutePart, projekti.oid, disableTabs, kertaalleenLahetettyHyvaksyttavaksi]);

  const value = useMemo(() => {
    const indexOfTab = tabProps.findIndex((tProps) => {
      const url = tProps.linkProps.href as UrlObject;
      return url.pathname === router.pathname;
    });
    return indexOfTab === -1 ? false : indexOfTab;
  }, [router.pathname, tabProps]);

  return (
    <ProjektiPageLayout title={pageTitle}>
      <Section noDivider>
        {!migroitu && !epaaktiivinen && !kertaalleenLahetettyHyvaksyttavaksi && (
          <Notification closable type={NotificationType.INFO} hideIcon>
            <div>
              <h3 className="vayla-small-title">Ohjeet</h3>
              <ul className="list-disc block pl-5">
                <li>Aloita lisäämällä päätös ja sen liitteenä olevat aineistot kuulutuksen ensimmäiseltä välilehdeltä.</li>
                <li>Jatka täyttämään kuulutuksen perustiedot valitsemalla &quot;Tallenna luonnos&quot;.</li>
                <li>
                  Anna päivämäärä, jolloin suunnitelman hyväksymispäätöksestä kuulutetaan. Kuulutus julkaistaan samana päivänä Valtion
                  liikenneväylien suunnittelu -palvelun kansalaispuolella.
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
        {!epaaktiivinen && (
          <Section noDivider>
            {!published && hyvaksymisPaatosVaiheJulkaisu?.tila === HyvaksymisPaatosVaiheTila.HYVAKSYTTY && (
              <Notification type={NotificationType.WARN}>Kuulutusta ei ole vielä julkaistu. Kuulutuspäivä {kuulutusPaiva}.</Notification>
            )}
            {published && hyvaksymisPaatosVaiheJulkaisu?.tila === HyvaksymisPaatosVaiheTila.HYVAKSYTTY && (
              <Notification type={NotificationType.INFO_GREEN}>
                Kuulutus nähtäville asettamisesta on julkaistu {kuulutusPaiva}. Projekti näytetään kuulutuspäivästä lasketun määräajan
                jälkeen palvelun julkisella puolella suunnittelussa olevana. Kuulutusvaihe päättyy{" "}
                <FormatDate date={hyvaksymisPaatosVaiheJulkaisu.kuulutusVaihePaattyyPaiva} />.
              </Notification>
            )}
            {hyvaksymisPaatosVaiheJulkaisu && hyvaksymisPaatosVaiheJulkaisu?.tila === HyvaksymisPaatosVaiheTila.ODOTTAA_HYVAKSYNTAA && (
              <Notification type={NotificationType.WARN}>
                Kuulutus nähtäville asettamisesta odottaa hyväksyntää. Tarkasta kuulutus ja a) hyväksy tai b) palauta kuulutus
                korjattavaksi, jos havaitset puutteita tai virheen.
              </Notification>
            )}
          </Section>
        )}
        <Tabs value={value}>
          {tabProps.map((tProps, index) => (
            <LinkTab key={index} {...tProps} />
          ))}
        </Tabs>
      </Section>
      {!migroitu ? children : <p>Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.</p>}
    </ProjektiPageLayout>
  );
}
