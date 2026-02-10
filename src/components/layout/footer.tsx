import { Container, useMediaQuery, useTheme } from "@mui/material";
import React from "react";
import useTranslation from "next-translate/useTranslation";
import { experimental_sx as sx, styled } from "@mui/material";
import Image from "next/image";
import { FontAwesomeIcon, FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import StyledLink, { ExternalStyledLink } from "@components/StyledLink";
import HassuLink, { HassuLinkProps } from "@components/HassuLink";
import ContentSpacer from "./ContentSpacer";
import { H2 } from "../Headings";
import { useIsYllapito } from "../../hooks/useIsYllapito";
import { focusStyleSecondary } from "./HassuMuiThemeProvider";

type SocialMediaLinkProps = {
  icon: FontAwesomeIconProps["icon"];
  title: string;
  titleIllatiivi: string;
  href: string;
} & HassuLinkProps;

const vaylaSocialMedia: SocialMediaLinkProps[] = [
  {
    icon: { iconName: "facebook-square", prefix: "fab" },
    title: "Facebook",
    titleIllatiivi: "Facebookiin",
    href: "https://www.facebook.com/vaylafi/",
  },
  { icon: { iconName: "twitter", prefix: "fab" }, title: "Twitter", titleIllatiivi: "Twitteriin", href: "https://www.twitter.com/vaylafi" },
  {
    icon: { iconName: "instagram", prefix: "fab" },
    title: "Instagram",
    titleIllatiivi: "Instagramiin",
    href: "https://www.instagram.com/vaylafi",
  },
  {
    icon: { iconName: "linkedin", prefix: "fab" },
    title: "LinkedIn",
    titleIllatiivi: "LinkedIniin",
    href: "https://www.linkedin.com/company/vaylafi",
  },
  { icon: { iconName: "flickr", prefix: "fab" }, title: "Flickr", titleIllatiivi: "Flickriin", href: "https://www.flickr.com/vaylafi" },
  {
    icon: { iconName: "youtube", prefix: "fab" },
    title: "Youtube",
    titleIllatiivi: "Youtubeen",
    href: "https://www.youtube.com/c/vaylafi",
  },
];

const evkSocialMedia: SocialMediaLinkProps[] = [
  {
    icon: { iconName: "facebook-square", prefix: "fab" },
    title: "Facebook",
    titleIllatiivi: "Facebookiin",
    href: "https://www.facebook.com/Elinvoimakeskus",
  },
  {
    icon: { iconName: "twitter", prefix: "fab" },
    title: "Twitter",
    titleIllatiivi: "Twitteriin",
    href: "https://x.com/Elinvoimakeskus",
  },
  {
    icon: { iconName: "linkedin", prefix: "fab" },
    title: "LinkedIn",
    titleIllatiivi: "LinkedIniin",
    href: "https://www.linkedin.com/company/elinvoimakeskus",
  },
  {
    icon: { iconName: "youtube", prefix: "fab" },
    title: "Youtube",
    titleIllatiivi: "Youtubeen",
    href: "https://www.youtube.com/@Elinvoimakeskus",
  },
];

export const Footer = () => {
  const { t } = useTranslation("footer");
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const isYllapito = useIsYllapito();

  return (
    <StyledFooter>
      <Container
        sx={{
          columnGap: 75,
          rowGap: 12,
          paddingLeft: { xs: 10, lg: undefined },
          paddingRight: { xs: 10, lg: undefined },
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          justifyContent: { xs: "center", lg: "space-between" },
          alignItems: { lg: "end" },
        }}
      >
        <ContentSpacer gap={8} sx={{ width: isDesktop ? "20em" : undefined }}>
          <ContentSpacer gap={2}>
            <div className="flex">
              <KuvaContainer className="justify-center">
                <div className="my-auto text-center">
                  <Image src="/assets/vayla_alla_fi_sv_rgb.png" alt="" width="140" height="117" />
                </div>
                <div className="my-auto text-center">
                  <Image src="/assets/evk_footer_fi_sv.png" alt="" width="170.61" height="91" />
                </div>
              </KuvaContainer>
            </div>
            <p>{t("hankesuunnitelmista")}</p>
          </ContentSpacer>
          <ul>
            <FooterLinkkiEl href={t("linkki.vayla.linkki")} teksti={t("linkki.vayla.teksti")} />
            <FooterLinkkiEl href={t(`linkki.linkki-evk.href`)} teksti={t(`linkki.linkki-evk.teksti`)} />
          </ul>
          <div>
            <span>&copy; {t("common:vaylavirasto")}</span>
          </div>
        </ContentSpacer>
        <StyledRightContent>{isYllapito ? <FooterYllapitoContent /> : <FooterKansalaisContent />}</StyledRightContent>
      </Container>
    </StyledFooter>
  );
};

const StyledRightContent = styled("div")({
  flex: "1",
});

const StyledFooter = styled("footer")(({ theme }) => ({
  paddingTop: theme.spacing(16),
  paddingBottom: theme.spacing(16),
  backgroundColor: theme.palette.grey[100],
  width: "100%",
  marginTop: "auto",
}));

const SocialMediaLinkList = styled("div")(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(3),
}));

