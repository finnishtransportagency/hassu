import { Container, useMediaQuery, useTheme } from "@mui/material";
import React from "react";
import useTranslation from "next-translate/useTranslation";
import { experimental_sx as sx, styled } from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const Footer = ({}) => {
  const { t } = useTranslation("footer");
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  return (
    <footer className="py-16 bg-gray-lightest w-full">
      <Container className="self-start mt-auto gap-x-6 flex flex-col md:flex-row justify-center md:justify-between md:items-end">
        <div>
          <div style={{ width: isDesktop ? "20em" : undefined }}>
            <div className="flex">
              <KuvaContainer className="justify-center">
                <div className="my-auto text-center">
                  <Image src="/vayla_alla_fi_sv_rgb.png" alt={t("vayla_logo_alt")} width="140.4" height="117" />
                </div>
                <div className="my-auto text-center">
                  <Image src="/ely_alla_fi_sv_rgb.png" alt={t("ely_logo_alt")} width="170.61" height="91" />
                </div>
              </KuvaContainer>
            </div>
            <p className="mt-5">{t("hankesuunnitelmista")}</p>
            <ul>
              <FooterLinkkiEl href="/TODO" teksti={t("common:sivustonimi")} />
              <FooterLinkkiEl href={t("linkki.vayla.linkki")} teksti={t("linkki.vayla.teksti")} />
              <FooterLinkkiEl href={t("linkki.ely.linkki")} teksti={t("linkki.ely.teksti")} />
            </ul>
          </div>
        </div>
        <div>
          <Linkkilista2>
            <li>
              <Link href="#">{t("linkki.saavutettavuus")}</Link>
            </li>
            <li>
              <Link href="#">{t("linkki.tietoa_sivustosta")}</Link>
            </li>
            <li>
              <Link href="#">{t("linkki.tietosuoja")}</Link>
            </li>
            <li>
              <Link href="#">{t("linkki.palautelomake")}</Link>
            </li>
          </Linkkilista2>
        </div>
      </Container>
    </footer>
  );
};

const FooterLinkkiEl = ({ href, teksti }: { href: string; teksti: string }): JSX.Element => (
  <li className="first:mb-6 first:mt-0 mt-1">
    <FooterLinkki href={href}>
      <span style={{ minWidth: "8em" }}>{teksti}</span>
      <FontAwesomeIcon icon="chevron-right" />
    </FooterLinkki>
  </li>
);

const KuvaContainer = styled("div")(
  sx({
    display: "flex",
    gap: 2,
    flexWrap: "wrap",
  })
);

const FooterLinkki = styled("a")(
  sx({
    color: "#0063AF",
    "&:hover": {
      textDecoration: "underline",
    },
    display: "inline-flex",
    gap: 3,
    alignItems: "center",
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
    flexDirection: { xs: "column", md: "row" },
    textAlign: { xs: "center", md: null },
    a: {
      color: "#0063AF",
      display: "inline-block",
      "&:hover": {
        textDecoration: "underline",
      },
    },
  })
);
