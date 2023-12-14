import React, { ReactElement, ReactNode, useCallback, useMemo, useState } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section";
import { Tabs } from "@mui/material";
import { useRouter } from "next/router";
import { UrlObject } from "url";
import { LinkTab, LinkTabProps } from "@components/layout/LinkTab";
import ProjektiConsumer from "../ProjektiConsumer";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { KuulutusJulkaisuTila, Vaihe } from "@services/api";
import { UusiSpan } from "../UusiSpan";
import { OhjelistaNotification } from "../common/OhjelistaNotification";

export default function LausuntoPyynnotPageLayoutWrapper({ children }: { children?: ReactNode }) {
  return (
    <ProjektiConsumer>
      {(projekti) => <LausuntoPyynnotPageLayout projekti={projekti}>{children}</LausuntoPyynnotPageLayout>}
    </ProjektiConsumer>
  );
}

function LausuntoPyynnotPageLayout({ projekti, children }: { projekti: ProjektiLisatiedolla; children?: ReactNode }): ReactElement {
  const router = useRouter();
  const tabProps: LinkTabProps[] = useMemo(() => {
    const lausuntoPyynnotTab: LinkTabProps = {
      linkProps: {
        href: {
          pathname: `/yllapito/projekti/[oid]/nahtavillaolo/lausuntopyynto/lausuntopyynto`,
          query: { oid: projekti.oid },
        },
      },
      label: <span>Lausuntopyyntö</span>,
      id: "lausuntopyynto_tab",
    };
    const lausuntoPyynnonTaydennyksetTab: LinkTabProps = {
      linkProps: {
        href: {
          pathname: `/yllapito/projekti/[oid]/nahtavillaolo/lausuntopyynto/lausuntopyynnon-taydennys`,
          query: { oid: projekti.oid },
        },
      },
      label: <span>Lausuntopyynnön täydennys</span>,
      id: "lausuntopyynnon_taydennys_tab",
    };
    if (
      projekti.nahtavillaoloVaiheJulkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA &&
      projekti.nahtavillaoloVaiheJulkaisu.aineistoMuokkaus
    ) {
      lausuntoPyynnonTaydennyksetTab.icon = <UusiSpan />;
      lausuntoPyynnonTaydennyksetTab.iconPosition = "end";
      lausuntoPyynnonTaydennyksetTab.sx = { "& .MuiTab-iconWrapper": { marginLeft: 2 } };
    }
    return [lausuntoPyynnotTab, lausuntoPyynnonTaydennyksetTab];
  }, [projekti]);

  const value = useMemo(() => {
    const indexOfTab = tabProps.findIndex((tProps) => {
      const url = tProps.linkProps.href as UrlObject;
      return url.pathname === router.pathname;
    });
    return indexOfTab === -1 ? false : indexOfTab;
  }, [router.pathname, tabProps]);

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);
  const nahtavillaolovaiheJulkaisu = projekti.nahtavillaoloVaiheJulkaisu;
  const migroitu = nahtavillaolovaiheJulkaisu?.tila == KuulutusJulkaisuTila.MIGROITU;
  const [ohjeetOpen, ohjeetSetOpen] = useState(() => {
    const savedValue = localStorage.getItem("lausuntoPyyntojenOhjeet");
    const isOpen = savedValue ? savedValue.toLowerCase() !== "false" : true;
    return isOpen;
  });
  const ohjeetOnClose = useCallback(() => {
    ohjeetSetOpen(false);
    localStorage.setItem("lausuntoPyyntojenOhjeet", "false");
  }, []);
  const ohjeetOnOpen = useCallback(() => {
    ohjeetSetOpen(true);
    localStorage.setItem("lausuntoPyyntojenOhjeet", "true");
  }, []);

  return (
    <ProjektiPageLayout
      vaihe={Vaihe.NAHTAVILLAOLO}
      title="Lausuntopyyntöjen aineistolinkit"
      showInfo={!ohjeetOpen}
      onOpenInfo={ohjeetOnOpen}
    >
      {!migroitu ? (
        <>
          <Section noDivider>
            {!epaaktiivinen && (
              <>
                <OhjelistaNotification onClose={ohjeetOnClose} open={ohjeetOpen}>
                  <li>
                    Tällä sivulla luodaan lausuntopyyntöihin liitettävät aineistolinkit. Lausuntopyyntöjä ei laadita/lähetetä tämän
                    järjestelmän kautta.
                  </li>
                  <li>Lausuntopyynnöt tehdään käyttämällä alla olevia mallipohjia. Mallipohjat löytyvät myös toimintajärjestelmästä.</li>
                  <li>
                    Tarkista aluksi, että suunnitelman nähtäville asetettavat aineistot on tuotu järjestelmään kohdassa
                    ”nähtävilläolovaihe”.
                  </li>
                  <li>Luotava aineistolinkki sisältää aina nähtäville asetetun aineiston. </li>
                  <li>Tarvittaessa voit luoda eri lausunnonantajille suunnattuja linkkejä eri lisäaineistoilla.</li>
                  <li>
                    Linkit ovat voimassa käyttäjän määrittelemän ajan, mutta ne tulee olla voimassa vähintään suunnitelman
                    nähtävilläoloajan. Tarvittaessa linkkien voimassaoloaikaa voi käydä myöhemmin jatkamassa.
                  </li>
                  <li>Liitä tällä sivulla tekemäsi linkit lausuntopyyntöihin.</li>
                  <li>
                    Lausuntopyynnöt allekirjoitetaan ja lähetetään vastaanottajille tämän järjestelmän ulkopuolella. Väyläviraston
                    hankkeissa lausuntopyynnöt allekirjoitetaan ja lähetetään asianhallinnan kautta. ELY-keskusten hankkeissa allekirjoitus
                    tapahtuu asianhallintajärjestelmän kautta ja lausuntopyynnöt lähetetään vastaanottajille sähköpostitse.
                  </li>
                  <li>
                    Nähtävilläoloajan päätyttyä kunnille toimitetaan lausuntopyynnön täydennys, jonka yhteydessä kuntiin toimitetaan myös
                    saapuneet muistutukset. Lausuntopyynnön täydennys toimitetaan vaikka yhtään muistutusta ei oli tullut.
                  </li>
                  <li>Lausuntopyyntöjen täydennyksiä ei laadita/lähetetä tämän järjestelmän kautta.</li>
                  <li>
                    Lausuntopyyntöjen täydennykset tehdään käyttämällä alla olevaa mallipohjaa. Mallipohja löytyy myös
                    toimintajärjestelmästä.
                  </li>
                  <li>Kunnille luodaan omat, heitä koskevat muistutukset sisältävät linkit välilehdellä Lausuntopyynnön täydentäminen.</li>
                  <li>
                    Hae muistutukset asianhallinnasta omalle koneelle ja tuo ne järjestelmään oikean kunnan kohdalle. Voit tarvittaessa
                    lisätä saman muistutuksen useamman kunnan linkkiin.
                  </li>
                  <li>Liitä tekemäsi muistutusaineiston linkit lausuntopyyntöjen täydennyksiin.</li>
                  <li>
                    Lausuntopyyntöjen täydennykset allekirjoitetaan ja lähetetään vastaanottajille tämän järjestelmän ulkopuolella.
                    Väyläviraston hankkeissa lausuntopyynnöt allekirjoitetaan ja lähetetään asianhallinnan kautta. ELY-keskusten hankkeissa
                    allekirjoitus tapahtuu asianhallintajärjestelmän kautta ja lähettäminen vastaanottajille sähköpostitse.
                  </li>
                </OhjelistaNotification>
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
            lausuntopyyntöjen aineistolinkkien tietoja ei ole saatavilla palvelusta.
          </p>
        </Section>
      )}
    </ProjektiPageLayout>
  );
}
