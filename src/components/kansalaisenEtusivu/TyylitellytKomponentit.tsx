import { experimental_sx as sx, styled } from "@mui/material";
import Link from "@components/HassuLink";

const Tagi = styled('div')(
  sx({
    backgroundColor: "white",
    color: "#0063AF",
    border: "1px solid #0063AF",
    textAlign: "center",
    display: "inline-block",
    padding: "5 5 10 10",
    marginTop: "1em",
    marginRight: "1em"
  })
)

export const Suunnitelmatyyppi = styled(Tagi)(
  sx({
    width: "150px"
  })
)

export const ProjektinTila = styled(Tagi)(
  sx({
    width: "200px"
  })
)

export const ProjektinTilaMobiili = styled('div')(
  sx({
    fontWeight: "bold",
    marginTop: "1em",
    paddingBottom: "1em"
  })
)

export const VuorovaikutusTilaisuus = styled(Tagi)(
  sx({
    width: "200px"
  })
)

export const OtsikkoLinkki = styled(Link)(
  sx({
    color: "#0063AF",
    fontWeight: "bold",
    fontSize: 24,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    position: "relative",
    display: "block"
  })
)

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
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: '2',
    WebkitBoxOrient: 'vertical',
  })
)