const SocialMediaLink = styled(({ icon, ref, ...props }: Omit<SocialMediaLinkProps, "titleIllatiivi">) => (
  <HassuLink useNextLink={false} target="_blank" {...props}>
    <FontAwesomeIcon icon={icon} />
  </HassuLink>
))(({ theme }) => ({
  color: "white",
  width: "32px",
  height: "32px",
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: "50%",
  background: theme.palette.primary.dark,
  "&:focus-visible": focusStyleSecondary,
}));

const FooterLinkkiEl = ({ href, teksti }: { href: string; teksti: string }): JSX.Element => (
  <li>
    <ExternalStyledLink
      sx={{
        span: { minWidth: "8em" },
        fontWeight: 400,
        display: "inline-flex",
        gap: 3,
        alignItems: "center",
        marginTop: 1,
      }}
      href={href}
    >
      {teksti}
    </ExternalStyledLink>
  </li>
);

const KuvaContainer = styled("div")(
  sx({
    display: "flex",
    gap: 2,
    flexWrap: "wrap",
  })
);

const Linkkilista2 = styled("ul")(
  sx({
    alignSelf: "end",
    display: "flex",
    justifyContent: "end",
    rowGap: 2,
    columnGap: 8,
    flexWrap: "wrap",
    marginTop: 15,
    flexDirection: { xs: "column", lg: "row" },
    textAlign: { xs: "center", lg: null },
  })
);

function FooterYllapitoContent() {
  return (
    <ContentSpacer gap={8}>
      <div>
        <H2 variant="plain">Ohjeet</H2>
        <ul>
          <FooterLinkkiEl href="https://vayla.fi/palveluntuottajat/ohjeluettelo" teksti="Ohjeluettelo" />
          <FooterLinkkiEl href="https://ohje.velho.vaylapilvi.fi/" teksti="Projektivelhon ohjeet" />
        </ul>
      </div>
      <div>
        <H2 variant="plain">Oikopolut</H2>
        <ul>
          <FooterLinkkiEl href="https://sso.vayla.fi/" teksti="Etäkäyttö (Extranet, vpn, intra)" />
          <FooterLinkkiEl href="https://velho.vaylapilvi.fi/" teksti="Projektivelho" />
        </ul>
      </div>
    </ContentSpacer>
  );
}

function FooterKansalaisContent() {
  const { t, lang } = useTranslation("footer");
  return (
    <>
      <ContentSpacer gap={8}>
        <ContentSpacer gap={4}>
          <p>{t("sosiaalinen_media.vayla.otsikko")}</p>
          <SocialMediaLinkList>
            {vaylaSocialMedia.map(({ title, titleIllatiivi, ...socialMedia }) => (
              <SocialMediaLink
                key={title}
                title={`${t("sosiaalinen_media.linkki_jonnekin")} ${t("sosiaalinen_media.vayla.etuliite_genetiivi")} ${
                  lang == "fi" ? titleIllatiivi : title
                }`}
                {...socialMedia}
              />
            ))}
          </SocialMediaLinkList>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <p>{t("sosiaalinen_media.evk.otsikko")}</p>
          <SocialMediaLinkList>
            {evkSocialMedia.map(({ title, titleIllatiivi, ...socialMedia }) => (
              <SocialMediaLink
                key={title}
                title={`${t("sosiaalinen_media.linkki_jonnekin")} ${t("sosiaalinen_media.evk.etuliite_genetiivi")} ${
                  lang == "fi" ? titleIllatiivi : title
                }`}
                {...socialMedia}
              />
            ))}
          </SocialMediaLinkList>
        </ContentSpacer>
      </ContentSpacer>
      <Linkkilista2>
        <li>
          <StyledLink sx={{ fontWeight: 400 }} href="/tietoa-palvelusta">
            {t("linkki.tietoa_palvelusta")}
          </StyledLink>
        </li>
        <li>
          <StyledLink sx={{ fontWeight: 400 }} href="/tietoa-palvelusta/saavutettavuus">
            {t("linkki.saavutettavuus")}
          </StyledLink>
        </li>
        <li>
          <StyledLink sx={{ fontWeight: 400 }} href="/tietoa-palvelusta/yhteystiedot-ja-palaute">
            {t("linkki.yhteystiedot_ja_palaute")}
          </StyledLink>
        </li>
      </Linkkilista2>
    </>
  );
}
