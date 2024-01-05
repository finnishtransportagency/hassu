import { LadattuTiedostoTila, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../../../../../src/database/model";
import { projektiAdapter } from "../../../../../src/projekti/adapter/projektiAdapter";
import { expect } from "chai";
import { stubBasics } from "../util";
import { handleEvents } from "../../../../../src/projekti/projektiHandler";

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
          nimi: "tiedosto1.txt",
          tila: LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
          tiedosto: "/6d0437e7-b159-4ac7-8d89-1687d78efc78/tiedosto1.txt",
        },
        {
          nimi: "tiedosto1.txt",
          tila: LadattuTiedostoTila.ODOTTAA_POISTOA,
          tiedosto: "/lausuntopyynnon_taydennys/jotain/tiedosto1.txt",
          tuotu: "2022-01-01T02:01",
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
          nimi: "tiedosto1.txt",
          tila: LadattuTiedostoTila.ODOTTAA_POISTOA,
          tiedosto: "/lausuntopyynnon_taydennys/jotain/tiedosto1.txt",
        },
        {
          nimi: "tiedosto1.txt",
          tila: LadattuTiedostoTila.ODOTTAA_POISTOA,
          tiedosto: "/6d0437e7-b159-4ac7-8d89-1687d78efc78/tiedosto1.txt",
        },
      ],
    },
  ],
};

export const threeFilesWithSameName = async () => {
  const { handleChangedAineistotAndTiedostotStub, handleChangedAineistoStub, handleChangedTiedostotStub } = stubBasics();
  const projektiAdaptationResult = await projektiAdapter.adaptProjektiToSave(projektiInDB, input);
  expect(projektiAdaptationResult.projekti.lausuntoPyynnot?.[0]?.lisaAineistot).to.eql([
    {
      nimi: "tiedosto1.txt",
      tila: LadattuTiedostoTila.ODOTTAA_POISTOA,
      tiedosto: "/lausuntopyynnon_taydennys/jotain/tiedosto1.txt",
      tuotu: "2022-01-01T02:01",
    },
  ]);
  await handleEvents(projektiAdaptationResult);
  expect(handleChangedAineistotAndTiedostotStub.callCount).to.eql(0);
  expect(handleChangedAineistoStub.callCount).to.eql(0);
  expect(handleChangedTiedostotStub.callCount).to.eql(1);
};
