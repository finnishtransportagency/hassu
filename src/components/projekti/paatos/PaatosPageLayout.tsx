import React, { ReactElement, useMemo, ReactNode } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section";
import { Link, Tabs } from "@mui/material";
import { useRouter } from "next/router";
import { UrlObject } from "url";
import { LinkTab, LinkTabProps } from "@components/layout/LinkTab";
import { KuulutusJulkaisuTila, MuokkausTila } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import FormatDate from "@components/FormatDate";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import {
  PaatosTyyppi,
  getPaatosSpecificData,
  paatosSpecificTilasiirtymaTyyppiMap,
  getNextPaatosTyyppi,
  paatosSpecificStatuses,
  paatosPageLayoutData,
} from "src/util/getPaatosSpecificData";
import UudelleenkuulutaButton from "../UudelleenkuulutaButton";
import { isProjektiStatusGreaterOrEqualTo } from "common/statusOrder";

export default function PaatosPageLayout({ children, paatosTyyppi }: { children?: ReactNode; paatosTyyppi: PaatosTyyppi }) {
  return (
    <ProjektiConsumer>
      {(projekti) => (
        <PaatosPageLayoutContent projekti={projekti} paatosTyyppi={paatosTyyppi}>
          {children}
        </PaatosPageLayoutContent>
      )}
    </ProjektiConsumer>
  );
}

