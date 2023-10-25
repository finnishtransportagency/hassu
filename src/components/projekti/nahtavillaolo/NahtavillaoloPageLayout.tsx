import React, { ReactElement, ReactNode, useMemo } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section";
import { Tabs } from "@mui/material";
import { useRouter } from "next/router";
import { UrlObject } from "url";
import { LinkTab, LinkTabProps } from "@components/layout/LinkTab";
import ProjektiConsumer from "../ProjektiConsumer";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { KuulutusJulkaisuTila, MuokkausTila, Status, TilasiirtymaTyyppi, VuorovaikutusKierrosTila } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import UudelleenkuulutaButton from "../UudelleenkuulutaButton";
import { isProjektiStatusGreaterOrEqualTo } from "hassu-common/statusOrder";
import { isPohjoissaameSuunnitelma } from "src/util/isPohjoissaamiSuunnitelma";
import { isAllowedToMoveBackToSuunnitteluvaihe } from "hassu-common/util/operationValidators";
import SiirraButton from "../SiirraButton";
import ToiminnotButton from "../ToiminnotButton";
import { KuulutusInfoElement } from "../KuulutusInfoElement";
import { UusiSpan } from "../UusiSpan";

export default function NahtavillaoloPageLayoutWrapper({ children }: { children?: ReactNode }) {
  return (
    <ProjektiConsumer>{(projekti) => <NahtavillaoloPageLayout projekti={projekti}>{children}</NahtavillaoloPageLayout>}</ProjektiConsumer>
  );
}

