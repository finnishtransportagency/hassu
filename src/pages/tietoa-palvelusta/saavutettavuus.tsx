import TietoaPalvelustaPageLayout from "@components/kansalainen/tietoaPalvelusta/TietoaPalvelustaPageLayout";
import ContentSpacer from "@components/layout/ContentSpacer";
import StyledLink, { ExternalStyledLink } from "@components/StyledLink";
import { styled } from "@mui/system";
import Trans from "next-translate/Trans";
import useTranslation from "next-translate/useTranslation";
import React from "react";

export default function SaavutettavuusSelosteSivu() {
  const { t } = useTranslation("tietoa-palvelusta/saavutettavuus");

  return (
    <TietoaPalvelustaPageLayout>
      <ContentSpacer as={"section"} gap={8}>
        <h1 id="mainPageContent">{t("paaotsikko")}</h1>
        <Trans
          i18nKey="tietoa-palvelusta/saavutettavuus:kappale1"
          components={{
            p: <p />,
            a: <ExternalStyledLink href={t("kappale1-href")} />,
          }}
        />
        <p>{t("kappale2")}</p>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("saavutettavuuden-tila.otsikko")}</h2>
          <p>{t("saavutettavuuden-tila.kappale1")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("ei-saavutettavaa-sisaltoa.otsikko")}</h3>
          <p>{t("ei-saavutettavaa-sisaltoa.kappale1")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h4 className="vayla-small-title">{t("navigointi-ja-kayttoliittyma.otsikko")}</h4>
          <Lista>
            <li>{t("navigointi-ja-kayttoliittyma.kohta1")}</li>
            <li>{t("navigointi-ja-kayttoliittyma.kohta2")}</li>
            <li>{t("navigointi-ja-kayttoliittyma.kohta3")}</li>
            <li>{t("navigointi-ja-kayttoliittyma.kohta4")}</li>
            <li>{t("navigointi-ja-kayttoliittyma.kohta5")}</li>
          </Lista>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h4 className="vayla-small-title">{t("kuvat.otsikko")}</h4>
          <Lista>
            <li>{t("kuvat.kohta1")}</li>
          </Lista>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h4 className="vayla-small-title">{t("sisallon-suurentaminen.otsikko")}</h4>
          <Lista>
            <li>{t("sisallon-suurentaminen.kohta1")}</li>
            <li>{t("sisallon-suurentaminen.kohta2")}</li>
          </Lista>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-small-title">{t("sovellettava-lainsaadanto-ei-kata-seuraavaa-sisaltoa.otsikko")}</h3>
          <Lista>
            <li>{t("sovellettava-lainsaadanto-ei-kata-seuraavaa-sisaltoa.kohta1")}</li>
            <li>{t("sovellettava-lainsaadanto-ei-kata-seuraavaa-sisaltoa.kohta2")}</li>
          </Lista>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("taman-saavutettavuusselosteen-laatiminen.otsikko")}</h2>
          <Trans
            i18nKey="tietoa-palvelusta/saavutettavuus:taman-saavutettavuusselosteen-laatiminen.kappale1"
            components={{
              br: <br />,
            }}
          />
          <p>{t("taman-saavutettavuusselosteen-laatiminen.kappale2")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("palaute-ja-yhteystiedot.otsikko")}</h2>
          <p>{t("palaute-ja-yhteystiedot.kappale1")}</p>
          <p>{t("palaute-ja-yhteystiedot.kappale2")}</p>
          <p>{t("palaute-ja-yhteystiedot.kappale3")}</p>
          <Trans
            i18nKey="tietoa-palvelusta/saavutettavuus:palaute-ja-yhteystiedot.kappale4"
            components={{
              p: <p />,
              a: <StyledLink href={"mailto:" + t("palaute-ja-yhteystiedot.kappale4-email")} />,
              br: <br />,
            }}
            values={{ email: t("palaute-ja-yhteystiedot.kappale4-email") }}
          />
          <p>{t("palaute-ja-yhteystiedot.kappale5")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("taytantoonpanomenettely.otsikko")}</h2>
          <p>{t("taytantoonpanomenettely.kappale1")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("valvontaviranomaisen-yhteystiedot.otsikko")}</h2>
          <Trans
            i18nKey="tietoa-palvelusta/saavutettavuus:valvontaviranomaisen-yhteystiedot.kappale1"
            components={{
              p: <p />,
              br: <br />,
            }}
          />
          <p>
            <ExternalStyledLink href={t("valvontaviranomaisen-yhteystiedot.linkki1.href")}>
              {t("valvontaviranomaisen-yhteystiedot.linkki1.teksti")}
            </ExternalStyledLink>
          </p>
          <p>
            <StyledLink href={"mailto:" + t("valvontaviranomaisen-yhteystiedot.email")}>
              {t("valvontaviranomaisen-yhteystiedot.email")}
            </StyledLink>
          </p>
          <p>{t("valvontaviranomaisen-yhteystiedot.puhelin")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("puutteiden-korjaaminen.otsikko")}</h2>
          <p>{t("puutteiden-korjaaminen.kappale1")}</p>
        </ContentSpacer>
      </ContentSpacer>
    </TietoaPalvelustaPageLayout>
  );
}

const Lista = styled("ol")(({ theme, type }) => ({
  listStylePosition: "inside",
  listStyleType: type === "1" ? "number" : "disc",
  marginLeft: theme.spacing(8),
}));
