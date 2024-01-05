import { LadattuTiedostoTila, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../../../../../src/database/model";
import { projektiAdapter } from "../../../../../src/projekti/adapter/projektiAdapter";
import { expect } from "chai";
import { stubBasics } from "../util";

const projektiInDB: DBProjekti = {
  oid: "1.2.246.578.5.1.2978288874.2711575506",
  versio: 16,
  lausuntoPyynnot: [
    {
      uuid: "c12cacf5-7f14-4bfb-93ca-e80360ca6a55",
      poistumisPaiva: "2024-01-21",
      muistiinpano: "Eka aineistolinkki uudessa systeemissä.",
      lisaAineistot: [
        {
          nimi: "Screenshot 2023-08-18 at 11.55.48.png",
          tila: LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
          jarjestys: 0,
          tiedosto: "/6d0437e7-b159-4ac7-8d89-1687d78efc78/Screenshot 2023-08-18 at 11.55.48.png",
        },
        {
          nimi: "Screenshot 2023-08-18 at 12.28.00.png",
          tila: LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
          jarjestys: 1,
          tiedosto: "/1134482b-9b73-4cc3-883b-fcfba47248d7/Screenshot 2023-08-18 at 12.28.00.png",
        },
      ],
    },
  ],
  kayttoOikeudet: [],
};
const input: TallennaProjektiInput = {
  oid: "1.2.246.578.5.1.2978288874.2711575506",
  versio: 16,
  lausuntoPyynnot: [
    {
      uuid: "c12cacf5-7f14-4bfb-93ca-e80360ca6a55",
      poistumisPaiva: "2024-01-21",
      muistiinpano: "Eka aineistolinkki uudessa systeemissä.",
      lisaAineistot: [
        {
          nimi: "Screenshot 2023-08-18 at 11.55.48.png",
          tila: LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
          jarjestys: 0,
          tiedosto: "/6d0437e7-b159-4ac7-8d89-1687d78efc78/Screenshot 2023-08-18 at 11.55.48.png",
        },
        {
          nimi: "Screenshot 2023-08-18 at 12.28.00.png",
          tila: LadattuTiedostoTila.ODOTTAA_POISTOA,
          jarjestys: 1,
          tiedosto: "/1134482b-9b73-4cc3-883b-fcfba47248d7/Screenshot 2023-08-18 at 12.28.00.png",
        },
      ],
    },
  ],
};

export const removedLisaAineistoNotYetPersisted = async () => {
  stubBasics();
  const projektiAdaptationResult = await projektiAdapter.adaptProjektiToSave(projektiInDB, input);
  expect(projektiAdaptationResult.projekti.lausuntoPyynnot?.[0]?.lisaAineistot?.length).to.eql(1);
};
