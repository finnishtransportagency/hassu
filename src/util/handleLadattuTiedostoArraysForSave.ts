import { LadattuTiedostoInput } from "@services/api";

type OptionalTiedostoArray = LadattuTiedostoInput[] | null | undefined;

export const handleLadattuTiedostoArraysForSave = (
  lisatty: OptionalTiedostoArray,
  poistettu: OptionalTiedostoArray
): LadattuTiedostoInput[] => [
  ...(lisatty || []).map(adaptLadattuTiedostoInputFEtoBE),
  ...(poistettu || []).map(adaptLadattuTiedostoInputFEtoBE),
];

function adaptLadattuTiedostoInputFEtoBE(ladattuTiedosto: LadattuTiedostoInput): LadattuTiedostoInput {
  const { nimi, tiedosto, tila, jarjestys } = ladattuTiedosto;
  return {
    nimi,
    tila,
    jarjestys,
    tiedosto: tiedosto.replace(/^\/?yllapito\/tiedostot\/projekti\/[0-9\.]+\//, "/"),
  };
}