function PaatosPageLayoutContent({
  projekti,
  paatosTyyppi,
  children,
}: {
  projekti: ProjektiLisatiedolla;
  children?: ReactNode;
  paatosTyyppi: PaatosTyyppi;
}): ReactElement {
  const router = useRouter();

  const { julkaisu, julkaisematonPaatos } = useMemo(() => getPaatosSpecificData(projekti, paatosTyyppi), [paatosTyyppi, projekti]);

  const nextPaatosTyyppi = getNextPaatosTyyppi(paatosTyyppi);
  const nextPaatosData = useMemo(
    () => (!!nextPaatosTyyppi ? getPaatosSpecificData(projekti, nextPaatosTyyppi) : undefined),
    [nextPaatosTyyppi, projekti]
  );

  const { mutate: reloadProjekti } = useProjekti();

  const migroitu = julkaisu?.tila == KuulutusJulkaisuTila.MIGROITU;
  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  const { paatosRoutePart, pageTitle } = useMemo(() => paatosPageLayoutData[paatosTyyppi], [paatosTyyppi]);

  const kertaalleenLahetettyHyvaksyttavaksi = !!julkaisu;

  let { kuulutusPaiva, published } = examineKuulutusPaiva(julkaisu?.kuulutusPaiva);

  const { aineistoStatus, status } = useMemo(() => paatosSpecificStatuses[paatosTyyppi], [paatosTyyppi]);

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
        disabled: !isProjektiStatusGreaterOrEqualTo(projekti, aineistoStatus),
        id: "aineisto_tab",
      },
      {
        linkProps: {
          href: {
            pathname: `/yllapito/projekti/[oid]/${paatosRoute}/kuulutus`,
            query: { oid: projekti.oid },
          },
        },
        label: "Kuulutuksen tiedot",
        disabled: !isProjektiStatusGreaterOrEqualTo(projekti, status),
        id: "kuulutuksentiedot_tab",
      },
    ];
    if (kertaalleenLahetettyHyvaksyttavaksi) {
      result.reverse();
    }

    return result;
  }, [paatosRoutePart, projekti, aineistoStatus, status, kertaalleenLahetettyHyvaksyttavaksi]);

  const value = useMemo(() => {
    const indexOfTab = tabProps.findIndex((tProps) => {
      const url = tProps.linkProps.href as UrlObject;
      return url.pathname === router.pathname;
    });
    return indexOfTab === -1 ? false : indexOfTab;
  }, [router.pathname, tabProps]);

  const showUudelleenkuulutaButton =
    julkaisu?.tila === KuulutusJulkaisuTila.HYVAKSYTTY &&
    julkaisematonPaatos?.muokkausTila === MuokkausTila.LUKU &&
    !nextPaatosData?.julkaisu &&
    projekti.nykyinenKayttaja.onYllapitaja;

  return (
    <ProjektiPageLayout
      title={pageTitle}
      contentAsideTitle={
        showUudelleenkuulutaButton && (
          <UudelleenkuulutaButton
            oid={projekti.oid}
            tyyppi={paatosSpecificTilasiirtymaTyyppiMap[paatosTyyppi]}
            reloadProjekti={reloadProjekti}
          />
        )
      }
    >
      <Section noDivider>
        {!migroitu && !epaaktiivinen && !kertaalleenLahetettyHyvaksyttavaksi && (
          <Notification closable type={NotificationType.INFO} hideIcon>
            <div>
              <h3 className="vayla-small-title">Ohjeet</h3>
              <ul className="list-disc block pl-5">
                <li>Aloita lisäämällä päätös ja sen liitteenä olevat aineistot kuulutuksen ensimmäiseltä välilehdeltä.</li>
                <li>
                  Huomioithan, että nähtäville ei saa asettaa henkilötietoja sisältävää aineistoa. Traficom toimittaa tarvittaessa
                  hyväksymispäätöksestä kaksi versiota – aseta nähtäville versio, jossa ei ole henkilötietoja.
                </li>
                <li>Jatka täyttämään kuulutuksen perustiedot valitsemalla &quot;Tallenna ja siirry kuulutukselle&quot;.</li>
                <li>
                  Anna päivämäärä, jolloin suunnitelman hyväksymispäätöksestä kuulutetaan. Kuulutus julkaistaan samana päivänä Valtion
                  liikenneväylien suunnittelu -palvelun kansalaispuolella.
                </li>
                <li>
                  Pääkäyttäjä tai projektipäällikkö lisää projektille Liikenne- ja viestintäviraston päätöksen päivän ja asiatunnuksen{" "}
                  <Link underline="none" href={`/yllapito/projekti/${projekti?.oid}/kasittelyntila`}>
                    Käsittelyn tila
                  </Link>{" "}
                  -sivulle.
                </li>
                <li>Valitse hallinto-oikeus, johon valitus osoitetaan.</li>
                <li>Valitse ja lisää kuulutuksessa esitettävät yhteystiedot ja ilmoituksen vastaanottajat.</li>
                <li>
                  Esikatsele ja lähetä hyväksymispäätöksen kuulutus hyväksyttäväksi projektipäällikölle. Hyväksyntä on hyvä tehdä noin
                  viikko ennen kuulutuksen julkaisua, jotta kunnat saavat tiedon kuulutuksesta ajoissa.
                </li>
                <li>Voit hyödyntää lehti-ilmoituksen tilauksessa järjestelmässä luotua kuulutuksen luonnosta.</li>
                <li>
                  Muistathan viedä kuulutuksen sekä muut järjestelmän luomat asiakirjat asianhallintaan. Huomioithan, että järjestelmä ei
                  lähetä ilmoitusta muistutuksen jättäneille, eikä lausunnonantajille, vaan se tulee lähettää järjestelmän ulkopuolella.
                </li>
              </ul>
            </div>
          </Notification>
        )}
        {!epaaktiivinen && (
          <Section noDivider>
            {!published && julkaisu?.tila === KuulutusJulkaisuTila.HYVAKSYTTY && (
              <Notification type={NotificationType.WARN}>Kuulutusta ei ole vielä julkaistu. Kuulutuspäivä {kuulutusPaiva}.</Notification>
            )}
            {published && julkaisu?.tila === KuulutusJulkaisuTila.HYVAKSYTTY && (
              <Notification type={NotificationType.INFO_GREEN}>
                Kuulutus nähtäville asettamisesta on julkaistu {kuulutusPaiva}. Projekti näytetään kuulutuspäivästä lasketun määräajan
                jälkeen palvelun julkisella puolella suunnittelussa olevana. Kuulutusvaihe päättyy{" "}
                <FormatDate date={julkaisu.kuulutusVaihePaattyyPaiva} />.
              </Notification>
            )}
            {julkaisu && julkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA && (
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
