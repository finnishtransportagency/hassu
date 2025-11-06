import ExternalLinkkiLista from "@components/kansalainen/tietoaPalvelusta/ExternalLinkkiLista";
import TietoaPalvelustaPageLayout from "@components/kansalainen/tietoaPalvelusta/TietoaPalvelustaPageLayout";
import ContentSpacer from "@components/layout/ContentSpacer";
import StyledLink from "@components/StyledLink";
import { isEvkAktivoitu } from "common/util/isEvkAktivoitu";
import Trans from "next-translate/Trans";
import useTranslation from "next-translate/useTranslation";
import React from "react";

export default function TietoaPalvelustaSivu() {
  const { t } = useTranslation("tietoa-palvelusta/tietoa-palvelusta");

  return (
    <TietoaPalvelustaPageLayout>
      <ContentSpacer as={"section"} gap={8}>
        <h1 id="mainPageContent">{t("paaotsikko")}</h1>
        <p className="vayla-label">{t("ingressi")}</p>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("verkkopalvelun-sisalto.otsikko")}</h2>
          <p>{t("verkkopalvelun-sisalto.kappale1")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("etusivu.otsikko")}</h3>
          <p>{t("etusivu.kappale1")}</p>
          <Trans
            i18nKey="tietoa-palvelusta/tietoa-palvelusta:etusivu.kappale2"
            components={{
              p: <p />,
              a: <StyledLink href="/tietoa-palvelusta/tietoa-suunnittelusta" />,
            }}
            values={{ tietoaSuunnittelustaLinkki: t("tietoa-palvelusta/navigation:polkujen-nimet.tietoa-suunnittelusta") }}
          />
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("yksittaisen-suunnitelman-sivu.otsikko")}</h3>
          <p>{t("yksittaisen-suunnitelman-sivu.kappale1")}</p>
          <ExternalLinkkiLista
            linkkiTiedot={[
              {
                href: t(`yksittaisen-suunnitelman-sivu.linkki1${isEvkAktivoitu() ? "_evk" : ""}.href`),
                teksti: t(`yksittaisen-suunnitelman-sivu.linkki1${isEvkAktivoitu() ? "_evk" : ""}.teksti`),
              },
            ]}
          />
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("tietoa-suunnittelusta.otsikko")}</h3>
          <p>{t("tietoa-suunnittelusta.kappale1")}</p>
          <p>{t("tietoa-suunnittelusta.kappale2")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("immateriaalioikeudet.otsikko")}</h2>
          <p>{t("immateriaalioikeudet.kappale1")}</p>
          <p>{t("immateriaalioikeudet.kappale2")}</p>
          <p>{t("immateriaalioikeudet.kappale3")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("nain-kasittelemme-henkilotietojasi.otsikko")}</h2>
          <p>{t("nain-kasittelemme-henkilotietojasi.kappale1")}</p>
          <p>{t("nain-kasittelemme-henkilotietojasi.kappale2")}</p>
          <p>{t("nain-kasittelemme-henkilotietojasi.kappale3")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-small-title">{t("lisatietoja-henkilotietojen-kasittelysta.otsikko")}</h3>
          <ExternalLinkkiLista
            linkkiTiedot={[
              {
                href: t("lisatietoja-henkilotietojen-kasittelysta.linkki1.href"),
                teksti: t("lisatietoja-henkilotietojen-kasittelysta.linkki1.teksti"),
              },
              {
                href: t(`lisatietoja-henkilotietojen-kasittelysta.linkki2${isEvkAktivoitu() ? "_evk" : ""}.href`),
                teksti: t(`lisatietoja-henkilotietojen-kasittelysta.linkki2${isEvkAktivoitu() ? "_evk" : ""}.teksti`),
              },
            ]}
          />
        </ContentSpacer>
      </ContentSpacer>
    </TietoaPalvelustaPageLayout>
  );
}
