import { Aineisto, AineistoInput } from "@services/api";

export const mapAineistoToInput = ({ dokumenttiOid, nimi, jarjestys, tila, kategoriaId }: Aineisto): AineistoInput => ({
  dokumenttiOid,
  jarjestys,
  nimi,
  tila,
  kategoriaId,
});
