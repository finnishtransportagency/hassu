import ExternalLinkkiLista from "@components/kansalainen/tietoaPalvelusta/ExternalLinkkiLista";
import TietoaPalvelustaPageLayout from "@components/kansalainen/tietoaPalvelusta/TietoaPalvelustaPageLayout";
import ContentSpacer from "@components/layout/ContentSpacer";
import useTranslation from "next-translate/useTranslation";
import React from "react";

export default function TietoaPalvelustaSivu() {
  const { t } = useTranslation("tietoa-palvelusta/tietoa-suomifi-palvelusta");

  return (
    <TietoaPalvelustaPageLayout>
      <ContentSpacer as={"section"} gap={8}>
        <h1 id="mainPageContent">{t("paaotsikko")}</h1>
        <p className="vayla-label">{t("ingressi")}</p>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("tietoa-suomifista.otsikko")}</h2>
          <p>{t("tietoa-suomifista.kappale1")}</p>
          <p>{t("tietoa-suomifista.kappale2")}</p>
          <p>{t("tietoa-suomifista.kappale3")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("lisaa-suomifista.otsikko")}</h2>
          <ExternalLinkkiLista
            linkkiTiedot={[
              {
                href: t("lisaa-suomifista.linkki1.href"),
                teksti: t("lisaa-suomifista.linkki1.teksti"),
              },
              {
                href: t("lisaa-suomifista.linkki2.href"),
                teksti: t("lisaa-suomifista.linkki2.teksti"),
              },
              {
                href: t("lisaa-suomifista.linkki3.href"),
                teksti: t("lisaa-suomifista.linkki3.teksti"),
              },
            ]}
          />
        </ContentSpacer>
      </ContentSpacer>
    </TietoaPalvelustaPageLayout>
  );
}
