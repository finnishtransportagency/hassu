import { expect } from "chai";
import { stubBasics, testDbProjekti } from "../util";
import { projektiAdapter } from "../../../../../src/projekti/adapter/projektiAdapter";
import { DBProjekti, LausuntoPyynto } from "../../../../../src/database/model";
import * as API from "hassu-common/graphql/apiModel";
import { handleEvents } from "../../../../../src/projekti/projektiHandler";
export const noChanges = async () => {
  const { handleChangedAineistotAndTiedostotStub, handleChangedAineistoStub, handleChangedTiedostotStub } = stubBasics();
  const oldLPs = [
    {
      uuid: "jotain",
      poistumisPaiva: "2022-01-01",
      lisaAineistot: [
        {
          tiedosto: "/lausuntopyynnon_taydennys/jotain/aineisto.txt",
          nimi: "aineisto.txt",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "2021-01-01T01:01",
          uuid: "aineisto",
        },
      ],
    },
  ];
  const projektiInDB: DBProjekti = {
    ...testDbProjekti,
    lausuntoPyynnot: oldLPs,
  };
  const input: API.TallennaProjektiInput = {
    oid: projektiInDB.oid,
    versio: projektiInDB.versio,
    lausuntoPyynnot: [
      {
        uuid: "jotain",
        poistumisPaiva: "2022-01-02", // only this changed
        lisaAineistot: [
          {
            tiedosto: "/lausuntopyynnon_taydennys/jotain/aineisto.txt",
            nimi: "aineisto.txt",
            tila: API.LadattuTiedostoTila.VALMIS,
            uuid: "aineisto",
          },
        ],
      },
    ],
  };
  const projektiAdaptationResult = await projektiAdapter.adaptProjektiToSave(projektiInDB, input);
  const expectedLausuntoPyynnot: LausuntoPyynto[] = [
    {
      uuid: "jotain",
      poistumisPaiva: "2022-01-02",
      lisaAineistot: [
        {
          tiedosto: "/lausuntopyynnon_taydennys/jotain/aineisto.txt",
          nimi: "aineisto.txt",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "2021-01-01T01:01",
          uuid: "aineisto",
        },
      ],
    },
  ];
  expect(projektiAdaptationResult.projekti.lausuntoPyynnot).to.eql(expectedLausuntoPyynnot);
  await handleEvents(projektiAdaptationResult);
  expect(handleChangedAineistotAndTiedostotStub.callCount).to.eql(0);
  expect(handleChangedAineistoStub.callCount).to.eql(0);
  expect(handleChangedTiedostotStub.callCount).to.eql(0);
};
