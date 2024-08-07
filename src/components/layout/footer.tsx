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
import { useYllapito } from "../../hooks/useYllapito";

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

const elySocialMedia: SocialMediaLinkProps[] = [
  {
    icon: { iconName: "facebook-square", prefix: "fab" },
    title: "Facebook",
    titleIllatiivi: "Facebookiin",
    href: "https://www.facebook.com/ELYkeskus",
  },
  {
    icon: { iconName: "twitter", prefix: "fab" },
    title: "Twitter",
    titleIllatiivi: "Twitteriin",
    href: "https://www.twitter.com/ELYkeskus",
  },
  {
    icon: { iconName: "linkedin", prefix: "fab" },
    title: "LinkedIn",
    titleIllatiivi: "LinkedIniin",
    href: "https://www.linkedin.com/company/centre-for-economic-development-transport-and-the-environment/",
  },
  {
    icon: { iconName: "youtube", prefix: "fab" },
    title: "Youtube",
    titleIllatiivi: "Youtubeen",
    href: "https://www.youtube.com/channel/UChlaFxyANJa7Qs8-NlPx-wg",
  },
];

export const Footer = () => {
  const { t, lang } = useTranslation("footer");
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const isYllapito = useYllapito()

  return (
    <footer className="py-16 bg-gray-lightest w-full mt-auto">
      <Container
        sx={{
          columnGap: 75,
          paddingLeft: { xs: 10, lg: undefined },
          paddingRight: { xs: 10, lg: undefined },
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          justifyContent: { xs: "center", lg: "space-between" },
          alignItems: { md: "end" },
        }}
      >
        <div>
          <div style={{ width: isDesktop ? "20em" : undefined }}>
            <div className="flex">
              <KuvaContainer className="justify-center">
                <div className="my-auto text-center">
                  <Image src="/vayla_alla_fi_sv_rgb.png" alt="" width="140.4" height="117" />
                </div>
                <div className="my-auto text-center">
                  <Image src="/ely_alla_fi_sv_rgb.png" alt="" width="170.61" height="91" />
                </div>
              </KuvaContainer>
            </div>
            <p className="mt-5">{t("hankesuunnitelmista")}</p>
            <ul>
              <FooterLinkkiEl href={t("linkki.vayla.linkki")} teksti={t("linkki.vayla.teksti")} />
              <FooterLinkkiEl href={t("linkki.ely.linkki")} teksti={t("linkki.ely.teksti")} />
            </ul>
          </div>
        </div>
        <div style={{ width: "100%" }}>
          {!isYllapito ? (
            <ContentSpacer sx={{ marginTop: 12 }} gap={8}>
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
                <p>{t("sosiaalinen_media.ely.otsikko")}</p>
                <SocialMediaLinkList>
                  {elySocialMedia.map(({ title, titleIllatiivi, ...socialMedia }) => (
                    <SocialMediaLink
                      key={title}
                      title={`${t("sosiaalinen_media.linkki_jonnekin")} ${t("sosiaalinen_media.ely.etuliite_genetiivi")} ${
                        lang == "fi" ? titleIllatiivi : title
                      }`}
                      {...socialMedia}
                    />
                  ))}
                </SocialMediaLinkList>
              </ContentSpacer>
            </ContentSpacer>
          ) : (
            <ContentSpacer sx={{ marginTop: 12 }} gap={8}>
              <ContentSpacer sx={{ textAlign: { xs: "center", lg: "start" } }} gap={0}>
                <H2 variant={"plain"} sx={{ fontSize: { xs: "1.5rem", lg: "1rem" }, marginBottom: { xs: "1rem", lg: "0" } }}>
                  {t("linkki.ohjeet")}
                </H2>
                <LinkkilistaVertical style={{ rowGap: 0 }}>
                  <FooterLinkkiEl href={t("linkki.ohjeluettelo.linkki")} teksti={t("linkki.ohjeluettelo.teksti")} />
                  <FooterLinkkiEl href={t("linkki.projektivelhon_ohjeet.linkki")} teksti={t("linkki.projektivelhon_ohjeet.teksti")} />
                </LinkkilistaVertical>
              </ContentSpacer>
              <ContentSpacer sx={{ textAlign: { xs: "center", lg: "start" } }} gap={0}>
                <H2 variant={"plain"} sx={{ fontSize: { xs: "1.5rem", lg: "1rem" }, marginBottom: { xs: "1rem", lg: "0" } }}>
                  {t("linkki.oikopolut")}
                </H2>
                <LinkkilistaVertical style={{ rowGap: 0 }}>
                  <FooterLinkkiEl href={t("linkki.etakaytto.linkki")} teksti={t("linkki.etakaytto.teksti")} />
                  <FooterLinkkiEl href={t("linkki.projektivelho.linkki")} teksti={t("linkki.projektivelho.teksti")} />
                </LinkkilistaVertical>
              </ContentSpacer>
            </ContentSpacer>
          )}
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
        </div>
      </Container>
    </footer>
  );
};

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
}));

const FooterLinkkiEl = ({ href, teksti }: { href: string; teksti: string }): JSX.Element => (
  <li className="mt-1">
    <ExternalStyledLink
      sx={{
        span: { minWidth: "8em" },
        fontWeight: 400,
        display: "inline-flex",
        gap: 3,
        alignItems: "center",
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

const LinkkilistaVertical = styled("ul")(
  sx({
    display: "flex",
    flexWrap: "wrap",
    flexDirection: "column",
  })
);
