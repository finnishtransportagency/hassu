// import Image from "next/image";
import { Container } from "@mui/material";
import React from "react";
import useTranslation from "next-translate/useTranslation";
import { Grid } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { experimental_sx as sx, styled } from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const Footer = ({}) => {
  const { t } = useTranslation("projekti");
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("md"));

  return (
    <div className="bg-gray-lightest w-full self-start mt-auto">
      <Container sx={{ marginTop: 4, paddingBottom: 4 }} component="footer">
        <Grid container spacing={2} style={{ paddingBottom: "4em", paddingTop: "4em" }}>
          <Grid item lg={6} md={12} style={desktop ? { width: "100%" } : { width: "100%", paddingLeft: "2em" }}>
            <div style={{ maxWidth: "23em" }}>
              <KuvaContainer>
                <Image src="/vayla-600px.jpg" alt="Väylä" width="100" height="100" />
                <Image src="/ely-400px.png" alt="ELY" width="100" height="100" />
              </KuvaContainer>
              <p>{t("info.hankesuunnitelmista")}</p>
              <Linkkilista1>
                <FooterLinkkiEl href="TODO" teksti={t("ui-linkkitekstit.valtion-vaylien-suunnittelu")} />
                <br />
                <FooterLinkkiEl href={"http://väylävirasto.fi"} teksti={"Väylävirasto.fi"} />
                <FooterLinkkiEl href={"http://ely-keskus.fi"} teksti={"Ely-keskus.fi"} />
              </Linkkilista1>
            </div>
          </Grid>
          <Grid item lg={6} md={12} style={{ width: "100%", position: "relative", marginTop: "4em" }}>
            <Linkkilista2 className={desktop ? "desktop" : "mobiili"}>
              <li>
                <Link href="#">{t("ui-linkkitekstit.saavutettavuus")}</Link>
              </li>
              <li>
                <Link href="#">{t("ui-linkkitekstit.tietoa_sivustosta")}</Link>
              </li>
              <li>
                <Link href="#">{t("ui-linkkitekstit.tietosuoja")}</Link>
              </li>
              <li>
                <Link href="#">{t("ui-linkkitekstit.palautelomake")}</Link>
              </li>
            </Linkkilista2>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
};

const FooterLinkkiEl = ({ href, teksti }: { href: string; teksti: string }): JSX.Element => {
  return (
    <li>
      <FooterLinkki href={href}>
        {teksti}
        <div style={{ width: "auto", display: "inline-block" }} />
        <FontAwesomeIcon className="ml-2 mt-1" icon="chevron-right" />
      </FooterLinkki>
    </li>
  );
};

const KuvaContainer = styled("div")(
  sx({
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    paddingBottom: "1em",
    " > *": {
      marginRight: "3em!important",
    },
  })
);

const Linkkilista1 = styled("ul")(
  sx({
    width: "fit-content",
  })
);

const FooterLinkki = styled("a")(
  sx({
    color: "#0063AF",
    "&:hover": {
      textDecoration: "underline",
    },
    display: "flex",
    justifyContent: "space-between",
  })
);

const Linkkilista2 = styled("ul")(
  sx({
    width: "100%",
    marginTop: "0.5em",
    marginBottom: "0.5em",
    "&.mobiili": {
      textAlign: "center",
    },
    "&.desktop": {
      position: "absolute",
      bottom: 0,
      " li": {
        display: "inline-block",
      },
    },
    " li": {
      marginRight: "0.75em",
    },
    " a": {
      color: "#0063AF",
      "&:hover": {
        textDecoration: "underline",
      },
    },
  })
);
