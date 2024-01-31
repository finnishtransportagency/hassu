import React, { ReactNode, useMemo } from "react";
import { Tabs } from "@mui/material";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section2";
import { LinkTab, LinkTabProps } from "@components/layout/LinkTab";
import { UrlObject } from "url";
import { useRouter } from "next/router";

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
