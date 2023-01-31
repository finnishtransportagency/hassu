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
        <h1>{t("paaotsikko")}</h1>
        <Trans
          i18nKey="tietoa-palvelusta/saavutettavuus:kappale1"
          components={{
            p: <p />,
            a: <ExternalStyledLink href={t("kappale1-href")} />,
          }}
        />
        <p>{t("kappale2")}</p>
        <Lista>
          <li>{t("arvioimattomat.arvioimaton1")}</li>
          <li>{t("arvioimattomat.arvioimaton2")}</li>
          <li>{t("arvioimattomat.arvioimaton3")}</li>
          <li>{t("arvioimattomat.arvioimaton4")}</li>
          <li>{t("arvioimattomat.arvioimaton5")}</li>
        </Lista>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("saavutettavuuden-tila.otsikko")}</h3>
          <p>{t("saavutettavuuden-tila.kappale1")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("ei-saavutettavaa-sisaltoa.otsikko")}</h3>
          <p>{t("ei-saavutettavaa-sisaltoa.kappale1")}</p>
          <p>{t("ei-saavutettavaa-sisaltoa.kappale2")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h5 className="vayla-smallest-title">{t("ei-saavutettavaa-sisaltoa.ei-saavutettava-asia1.otsikko")}</h5>
          <Lista>
            <li>{t("ei-saavutettavaa-sisaltoa.ei-saavutettava-asia1.selite1")}</li>
            <li>{t("ei-saavutettavaa-sisaltoa.ei-saavutettava-asia1.selite2")}</li>
            <li>{t("ei-saavutettavaa-sisaltoa.ei-saavutettava-asia1.selite3")}</li>
            <li>{t("ei-saavutettavaa-sisaltoa.ei-saavutettava-asia1.selite4")}</li>
            <li>{t("ei-saavutettavaa-sisaltoa.ei-saavutettava-asia1.selite5")}</li>
          </Lista>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h5 className="vayla-smallest-title">{t("ei-saavutettavaa-sisaltoa.ei-saavutettava-asia2.otsikko")}</h5>
          <Lista>
            <li>{t("ei-saavutettavaa-sisaltoa.ei-saavutettava-asia2.selite1")}</li>
            <li>{t("ei-saavutettavaa-sisaltoa.ei-saavutettava-asia2.selite2")}</li>
            <li>{t("ei-saavutettavaa-sisaltoa.ei-saavutettava-asia2.selite3")}</li>
            <li>{t("ei-saavutettavaa-sisaltoa.ei-saavutettava-asia2.selite4")}</li>
            <li>{t("ei-saavutettavaa-sisaltoa.ei-saavutettava-asia2.selite5")}</li>
          </Lista>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("sovellettava-lainsaadanto-ei-kata-seuraavaa-sisaltoa.otsikko")}</h3>
          <p>{t("sovellettava-lainsaadanto-ei-kata-seuraavaa-sisaltoa.kappale1")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("taman-saavutettavuusselosteen-laatiminen.otsikko")}</h3>
          <p>{t("taman-saavutettavuusselosteen-laatiminen.kappale1")}</p>
          <p>{t("taman-saavutettavuusselosteen-laatiminen.kappale2")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("palaute-ja-yhteystiedot.otsikko")}</h3>
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
          <h3 className="vayla-subtitle">{t("taytantoonpanomenettely.otsikko")}</h3>
          <p>{t("taytantoonpanomenettely.kappale1")}</p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">{t("valvontaviranomaisen-yhteystiedot.otsikko")}</h3>
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
          <h3 className="vayla-subtitle">{t("puutteiden-korjaaminen.otsikko")}</h3>
          <p>{t("puutteiden-korjaaminen.kappale1")}</p>
        </ContentSpacer>
      </ContentSpacer>
    </TietoaPalvelustaPageLayout>
  );
}

const Lista = styled("ol")(({ theme }) => ({ listStylePosition: "inside", listStyleType: "disc", marginLeft: theme.spacing(8) }));