function NahtavillaoloPageLayout({ projekti, children }: { projekti: ProjektiLisatiedolla; children?: ReactNode }): ReactElement {
  const router = useRouter();
  const { mutate: reloadProjekti } = useProjekti();

  const tabProps: LinkTabProps[] = useMemo(() => {
    const aineistoTab: LinkTabProps = {
      linkProps: {
        href: {
          pathname: `/yllapito/projekti/[oid]/nahtavillaolo/aineisto`,
          query: { oid: projekti.oid },
        },
      },
      label: <span>Nähtäville asetettavat aineistot</span>,
      disabled: !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO_AINEISTOT),
      id: "aineisto_tab",
    };
    if (
      projekti.nahtavillaoloVaiheJulkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA &&
      projekti.nahtavillaoloVaiheJulkaisu.aineistoMuokkaus
    ) {
      aineistoTab.icon = <UusiSpan />;
      aineistoTab.iconPosition = "end";
      aineistoTab.sx = { "& .MuiTab-iconWrapper": { marginLeft: 2 } };
    }
    const tabs: LinkTabProps[] = [
      aineistoTab,
      {
        linkProps: {
          href: {
            pathname: `/yllapito/projekti/[oid]/nahtavillaolo/kuulutus`,
            query: { oid: projekti.oid },
          },
        },
        label: <span>Kuulutuksen tiedot</span>,
        disabled: !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO),
        id: "kuulutuksentiedot_tab",
      },
    ];
    // LUKU-tilassa järjestys on käänteinen
    return !projekti.nahtavillaoloVaihe?.muokkausTila || projekti.nahtavillaoloVaihe?.muokkausTila === MuokkausTila.MUOKKAUS
      ? tabs
      : tabs.reverse();
  }, [projekti]);

  const value = useMemo(() => {
    const indexOfTab = tabProps.findIndex((tProps) => {
      const url = tProps.linkProps.href as UrlObject;
      return url.pathname === router.pathname;
    });
    return indexOfTab === -1 ? false : indexOfTab;
  }, [router.pathname, tabProps]);

  const nahtavillaolovaiheJulkaisu = projekti.nahtavillaoloVaiheJulkaisu;
  const migroitu = nahtavillaolovaiheJulkaisu?.tila == KuulutusJulkaisuTila.MIGROITU;
  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  const showUudelleenkuulutaButton =
    projekti.nahtavillaoloVaiheJulkaisu?.tila === KuulutusJulkaisuTila.HYVAKSYTTY &&
    projekti.nahtavillaoloVaihe?.muokkausTila === MuokkausTila.LUKU &&
    !projekti.hyvaksymisPaatosVaiheJulkaisu &&
    projekti.nykyinenKayttaja.onYllapitaja;

  const showSiirraButton = projekti.nykyinenKayttaja.onYllapitaja && isAllowedToMoveBackToSuunnitteluvaihe(projekti);

  const contentAsideTitle = useMemo(() => {
    if (!showUudelleenkuulutaButton && !showSiirraButton) {
      return null;
    }
    if (showUudelleenkuulutaButton && !showSiirraButton) {
      return <UudelleenkuulutaButton oid={projekti.oid} tyyppi={TilasiirtymaTyyppi.NAHTAVILLAOLO} reloadProjekti={reloadProjekti} />;
    }
    if (!showUudelleenkuulutaButton && showSiirraButton) {
      return <SiirraButton oid={projekti.oid} reloadProjekti={reloadProjekti} />;
    }
    return <ToiminnotButton oid={projekti.oid} reloadProjekti={reloadProjekti} />;
  }, [projekti.oid, reloadProjekti, showSiirraButton, showUudelleenkuulutaButton]);

  const includeSaamenkielisetOhjeet = isPohjoissaameSuunnitelma(projekti.kielitiedot); // Täytyy muokata huomioimaan muut saamenkielet kun niitä tulee

  return (
    <ProjektiPageLayout title="Kuulutus nähtäville asettamisesta" contentAsideTitle={contentAsideTitle}>
      {!migroitu ? (
        <>
          <Section noDivider>
            {!epaaktiivinen && (
              <>
                {projekti.nahtavillaoloVaiheJulkaisu && (
                  <KuulutusInfoElement
                    julkaisu={projekti.nahtavillaoloVaiheJulkaisu}
                    edellinenVaiheMigroitu={projekti.vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.MIGROITU}
                    projekti={projekti}
                    vaihe={projekti.nahtavillaoloVaihe}
                  />
                )}
                <Notification type={NotificationType.INFO} hideIcon>
                  <div>
                    <h3 className="vayla-small-title">Ohjeet</h3>
                    <ul className="list-disc block pl-5">
                      <li>
                        Lisää nähtäville asetettavat aineistot sekä lausuntopyynnön lisäaineistot, esim. johtokartat, ensimmäiseltä
                        välilehdeltä.
                        {includeSaamenkielisetOhjeet && " Muista liittää aineistoihin myös mahdolliset saamenkieliset aineistot."}
                      </li>
                      <li>Siirry Kuulutuksen tiedot-välilehdelle täyttämään kuulutuksen perustiedot.</li>
                      <li>
                        Anna päivämäärä, jolloin kuulutus julkaistaan Valtion liikenneväylien suunnittelu -palvelun julkisella puolella.
                      </li>
                      <li>Muokkaa tai täydennä halutessasi suunnitelman sisällönkuvausta. Sisällönkuvaus esitetään kuulutuksessa.</li>
                      <li>Valitse kuulutuksessa esitettävät yhteystiedot.</li>
                      {includeSaamenkielisetOhjeet && (
                        <li>
                          Huomioi, että projektin kuulutus ja ilmoitus tulee lähettää käännöstoimistolle käännettäväksi saameksi. Kun
                          kuulutus ja ilmoitus on käännetty, saamenkielinen kuulutus ja ilmoitus ladataan omalta koneelta järjestelmään.
                        </li>
                      )}
                      <li>
                        Lähetä aineistot ja kuulutus suunnitelman nähtäville asettamisesta projektipäällikölle hyväksyttäväksi. Hyväksyntä
                        on hyvä tehdä noin viikko ennen kuulutuksen julkaisua, jotta kunnat saavat tiedon kuulutuksesta ajoissa.
                      </li>
                      <li>
                        Kun projektipäällikkö on hyväksynyt kuulutuksen, lähetä kiinteistönomistajille ilmoitus suunnitelman nähtäville
                        asettamisesta. Hyväksynnän jälkeen löydät tältä sivulta PDF-muotoisen ilmoituksen. Huomioithan, että järjestelmä ei
                        lähetä ilmoitusta kiinteistöomistajille, vaan se tulee lähettää järjestelmän ulkopuolella.
                      </li>
                      <li>
                        Lausuntopyyntö tehdään ja lähetetään lausunnonantajille järjestelmän ulkopuolella käyttäen toimintajärjestelmästä
                        löytyvää mallipohjaa 32T/32R.
                      </li>
                      <li>
                        Lausuntopyyntöön lisättävä linkki suunnitelma-aineistoon löytyy Nähtäville asetettavat aineistot -välilehdeltä.
                      </li>
                      <li>
                        Projekti näytetään nähtävilläoloajan päätyttyä palvelun julkisella puolella ‘Hyväksyntämenettelyssä’ -olevana.
                      </li>
                      <li>
                        Voit hyödyntää lehti-ilmoituksen tilauksessa järjestelmässä luotua kuulutuksen luonnosta. Vähäisessä
                        menettelytavassa ei ole tarve julkaista ilmoitusta lehdessä.
                      </li>
                      <li>
                        Muistathan viedä kuulutuksen, ilmoituksen kuulutuksesta ja kiinteistönomistajille lähetettävän ilmoituksen
                        asianhallintaan.
                      </li>
                    </ul>
                  </div>
                </Notification>
              </>
            )}
            {!migroitu && (
              <Tabs value={value}>
                {tabProps.map((tProps, index) => (
                  <LinkTab key={index} {...tProps} />
                ))}
              </Tabs>
            )}
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
