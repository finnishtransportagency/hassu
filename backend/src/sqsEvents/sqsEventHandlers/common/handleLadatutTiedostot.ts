import { LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { LadattuTiedosto } from "../../../database/model";
import { deleteFile, persistLadattuTiedosto } from "../../../files/persistFiles";

export default async function handleLadatutTiedostot({
  oid,
  tiedostot,
  targetFilePathInProjekti,
}: {
  oid: string;
  tiedostot: Array<LadattuTiedosto>;
  targetFilePathInProjekti: string;
}): Promise<Array<LadattuTiedosto>> {
  const { poistettavat, valmiit, persistoitavat } = tiedostot.splice(0, tiedostot.length).reduce(
    ({ poistettavat, valmiit, persistoitavat }, tiedosto) => {
      switch (tiedosto.tila) {
        case LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA:
          persistoitavat.push(tiedosto);
          break;
        case LadattuTiedostoTila.ODOTTAA_POISTOA:
          poistettavat.push(tiedosto);
          break;
        default:
          valmiit.push(tiedosto);
          break;
      }
      return { poistettavat, valmiit, persistoitavat };
    },
    { poistettavat: [], valmiit: [], persistoitavat: [] } as {
      poistettavat: LadattuTiedosto[];
      valmiit: LadattuTiedosto[];
      persistoitavat: LadattuTiedosto[];
    }
  );
  await Promise.all(poistettavat.map((tiedosto) => deleteFile({ oid, tiedosto })));
  const persistoidutTiedostot = await Promise.all(
    persistoitavat.map((tiedosto) =>
      persistLadattuTiedosto({
        oid,
        ladattuTiedosto: tiedosto,
        targetFilePathInProjekti,
      })
    )
  );
  return valmiit.concat(persistoidutTiedostot).sort((a, b) => (a.jarjestys ?? 0) - (b.jarjestys ?? 0));
}
