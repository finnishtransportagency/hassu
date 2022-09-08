import { experimental_sx as sx, styled } from "@mui/material";
import Link from "@components/HassuLink";

const Tagi = styled("div")(
  sx({
    backgroundColor: "white",
    color: "#0063AF",
    border: "1px solid #0063AF",
    textAlign: "center",
    display: "inline-block",
    padding: "5 5 10 10",
    marginTop: "1em",
    marginRight: "1em",
  })
);

export const Suunnitelmatyyppi = styled(Tagi)(
  sx({
    width: "150px",
  })
);

export const ProjektinTila = styled(Tagi)(
  sx({
    width: "200px",
  })
);

export const ProjektinTilaMobiili = styled("div")(
  sx({
    fontWeight: "bold",
    marginTop: "1em",
    paddingBottom: "1em",
  })
);

export const ProjektinTilaMobiili = styled('div')(
  sx({
    fontWeight: "bold",
    marginTop: "1em",
    paddingBottom: "1em"
  })
)

export const VuorovaikutusTilaisuus = styled(Tagi)(
  sx({
    width: "200px",
  })
);

export const OtsikkoLinkki = styled(Link)(
  sx({
    color: "#0063AF",
    fontWeight: "bold",
    fontSize: 24,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    position: "relative",
    display: "block",
  })
);

export const OtsikkoLinkkiMobiili = styled(Link)(
  sx({
    color: "#0063AF",
    fontWeight: "bold",
    fontSize: 24,
    position: "relative",
    display: "block",
  })
);

export const OtsikkoLinkkiMobiili = styled(Link)(
  sx({
    color: "#0063AF",
    fontWeight: "bold",
    fontSize: 24,
    position: "relative",
    display: "block"
  })
)

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

export const SivunumeroLinkki = styled("a")(
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
    border: "1px solid rgb(216, 216, 216)",
    boxSizing: "border-box",
    textAlign: "center",
    borderRadius: "15px",
    marginLeft: "0.3em",
    display: "inline-block",
    cursor: "not-allowed",
  })
);

const NavigointiNappiDesktopTyylit = sx({
  paddingLeft: "14px",
  paddingRight: "14px",
  paddingTop: "5px",
  paddingBottom: "5px",
});

export const NavigointiNappiDesktop = styled(NavigointiNappi)(NavigointiNappiDesktopTyylit);
export const NavigointiNappiDesktopDisabled = styled(NavigointiNappiDisabled)(NavigointiNappiDesktopTyylit);

const NavigointiNappiMobiiliTyylit = sx({
  paddingLeft: "19px",
  paddingRight: "19px",
  paddingTop: "11px",
  paddingBottom: "11px",
  color: "#0063AF",
  marginRight: "auto",
  marginLeft: "auto",
  display: "inline-block",
});

export const NavigointiNappiMobiili = styled(NavigointiNappi)(NavigointiNappiMobiiliTyylit);

export const NavigointiNappiMobiiliDisabled = styled(NavigointiNappiDisabled)(NavigointiNappiMobiiliTyylit);
