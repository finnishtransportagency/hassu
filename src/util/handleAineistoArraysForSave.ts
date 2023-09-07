import { AineistoInput } from "@services/api";

type OptionalAineistoArray = AineistoInput[] | null | undefined;

export const handleAineistoArraysForSave = (lisatty: OptionalAineistoArray, poistettu: OptionalAineistoArray): AineistoInput[] => [
  ...(lisatty || []).map(({ dokumenttiOid, nimi, kategoriaId, tila, jarjestys }) => ({
    dokumenttiOid,
    nimi,
    jarjestys,
    kategoriaId,
    tila,
  })),
  ...(poistettu || []).map(({ dokumenttiOid, nimi, tila }) => ({ dokumenttiOid, nimi, tila })),
];
