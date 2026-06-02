import React, { ReactNode, useMemo } from "react";
import { Tabs } from "@mui/material";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import ProjektiPageLayout, { ProjektiPageLayoutContext } from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section2";
import { LinkTab, LinkTabProps } from "@components/layout/LinkTab";
import { UrlObject } from "url";
import { useRouter } from "next/router";
import { OhjelistaNotification } from "../common/OhjelistaNotification";

export function TiedottaminenPageLayout({ children, projekti }: { children?: ReactNode; projekti: ProjektiLisatiedolla }) {
  const router = useRouter();
  const tabProps: LinkTabProps[] = useMemo(() => {
    const tabs: LinkTabProps[] = [
      {
        linkProps: {
          href: {
            pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`,
            query: { oid: projekti.oid },
          },
        },
        label: <span>Kiinteistönomistajat</span>,
        id: "kiinteistonomistajat_tab",
      },
      {
        linkProps: {
          href: {
            pathname: `/yllapito/projekti/[oid]/tiedottaminen/muistuttajat`,
            query: { oid: projekti.oid },
          },
        },
        label: <span>Muistuttajat</span>,
        id: "muistuttajat_tab",
      },
    ];
    return tabs;
  }, [projekti]);

  const value = useMemo(() => {
    const indexOfTab = tabProps.findIndex((tProps) => {
      const url = tProps.linkProps.href as UrlObject;
      return url.pathname === router.pathname;
    });
    return indexOfTab === -1 ? false : indexOfTab;
  }, [router.pathname, tabProps]);

  return (
    <ProjektiPageLayout title="Tiedottaminen">
      <Section noDivider>
        <ProjektiPageLayoutContext.Consumer>
          {({ ohjeetOpen, ohjeetOnClose }) => (
            <OhjelistaNotification open={ohjeetOpen} onClose={ohjeetOnClose}>
              <li>Hae suunnitelma-alueen kiinteistönomistajat karttarajauksen avulla.</li>
              <li>
                Voit piirtää karttarajauksen itse tai tuoda rajauksen tiedostolla. Tiedostolla tuominen on kannattavaa etenkin silloin, jos
                rajaus on iso ja monimutkainen.
              </li>
              <li>Tuotavan tiedoston tulee olla muodossa GeoJSON ja koordinaatistossa ESPG 3067 (ETRS-TM35FIN).</li>
              <li>Karttarajauksia voi olla useita, rajausten ei tarvitse olla kiinni toisissaan.</li>
              <li>
                Karttarajauksen voi poistaa tai sitä voi muokata valitsemalla rajausalueen aktiiviseksi ja raahaamalla hiirellä
                rajausaluetta haluttuun suuntaan.
              </li>
              <li>Hae kiinteistönomistajatiedot uudelleen suunnitelman edetessä.</li>
              <li>
                Muista aina päivittää selaimen sivu, kun haet kiinteistönomistajatietoja uudestaan, esimerkiksi karttarajauksen muokkaamisen
                jälkeen.
              </li>
              <li>
                Kiinteistönomistajien tiedottaminen tapahtuu Suomi.fi viestien kautta. Jos kiinteistönomistajalle on tiedossa sekä osoite
                että henkilötunnus/y-tunnus, hän saa kirjeen Suomi.fi-viestinä. Jos tiedossa on pelkkä osoite, viesti ohjautuu
                automaattisesti paperipostitukseen.
              </li>
              <li>
                Tilanteissa, joissa henkilö omistaa useamman kiinteistön ja niiden rekisteritiedoissa on eroavaisuuksia, henkilö saattaa
                saada useamman kirjeen.
              </li>
              <li>
                Kiinteistö siirtyy Kiinteistönomistajat, joille ei ole yhteystietoja -osiosta Suomi.fi tiedotettaviin, kun sille lisätään
                yhteystieto.
              </li>
              <li>
                Kiinteistönomistajat, joille ei ole yhteystietoja -osiossa näkyvät Väyläviraston lisäksi ne kiinteistönomistajat, joille ei
                löydy osoitetietoja.
              </li>
              <li>
                Voit viedä kiinteistönomistajatiedot Exceliin VIE EXCELIIN-painikkeella esimerkiksi Maanmittauslaitokselle lähetettävää
                osoitetietojen selvityspyyntöä varten.
              </li>
              <li>
                Viethän järjestelmän ulkopuolella muokatun maanomistajaluettelon asianhallintaan, jos et ole tallentanut muokattuja tietoja
                VLS:ään.
              </li>
              <li>
                Muistuttajat-välilehdeltä löytyy VLS:n kautta tunnistautuneena muistutuksen jättäneiden yhteystiedot. Huomaathan tarkistaa
                kaikki muistutukset asianhallinnasta.
              </li>
              <li>
                Katso ohjevideot karttarajauksen tekemisestä OHJEET-sivulta ja Valtion liikenneväylien suunnittelu- järjestelmän käyttöohje
                (Tiedottaminen – Karttarajaus).
              </li>
            </OhjelistaNotification>
          )}
        </ProjektiPageLayoutContext.Consumer>
        <Tabs value={value}>
          {tabProps.map((tProps, index) => (
            <LinkTab key={index} {...tProps} />
          ))}
        </Tabs>
      </Section>
      {children}
    </ProjektiPageLayout>
  );
}
