import { Aineisto, AineistoInput } from "@services/api";

export const mapAineistoToInput = ({ dokumenttiOid, nimi, jarjestys, tila, kategoriaId, uuid }: Aineisto): AineistoInput => ({
  dokumenttiOid,
  jarjestys,
  nimi,
  tila,
  kategoriaId,
  uuid,
});
