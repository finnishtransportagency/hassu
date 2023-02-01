import ExternalLinkkiLista from "@components/kansalainen/tietoaPalvelusta/ExternalLinkkiLista";
import TietoaPalvelustaPageLayout from "@components/kansalainen/tietoaPalvelusta/TietoaPalvelustaPageLayout";
import ContentSpacer from "@components/layout/ContentSpacer";
import { ExternalStyledLink } from "@components/StyledLink";
import Trans from "next-translate/Trans";
import useTranslation from "next-translate/useTranslation";
import React from "react";

export default function TietoaPalvelustaSivu() {
  const { t } = useTranslation("tietoa-palvelusta/tietoa-suunnittelusta");

  return (
    <TietoaPalvelustaPageLayout>
      <ContentSpacer as={"section"} gap={8}>
        <h1>{t("paaotsikko")}</h1>
        <p>{t("ingressi")}</p>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("suunnittelun-vaiheet.otsikko")}</h3>
          <p>{t("suunnittelun-vaiheet.kappale1")}</p>
          <p>{t("suunnittelun-vaiheet.kappale2")}</p>
          <ol>
            <li>
              {"1) "}
              {t("suunnittelun-vaiheet.vaihe.aloituskuulutus")}
            </li>
            <li>
              {"2) "}
              {t("suunnittelun-vaiheet.vaihe.suunnitteluvaihe")}
            </li>
            <li>
              {"3) "}
              {t("suunnittelun-vaiheet.vaihe.suunnitelmat-nahtavilla")}
            </li>
            <li>
              {"4) "}
              {t("suunnittelun-vaiheet.vaihe.hyvaksymismenettelyssa")}
            </li>
            <li>
              {"5) "}
              {t("suunnittelun-vaiheet.vaihe.hyvaksytty")}
            </li>
          </ol>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("suunnitteluhankkeiden-kulku.otsikko")}</h3>
          <p>{t("suunnitteluhankkeiden-kulku.kappale1")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h5 className="vayla-smallest-title">{t("suunnitteluhankkeiden-kulku.aloituskuulutus.otsikko")}</h5>
          <p>{t("suunnitteluhankkeiden-kulku.aloituskuulutus.kappale1")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h5 className="vayla-smallest-title">{t("suunnitteluhankkeiden-kulku.suunnitteluvaihe.otsikko")}</h5>
          <p>{t("suunnitteluhankkeiden-kulku.suunnitteluvaihe.kappale1")}</p>
          <p>{t("suunnitteluhankkeiden-kulku.suunnitteluvaihe.kappale2")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h5 className="vayla-smallest-title">{t("suunnitteluhankkeiden-kulku.suunnitelmat-nahtavilla.otsikko")}</h5>
          <p>{t("suunnitteluhankkeiden-kulku.suunnitelmat-nahtavilla.kappale1")}</p>
          <p>{t("suunnitteluhankkeiden-kulku.suunnitelmat-nahtavilla.kappale2")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h5 className="vayla-smallest-title">{t("suunnitteluhankkeiden-kulku.hyvaksymismenettelyssa.otsikko")}</h5>
          <p>{t("suunnitteluhankkeiden-kulku.hyvaksymismenettelyssa.kappale1")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h5 className="vayla-smallest-title">{t("suunnitteluhankkeiden-kulku.hyvaksytty.otsikko")}</h5>
          <p>{t("suunnitteluhankkeiden-kulku.hyvaksytty.kappale1")}</p>
          <p>{t("suunnitteluhankkeiden-kulku.hyvaksytty.kappale2")}</p>
          <p>{t("suunnitteluhankkeiden-kulku.hyvaksytty.kappale3")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("kuulutussivut.otsikko")}</h3>
          <p>{t("kuulutussivut.kappale1")}</p>
          <p>{t("kuulutussivut.kappale2")}</p>
          <ExternalLinkkiLista
            linkkiTiedot={[
              {
                href: t("kuulutussivut.linkki1.href"),
                teksti: t("kuulutussivut.linkki1.teksti"),
              },
              {
                href: t("kuulutussivut.linkki2.href"),
                teksti: t("kuulutussivut.linkki2.teksti"),
              },
            ]}
          />
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("lisatietoa-ratojen-ja-maanteiden-suunnittelusta.otsikko")}</h3>
          <Trans
            i18nKey="tietoa-palvelusta/tietoa-suunnittelusta:lisatietoa-ratojen-ja-maanteiden-suunnittelusta.kappale1"
            components={{
              p: <p />,
              a: <ExternalStyledLink href={t("lisatietoa-ratojen-ja-maanteiden-suunnittelusta.linkki1.href")} />,
            }}
            values={{ vaylaVirastonVerkkosivu: t("lisatietoa-ratojen-ja-maanteiden-suunnittelusta.linkki1.teksti") }}
          />
        </ContentSpacer>
      </ContentSpacer>
    </TietoaPalvelustaPageLayout>
  );
}
