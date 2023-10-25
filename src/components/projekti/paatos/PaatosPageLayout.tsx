import React, { ReactElement, ReactNode, useMemo, VFC } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section";
import { Link, Tabs } from "@mui/material";
import { useRouter } from "next/router";
import { UrlObject } from "url";
import { LinkTab, LinkTabProps } from "@components/layout/LinkTab";
import { KuulutusJulkaisuTila, MuokkausTila } from "@services/api";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import {
  getNextPaatosTyyppi,
  paatosPageLayoutData,
  paatosSpecificStatuses,
  paatosSpecificTilasiirtymaTyyppiMap,
} from "src/util/getPaatosSpecificData";
import { getPaatosSpecificData, paatosSpecificVaihe, PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import UudelleenkuulutaButton from "../UudelleenkuulutaButton";
import { isProjektiStatusGreaterOrEqualTo } from "common/statusOrder";
import { KuulutusInfoElement } from "../KuulutusInfoElement";
import { UusiSpan } from "../UusiSpan";
import { OhjelistaNotification } from "../common/OhjelistaNotification";

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

const PaatosOhje: VFC<{ projekti: ProjektiLisatiedolla; paatosTyyppi: PaatosTyyppi }> = ({ projekti, paatosTyyppi }) => {
  return (
    <>
      {paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS ? (
        <>
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
            Esikatsele ja lähetä hyväksymispäätöksen kuulutus hyväksyttäväksi projektipäällikölle. Hyväksyntä on hyvä tehdä noin viikko
            ennen kuulutuksen julkaisua, jotta kunnat saavat tiedon kuulutuksesta ajoissa.
          </li>
          <li>Voit hyödyntää lehti-ilmoituksen tilauksessa järjestelmässä luotua kuulutuksen luonnosta.</li>
          <li>
            Muistathan viedä kuulutuksen sekä muut järjestelmän luomat asiakirjat asianhallintaan. Huomioithan, että järjestelmä ei lähetä
            ilmoitusta muistutuksen jättäneille, eikä lausunnonantajille, vaan se tulee lähettää järjestelmän ulkopuolella.
          </li>
        </>
      ) : (
        <>
          <li>Aloita lisäämällä päätökset ja sen liitteenä olevat aineistot kuulutuksen ensimmäiseltä välilehdeltä.</li>
          <li>Jatka täyttämään kuulutuksen perustiedot valitsemalla “Tallenna ja siirry kuulutukselle”.</li>
          <li>
            Anna päivämäärä, jolloin suunnitelman hyväksymispäätöksestä kuulutetaan. Kuulutus julkaistaan samana päivänä Valtion
            liikenneväylien suunnittelu -palvelun kansalaispuolella.
          </li>
          <li>Päätöksen päivän ja asiatunnus tulee Käsittelyn tila -sivulta.</li>
          <li>Valitse hallinto-oikeus, jolta muutoksenhakua voidaan hakea</li>
          <li>Valitse ja lisää kuulutuksessa esitettävät yhteystiedot ja ilmoituksen vastaanottajat.</li>
          <li>Esikatsele ja lähetä hyväksymispäätöksen kuulutus hyväksyttäväksi projektipäällikölle.</li>
        </>
      )}
    </>
  );
};

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

  const { julkaisu, julkaisematonPaatos, edellisenVaiheenJulkaisu } = useMemo(
    () => getPaatosSpecificData(projekti, paatosTyyppi),
    [paatosTyyppi, projekti]
  );

  const nextPaatosTyyppi = getNextPaatosTyyppi(paatosTyyppi);
  const nextPaatosData = useMemo(
    () => (!!nextPaatosTyyppi ? getPaatosSpecificData(projekti, nextPaatosTyyppi) : undefined),
    [nextPaatosTyyppi, projekti]
  );

  const { mutate: reloadProjekti } = useProjekti();

  const migroitu = julkaisu?.tila == KuulutusJulkaisuTila.MIGROITU;
  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  const { paatosRoutePart, pageTitle } = useMemo(() => paatosPageLayoutData[paatosTyyppi], [paatosTyyppi]);

  const { aineistoStatus, status } = useMemo(() => paatosSpecificStatuses[paatosTyyppi], [paatosTyyppi]);

  const tabProps: LinkTabProps[] = useMemo(() => {
    const paatosRoute = paatosRoutePart;
    const aineistoTab: LinkTabProps = {
      linkProps: {
        href: {
          pathname: `/yllapito/projekti/[oid]/${paatosRoute}/aineisto`,
          query: { oid: projekti.oid },
        },
      },
      label: <span>Päätös ja liitteenä oleva aineisto</span>,
      disabled: !isProjektiStatusGreaterOrEqualTo(projekti, aineistoStatus),
      id: "aineisto_tab",
    };
    if (julkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA && julkaisu.aineistoMuokkaus) {
      aineistoTab.icon = <UusiSpan />;
      aineistoTab.iconPosition = "end";
      aineistoTab.sx = { "& .MuiTab-iconWrapper": { marginLeft: 2 } };
    }
    const result: LinkTabProps[] = [
      aineistoTab,
      {
        linkProps: {
          href: {
            pathname: `/yllapito/projekti/[oid]/${paatosRoute}/kuulutus`,
            query: { oid: projekti.oid },
          },
        },
        label: <span>Kuulutuksen tiedot</span>,
        disabled: !isProjektiStatusGreaterOrEqualTo(projekti, status),
        id: "kuulutuksentiedot_tab",
      },
    ];

    // Ei muokkaustilassa (LUKU tai MIGROITU) järjestys on käänteinen
    return !julkaisematonPaatos?.muokkausTila || julkaisematonPaatos.muokkausTila === MuokkausTila.MUOKKAUS ? result : result.reverse();
  }, [paatosRoutePart, projekti, aineistoStatus, julkaisu?.tila, julkaisu?.aineistoMuokkaus, status, julkaisematonPaatos?.muokkausTila]);

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
      vaihe={paatosSpecificVaihe[paatosTyyppi]}
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
      {!migroitu ? (
        <>
          <Section noDivider>
            {julkaisu && (
              <KuulutusInfoElement
                julkaisu={julkaisu}
                edellinenVaiheMigroitu={edellisenVaiheenJulkaisu?.tila === KuulutusJulkaisuTila.MIGROITU}
                projekti={projekti}
                vaihe={julkaisematonPaatos}
              />
            )}
            {!epaaktiivinen && julkaisematonPaatos?.muokkausTila === MuokkausTila.MUOKKAUS && (
              <OhjelistaNotification vaihe={paatosSpecificVaihe[paatosTyyppi]}>
                <PaatosOhje projekti={projekti} paatosTyyppi={paatosTyyppi} />
              </OhjelistaNotification>
            )}
            <Tabs value={value}>
              {tabProps.map((tProps, index) => (
                <LinkTab key={index} {...tProps} />
              ))}
            </Tabs>
          </Section>
          {children}
        </>
      ) : (
        <Section noDivider>
          <p>
            Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten
            kuulutuksen tietoja ei ole saatavilla palvelusta.
          </p>
        </Section>
      )}
    </ProjektiPageLayout>
  );
}
