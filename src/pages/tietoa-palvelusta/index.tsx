import TietoaPalvelustaPageLayout from "@components/kansalainen/tietoaPalvelusta/TietoaPalvelustaPageLayout";
import ContentSpacer from "@components/layout/ContentSpacer";
import StyledLink, { ExternalStyledLink } from "@components/StyledLink";
import { styled } from "@mui/material";
import Trans from "next-translate/Trans";
import useTranslation from "next-translate/useTranslation";
import React from "react";

interface LinkkiTiedot {
  href: string;
  teksti: string;
}

export default function TietoaPalvelustaSivu() {
  const { t } = useTranslation("tietoa-palvelusta/tietoa-palvelusta");

  return (
    <TietoaPalvelustaPageLayout>
      <ContentSpacer as={"section"} gap={8}>
        <h1>{t("paaotsikko")}</h1>
        <p>{t("ingressi")}</p>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("verkkopalvelun-sisalto.otsikko")}</h2>
          <p>{t("verkkopalvelun-sisalto.kappale1")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <p className="vayla-subtitle">{t("etusivu.otsikko")}</p>
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
          <p className="vayla-subtitle">{t("yksittaisen-suunnitelman-sivu.otsikko")}</p>
          <p>{t("yksittaisen-suunnitelman-sivu.kappale1")}</p>
          <LinkkiLista
            linkkiTiedot={[
              { href: t("yksittaisen-suunnitelman-sivu.linkki1.href"), teksti: t("yksittaisen-suunnitelman-sivu.linkki1.teksti") },
            ]}
          />
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <p className="vayla-subtitle">{t("tietoa-suunnittelusta.otsikko")}</p>
          <p>{t("tietoa-suunnittelusta.kappale1")}</p>
          <p>{t("tietoa-suunnittelusta.kappale2")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <p className="vayla-subtitle">{t("immateriaalioikeudet.otsikko")}</p>
          <p>{t("immateriaalioikeudet.kappale1")}</p>
          <p>{t("immateriaalioikeudet.kappale2")}</p>
          <p>{t("immateriaalioikeudet.kappale3")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <p className="vayla-subtitle">{t("nain-kasittelemme-henkilotietojasi.otsikko")}</p>
          <p>{t("nain-kasittelemme-henkilotietojasi.kappale1")}</p>
          <p>{t("nain-kasittelemme-henkilotietojasi.kappale2")}</p>
          <p>{t("nain-kasittelemme-henkilotietojasi.kappale3")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <p className="vayla-subtitle">{t("lisatietoja-henkilotietojen-kasittelysta.otsikko")}</p>
          <LinkkiLista
            linkkiTiedot={[
              {
                href: t("lisatietoja-henkilotietojen-kasittelysta.linkki1.href"),
                teksti: t("lisatietoja-henkilotietojen-kasittelysta.linkki1.teksti"),
              },
              {
                href: t("lisatietoja-henkilotietojen-kasittelysta.linkki2.href"),
                teksti: t("lisatietoja-henkilotietojen-kasittelysta.linkki2.teksti"),
              },
            ]}
          />
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <p className="vayla-subtitle">{t("tietosuojasta-yleisesti.otsikko")}</p>
          <LinkkiLista
            linkkiTiedot={[
              {
                href: t("tietosuojasta-yleisesti.linkki1.href"),
                teksti: t("tietosuojasta-yleisesti.linkki1.teksti"),
              },
              {
                href: t("tietosuojasta-yleisesti.linkki2.href"),
                teksti: t("tietosuojasta-yleisesti.linkki2.teksti"),
              },
            ]}
          />
        </ContentSpacer>
      </ContentSpacer>
    </TietoaPalvelustaPageLayout>
  );
}

const LinkkiLista = styled(
  ({
    linkkiTiedot,
    ...props
  }: React.DetailedHTMLProps<React.HTMLAttributes<HTMLUListElement>, HTMLUListElement> & { linkkiTiedot: LinkkiTiedot[] }) => (
    <ul {...props}>
      {linkkiTiedot.map(({ href, teksti }) => (
        <li key={teksti}>
          <ExternalStyledLink href={href}>{teksti}</ExternalStyledLink>
        </li>
      ))}
    </ul>
  )
)({ listStyleType: "disc", listStylePosition: "inside" });
