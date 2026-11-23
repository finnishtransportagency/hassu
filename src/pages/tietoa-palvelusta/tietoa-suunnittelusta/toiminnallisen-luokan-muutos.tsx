// Contains code generated or recommended by Amazon Q
import ExternalLinkkiLista from "@components/kansalainen/tietoaPalvelusta/ExternalLinkkiLista";
import TietoaPalvelustaPageLayout from "@components/kansalainen/tietoaPalvelusta/TietoaPalvelustaPageLayout";
import ContentSpacer from "@components/layout/ContentSpacer";
import useTranslation from "next-translate/useTranslation";
import React from "react";
import { GetServerSideProps } from "next";

export default function ToiminnallisenLuokanMuutosSivu() {
  const { t } = useTranslation("tietoa-palvelusta/toiminnallisen-luokan-muutos");

  return (
    <TietoaPalvelustaPageLayout>
      <ContentSpacer as={"section"} gap={8}>
        <h1 id="mainPageContent">{t("paaotsikko")}</h1>
        <p className="vayla-label">{t("ingressi")}</p>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("vaiheet.otsikko")}</h2>
          <p>{t("vaiheet.kappale1")}</p>
          <ol>
            <li>
              {"1) "}
              {t("vaiheet.vaihe.ehdotus-nahtavilla")}
            </li>
            <li>
              {"2) "}
              {t("vaiheet.vaihe.hyvaksyminen")}
            </li>
          </ol>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("ehdotus-nahtavilla.otsikko")}</h3>
          <p>{t("ehdotus-nahtavilla.kappale1")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("hyvaksymismenettelyssa.otsikko")}</h3>
          <p>{t("hyvaksymismenettelyssa.kappale1")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("hyvaksytty.otsikko")}</h3>
          <p>{t("hyvaksytty.kappale1")}</p>
          <p>{t("hyvaksytty.kappale2")}</p>
          <p>{t("hyvaksytty.kappale3")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("kuulutussivut.otsikko")}</h2>
          <p>{t("kuulutussivut.kappale1")}</p>
          <p>{t("kuulutussivut.kappale2")}</p>
          <ExternalLinkkiLista
            linkkiTiedot={[
              { href: t("kuulutussivut.linkki1.href"), teksti: t("kuulutussivut.linkki1.teksti") },
              { href: t("kuulutussivut.linkki2.href"), teksti: t("kuulutussivut.linkki2.teksti") },
            ]}
          />
        </ContentSpacer>
      </ContentSpacer>
    </TietoaPalvelustaPageLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
