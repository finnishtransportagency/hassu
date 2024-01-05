import React, { ReactElement, ReactNode, useCallback, useMemo, useState } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section";
import { Tabs } from "@mui/material";
import { useRouter } from "next/router";
import { UrlObject } from "url";
import { LinkTab, LinkTabProps } from "@components/layout/LinkTab";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import ProjektiConsumer from "./ProjektiConsumer";
import { OhjelistaNotification } from "./common/OhjelistaNotification";
import PaivitaVelhoTiedotButton from "./PaivitaVelhoTiedotButton";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";

export default function ProjektinTiedotPageLayoutWrapper({ children }: { children?: ReactNode }) {
  return (
    <ProjektiConsumer>
      {(projekti) => <ProjektinTiedotPageLayout projekti={projekti}>{children}</ProjektinTiedotPageLayout>}
    </ProjektiConsumer>
  );
}

function ProjektinTiedotPageLayout({ projekti, children }: { projekti: ProjektiLisatiedolla; children?: ReactNode }): ReactElement {
  const router = useRouter();
  const { mutate: reloadProjekti } = useProjekti();

  const tabProps: LinkTabProps[] = useMemo(() => {
    const tabs: LinkTabProps[] = [
      {
        linkProps: {
          href: {
            pathname: `/yllapito/projekti/[oid]`,
            query: { oid: projekti.oid },
          },
        },
        label: <span>Projektin perustiedot</span>,
        id: "projektin_perustiedot_tab",
      },
      {
        linkProps: {
          href: {
            pathname: `/yllapito/projekti/[oid]/kiinteistonomistajat`,
            query: { oid: projekti.oid },
          },
        },
        label: <span>Kiinteistönomistajien tiedot</span>,
        id: "kiinteistonomistajien_tiedot_tab",
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

  const [ohjeetOpen, ohjeetSetOpen] = useState(() => {
    const savedValue = localStorage.getItem("perustietojenOhjeet");
    const isOpen = savedValue ? savedValue.toLowerCase() !== "false" : true;
    return isOpen;
  });
  const ohjeetOnClose = useCallback(() => {
    ohjeetSetOpen(false);
    localStorage.setItem("perustietojenOhjeet", "false");
  }, []);
  const ohjeetOnOpen = useCallback(() => {
    ohjeetSetOpen(true);
    localStorage.setItem("perustietojenOhjeet", "true");
  }, []);

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  return (
    <ProjektiPageLayout
      title="Projektin tiedot"
      contentAsideTitle={!epaaktiivinen && <PaivitaVelhoTiedotButton projektiOid={projekti.oid} reloadProjekti={reloadProjekti} />}
      showInfo={!ohjeetOpen}
      onOpenInfo={ohjeetOnOpen}
    >
      <Section noDivider>
        <OhjelistaNotification open={ohjeetOpen} onClose={ohjeetOnClose}>
          <li>Osa projektin perustiedoista on tuotu Projektivelhosta. Jos näissä tiedoissa on virhe, tee muutos Projektivelhoon.</li>
          <li>Puuttuvat tiedot pitää olla täytettynä ennen aloituskuulutuksen tekemistä.</li>
          <li>
            Jos tallennettuihin perustietoihin tehdään muutoksia, ne eivät vaikuta jo tehtyihin kuulutuksiin tai projektin aiempiin
            vaiheisiin.
          </li>
          <li>
            Huomaathan, että Projektin kuulutusten kielet-, Suunnittelusopimus- ja EU-rahoitus -valintaan voi vaikuttaa aloituskuulutuksen
            hyväksymiseen saakka, jonka jälkeen valinta lukittuu. Suunnittelusopimuksellisissa suunnitelmissa kunnan edustajaa on
            mahdollista vaihtaa prosessin aikana.
          </li>
        </OhjelistaNotification>
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
