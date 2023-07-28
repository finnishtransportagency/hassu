import { AineistoInput } from "@services/api";

export const combineAndCleanupAineistoArrays = (...arrays: (AineistoInput[] | null | undefined)[]): AineistoInput[] =>
  arrays
    .filter((array): array is AineistoInput[] => !!array)
    .flatMap((array) =>
      array.map(({ dokumenttiOid, nimi, jarjestys, kategoriaId, tila }) => ({ dokumenttiOid, nimi, jarjestys, kategoriaId, tila }))
    );
