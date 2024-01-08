import { expect } from "chai";
import { stubBasics, testDbProjekti } from "../util";
import { projektiAdapter } from "../../../../../src/projekti/adapter/projektiAdapter";
import { DBProjekti, LausuntoPyynnonTaydennys } from "../../../../../src/database/model";
import * as API from "hassu-common/graphql/apiModel";
import { handleEvents } from "../../../../../src/projekti/projektiHandler";
export const removedMuuAineistoRemovedMuistutusButBothNotYetValmis = async () => {
  const { handleChangedAineistotAndTiedostotStub, handleChangedAineistoStub, handleChangedTiedostotStub } = stubBasics();
  const oldLPTs = [
    {
      uuid: "jotain",
      kunta: 1,
      poistumisPaiva: "2022-01-01",
      muistutukset: [
        {
          tiedosto: "uploads/345345235.txt",
          nimi: "odottaa_persistointia_muistutus.txt",
          tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
          uuid: "muistutus_op",
        },
      ],
      muuAineisto: [
        {
          tiedosto: "uploads/235325345.txt",
          nimi: "odottaa_persistointia_muu_aineisto.txt",
          tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
          uuid: "aineisto_op",
        },
      ],
    },
  ];
  const projektiInDB: DBProjekti = {
    ...testDbProjekti,
    lausuntoPyynnonTaydennykset: oldLPTs,
  };
  const input: API.TallennaProjektiInput = {
    oid: projektiInDB.oid,
    versio: projektiInDB.versio,
    lausuntoPyynnonTaydennykset: [
      {
        uuid: "jotain",
        kunta: 1,
        poistumisPaiva: "2022-01-01",
        muistutukset: [
          {
            tiedosto: "uploads/345345235.txt",
            nimi: "odottaa_persistointia_muistutus.txt",
            tila: API.LadattuTiedostoTila.ODOTTAA_POISTOA,
            uuid: "muistutus_op",
          },
        ],
        muuAineisto: [
          {
            tiedosto: "uploads/235325345.txt",
            nimi: "odottaa_persistointia_muu_aineisto.txt",
            tila: API.LadattuTiedostoTila.ODOTTAA_POISTOA,
            uuid: "aineisto_op",
          },
        ],
      },
    ],
  };
  const projektiAdaptationResult = await projektiAdapter.adaptProjektiToSave(projektiInDB, input);
  const expectedLausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennys[] = [
    {
      uuid: "jotain",
      kunta: 1,
      poistumisPaiva: "2022-01-01",
      muistutukset: [],
      muuAineisto: [],
    },
  ];
  expect(projektiAdaptationResult.projekti.lausuntoPyynnonTaydennykset).to.eql(expectedLausuntoPyynnonTaydennykset);
  await handleEvents(projektiAdaptationResult);
  expect(handleChangedAineistotAndTiedostotStub.callCount).to.eql(0);
  expect(handleChangedAineistoStub.callCount).to.eql(0);
  expect(handleChangedTiedostotStub.callCount).to.eql(1);
};
