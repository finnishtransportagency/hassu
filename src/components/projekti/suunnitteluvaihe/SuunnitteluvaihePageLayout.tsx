import React, { ReactElement, useMemo, ReactNode } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { Tabs } from "@mui/material";
import { useRouter } from "next/router";
import { UrlObject } from "url";
import { ParsedUrlQueryInput } from "querystring";
import { LinkTab, LinkTabProps } from "@components/layout/LinkTab";
import ProjektiConsumer from "../ProjektiConsumer";

export default function SuunnitteluPageLayoutWrapper({ children }: { children?: ReactNode }) {
  return (
    <ProjektiConsumer>
      {(projekti) => (
        <SuunnitteluPageLayout projektiOid={projekti.oid} projekti={projekti} disableTabs={!projekti}>
          {children}
        </SuunnitteluPageLayout>
      )}
    </ProjektiConsumer>
  );
}

function SuunnitteluPageLayout({
  projektiOid,
  projekti,
  disableTabs,
  children,
}: {
  projektiOid: string;
  projekti: ProjektiLisatiedolla;
  disableTabs?: boolean;
  children?: ReactNode;
}): ReactElement {
  const router = useRouter();
  const vuorovaikutusKierrosNumerot = useMemo(
    () => projekti?.suunnitteluVaihe?.vuorovaikutukset?.map((vuorovaikutus) => vuorovaikutus.vuorovaikutusNumero) || [1],
    [projekti?.suunnitteluVaihe?.vuorovaikutukset]
  );

  const tabProps: LinkTabProps[] = useMemo(() => {
    const vuorovaikutusTabs = vuorovaikutusKierrosNumerot.map<LinkTabProps>((kierrosId) => {
      return {
        linkProps: {
          href: {
            pathname: `/yllapito/projekti/[oid]/suunnittelu/vuorovaikuttaminen/[kierrosId]`,
            query: { oid: projektiOid, kierrosId: kierrosId.toString() },
          },
        },
        label: `${kierrosId}. vuorovaikuttaminen`,
        disabled: disableTabs,
        id: `${kierrosId}_vuorovaikuttaminen_tab`,
      };
    });
    return [
      {
        linkProps: {
          href: {
            pathname: `/yllapito/projekti/[oid]/suunnittelu`,
            query: { oid: projektiOid },
          },
        },
        label: "Suunnitteluvaiheen perustiedot",
        disabled: disableTabs,
        id: "perustiedot_tab",
      },
      ...vuorovaikutusTabs,
    ];
  }, [projektiOid, vuorovaikutusKierrosNumerot, disableTabs]);

  const value = useMemo(() => {
    const indexOfTab = tabProps.findIndex((tProps) => {
      const url = tProps.linkProps.href as UrlObject;
      return url.pathname === router.pathname && (url.query as ParsedUrlQueryInput).kierrosId === router.query.kierrosId;
    });
    return indexOfTab === -1 ? false : indexOfTab;
  }, [router.pathname, router.query.kierrosId, tabProps]);

  return (
    <ProjektiPageLayout title="Suunnittelu">
      <Section noDivider>
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
