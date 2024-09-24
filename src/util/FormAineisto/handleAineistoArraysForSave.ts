import { AineistoInput, AineistoTila } from "@services/api";
import { FormAineisto } from "./FormAineisto";

export const handleAineistoArraysForSave = (lisatty: FormAineisto[] = [], poistettu: FormAineisto[] = []): AineistoInput[] => [
  ...lisatty.map<AineistoInput>(({ dokumenttiOid, nimi, kategoriaId, tila, jarjestys, uuid }) => ({
    dokumenttiOid,
    nimi,
    jarjestys,
    kategoriaId,
    tila: tila ?? AineistoTila.ODOTTAA_TUONTIA,
    uuid,
  })),
  ...poistettu.map(({ dokumenttiOid, nimi, tila, uuid }) => ({ dokumenttiOid, nimi, tila: tila ?? AineistoTila.ODOTTAA_TUONTIA, uuid })),
];
