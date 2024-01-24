import { AineistoInput } from "@services/api";

type OptionalAineistoArray = AineistoInput[] | null | undefined;

export const handleAineistoArraysForSave = (lisatty: OptionalAineistoArray, poistettu: OptionalAineistoArray): AineistoInput[] => [
  ...(lisatty || []).map(({ dokumenttiOid, nimi, kategoriaId, tila, jarjestys, uuid }) => ({
    dokumenttiOid,
    nimi,
    jarjestys,
    kategoriaId,
    tila,
    uuid,
  })),
  ...(poistettu || []).map(({ dokumenttiOid, nimi, tila, uuid }) => ({ dokumenttiOid, nimi, tila, uuid })),
];
