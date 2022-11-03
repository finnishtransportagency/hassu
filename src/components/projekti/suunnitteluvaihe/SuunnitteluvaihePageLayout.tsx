import React, { ReactElement, FC, useMemo, ReactNode } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section";
import { useProjekti } from "src/hooks/useProjekti";
import { TabProps, Tabs, Tab } from "@mui/material";
import { useRouter } from "next/router";
import Link, { LinkProps } from "next/link";
import { UrlObject } from "url";
import { ParsedUrlQueryInput } from "querystring";

export default function SuunnitteluPageLayoutWrapper({ children }: { children?: ReactNode }) {
  const { data: projekti } = useProjekti();

  const vuorovaikutusKierrosNumerot = useMemo(
    () => projekti?.suunnitteluVaihe?.vuorovaikutukset?.map((vuorovaikutus) => vuorovaikutus.vuorovaikutusNumero) || [1],
    [projekti?.suunnitteluVaihe?.vuorovaikutukset]
  );

  if (!projekti) {
    return <></>;
  }

  return (
    <SuunnitteluPageLayout projektiOid={projekti.oid} vuorovaikutusKierrosNumerot={vuorovaikutusKierrosNumerot} disableTabs={!projekti}>
      {children}
    </SuunnitteluPageLayout>
  );
}

function SuunnitteluPageLayout({
  projektiOid,
  vuorovaikutusKierrosNumerot,
  disableTabs,
  children,
}: {
  projektiOid: string;
  vuorovaikutusKierrosNumerot: number[];
  disableTabs?: boolean;
  children?: ReactNode;
}): ReactElement {
  const router = useRouter();

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

  const value = useMemo(
    () =>
      tabProps.findIndex((tProps) => {
        const url = tProps.linkProps.href as UrlObject;
        return url.pathname === router.pathname && (url.query as ParsedUrlQueryInput).kierrosId === router.query.kierrosId;
      }),
    [router.pathname, router.query.kierrosId, tabProps]
  );

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

type LinkTabProps = TabProps & { linkProps: LinkProps };

const LinkTab: FC<LinkTabProps> = ({ linkProps, ...tabProps }) => (
  <Link {...linkProps} passHref>
    <Tab {...tabProps} />
  </Link>
);
