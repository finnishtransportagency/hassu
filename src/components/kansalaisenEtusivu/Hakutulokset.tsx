import { ProjektiHakutulosJulkinen } from "@services/api";
import { experimental_sx as sx, styled } from "@mui/material";

type Props = {
  hakutulos: ProjektiHakutulosJulkinen | undefined;
  ladataan: boolean | undefined | null;
};
export default function Hakutulokset({ hakutulos, ladataan }: Props) {
  if (!hakutulos && ladataan) {
    return <>Ladataan...</>;
  }

  return (
    <HakutulosLista className="Hakutulokset">
      {hakutulos?.tulokset?.map((tulos) => (
        <HakutulosListaItem key={tulos.oid}>{tulos.oid}</HakutulosListaItem>
      ))}
    </HakutulosLista>
  );
}

const HakutulosLista = styled("ol")(
  sx({
    width: "100%",
    marginLeft: 0,
    listStyle: "none",
    borderRight: "1px solid #F7F7F7",
  })
);

const HakutulosListaItem = styled("li")(() =>
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
