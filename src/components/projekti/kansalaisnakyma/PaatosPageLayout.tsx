import React, { FunctionComponent, ReactNode, useMemo, VoidFunctionComponent } from "react";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import { Tabs } from "@mui/material";
import { LinkTab, LinkTabProps } from "@components/layout/LinkTab";
import { useRouter } from "next/router";
import { UrlObject } from "url";
import { ProjektiJulkinen, Status } from "@services/api";
import useTranslation from "next-translate/useTranslation";

const PaatosPageLayout: FunctionComponent<{ pageTitle: string; saameContent?: ReactNode; children?: React.ReactNode }> = ({
  children,
  pageTitle,
  saameContent,
}) => {
  const { data: projekti } = useProjektiJulkinen();

  if (!projekti) {
    return <></>;
  }

  return (
    <ProjektiJulkinenPageLayout
      selectedStep={Status.HYVAKSYTTY}
      title={pageTitle}
      saameContent={saameContent}
      vahainenMenettely={projekti?.vahainenMenettely}
    >
      <PaatosPageTabs projekti={projekti} />
      {children}
    </ProjektiJulkinenPageLayout>
  );
};

const PaatosPageTabs: VoidFunctionComponent<{ projekti: ProjektiJulkinen }> = ({ projekti }) => {
  const router = useRouter();
  const { t } = useTranslation("paatos");

  const tabProps: LinkTabProps[] = useMemo(() => {
    const result: LinkTabProps[] = [
      {
        linkProps: {
          href: {
            pathname: `/suunnitelma/[oid]/hyvaksymispaatos`,
            query: { oid: projekti?.oid },
          },
        },
        label: t("tabi-tekstit.hyvaksymispaatos"),
        id: "hyvaksymispaatos_tab",
      },
      {
        linkProps: {
          href: {
            pathname: `/suunnitelma/[oid]/jatkopaatos1`,
            query: { oid: projekti?.oid },
          },
        },
        label: t("tabi-tekstit.jatkopaatos", { nro: 1 }),
        id: "jatkopaatos1_tab",
      },
      {
        linkProps: {
          href: {
            pathname: `/suunnitelma/[oid]/jatkopaatos2`,
            query: { oid: projekti?.oid },
          },
        },
        label: t("tabi-tekstit.jatkopaatos", { nro: 2 }),
        id: "jatkopaatos2_tab",
        disabled: !projekti.jatkoPaatos2Vaihe,
      },
    ];

    return result;
  }, [projekti?.oid, projekti.jatkoPaatos2Vaihe, t]);

  const value = useMemo(() => {
    const indexOfTab = tabProps.findIndex((tProps) => {
      const url = tProps.linkProps.href as UrlObject;
      return url.pathname === router.pathname;
    });
    return indexOfTab === -1 ? false : indexOfTab;
  }, [router.pathname, tabProps]);
  if (!projekti.jatkoPaatos1Vaihe) {
    return <></>;
  }

  return (
    <Tabs value={value}>
      {tabProps
        .filter((t) => !t.disabled)
        .map((tProps, index) => (
          <LinkTab key={index} {...tProps} />
        ))}
    </Tabs>
  );
};

export default PaatosPageLayout;
