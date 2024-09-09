import { experimental_sx as sx, styled } from "@mui/material";
import Link from "@components/HassuLink";
import { Tagi } from "@components/Tagi";

export const Suunnitelmatyyppi = styled(Tagi)(
  sx({
    width: "150px",
    marginTop: "1em",
    marginRight: "1em",
  })
);

export const ProjektinTila = styled(Tagi)(
  sx({
    width: "200px",
    marginTop: "1em",
    marginRight: "1em",
  })
);

export const VuorovaikutusTagi = styled(Tagi)(
  sx({
    width: "200px",
    marginTop: "1em",
    marginRight: "1em",
  })
);

export const ProjektinTilaMobiili = styled("div")(
  sx({
    fontWeight: "bold",
    marginTop: "1em",
    paddingBottom: "1em",
  })
);

export const VuorovaikutusTilaisuus = styled(Tagi)(
  sx({
    width: "200px",
    marginTop: "1em",
    marginRight: "1em",
  })
);

export const HakulomakeOtsikko = styled("h3")(
  sx({
    fontWeight: "bold",
  })
);

export const OtsikkoLinkki = styled(Link)(
  sx({
    color: "#0064AF",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "normal",
    position: "relative",
    display: "block",
    "&:hover": {
      textDecoration: "underline",
    },
  })
);

export const OtsikkoLinkkiMobiili = styled(Link)(
  sx({
    color: "#0064AF",
    position: "relative",
    display: "block",
  })
);

export const HakutulosLista = styled("ol")(
  sx({
    width: "100%",
    marginLeft: 0,
    listStyle: "none",
    borderRight: "1px solid #F7F7F7",
  })
);

export const HakutulosListaItem = styled("li")(() =>
  sx({
    "&:nth-of-type(odd)": {
      backgroundColor: "#F7F7F7",
    },
    "&:nth-of-type(even)": {
      backgroundColor: "white",
    },
    borderBottom: "solid 2px #49c2f1",
    padding: 7,
    paddingLeft: 5,
  })
);

export const Kuvaus = styled("div")(
  sx({
    marginTop: "1em",
    marginBottom: "1em",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: "2",
    WebkitBoxOrient: "vertical",
  })
);

export const SivunumeroLista = styled("div")(
  sx({
    marginTop: "1em",
    display: "inline-block",
  })
);

export const SivunumeroLinkki = styled(Link)(
  sx({
    marginLeft: "0.6em",
    display: "inline-block",
    "&:hover": {
      textDecoration: "underline",
    },
  })
);

export const SivunumeroNykyinen = styled("div")(
  sx({
    marginLeft: "0.75em",
    display: "inline-block",
    fontWeight: "bold",
  })
);

export const NavigointiNapit = styled("div")(
  sx({
    display: "inline-block",
    float: "right",
    marginTop: "1em",
  })
);

export const NavigointiNapitMobiili = styled("div")(
  sx({
    display: "flex",
    marginTop: "2em",
    justifyContent: "center",
  })
);

export const NavigointiNappi = styled(Link)(
  sx({
    border: "1px solid rgb(216, 216, 216)",
    boxSizing: "border-box",
    textAlign: "center",
    borderRadius: "15px",
    cursor: "pointer",
    marginLeft: "0.3em",
    display: "inline-block",
  })
);

export const NavigointiNappiDisabled = styled("div")(
  sx({
    display: "none",
  })
);

const NavigointiNappiDesktopTyylit = sx({
  paddingLeft: "14px",
  paddingRight: "14px",
  paddingTop: "5px",
  paddingBottom: "5px",
  ":hover": {
    textDecoration: "underline",
  },
});

export const NavigointiNappiDesktop = styled(NavigointiNappi)(NavigointiNappiDesktopTyylit);
export const NavigointiNappiDesktopDisabled = styled(NavigointiNappiDisabled)(NavigointiNappiDesktopTyylit);

const NavigointiNappiMobiiliTyylit = sx({
  paddingLeft: "19px",
  paddingRight: "19px",
  paddingTop: "11px",
  paddingBottom: "11px",
  color: "#0064AF",
  marginRight: "auto",
  marginLeft: "auto",
  display: "inline-block",
});

export const NavigointiNappiMobiili = styled(NavigointiNappi)(NavigointiNappiMobiiliTyylit);

export const NavigointiNappiMobiiliDisabled = styled(NavigointiNappiDisabled)(NavigointiNappiMobiiliTyylit, { color: "#242222" });

export const HakuehtoNappi = styled("button")(
  sx({
    color: "#0064AF",
    fontSize: "1.1em",
    marginTop: "0.5em",
  })
);

export const VinkkiTeksti = styled("p")(
  sx({
    color: "rgb(150, 150, 150)",
    fontSize: "15px",
    marginTop: "8px",
    marginBottom: "1.5em",
  })
);

export const VinkkiLinkki = styled(Link)(
  sx({
    color: "#0064AF",
    "&.skaalaa": {
      fontSize: "15px!important",
    },
    "&:hover": {
      cursor: "pointer",
      textDecoration: "underline",
    },
  })
);

export const MobiiliBlokki = styled("button")(
  sx({
    width: "100%",
    display: "block",
    backgroundColor: "#0064AF",
    textAlign: "left",
    paddingLeft: "28px",
    paddingRight: "28px",
    paddingTop: "20px",
    paddingBottom: "20px",
    color: "white",
    marginBottom: "-1.75rem",
  })
);

export const HakutulosInfo = styled("div")(
  sx({
    " h2": { fontWeight: "bold" },
    "&.mobiili": {
      textAlign: "center",
      alignContent: "center",
    },
    " button": {
      fontSize: "1rem",
      color: "#0064AF",
      "&:hover": {
        textDecoration: "underline",
      },
    },
  })
);
