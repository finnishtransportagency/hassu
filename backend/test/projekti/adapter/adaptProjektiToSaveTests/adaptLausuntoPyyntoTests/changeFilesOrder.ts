import { expect } from "chai";
import { stubBasics, testDbProjekti } from "../util";
import { projektiAdapter } from "../../../../../src/projekti/adapter/projektiAdapter";
import { DBProjekti, LausuntoPyynto } from "../../../../../src/database/model";
import * as API from "hassu-common/graphql/apiModel";
import { handleEvents } from "../../../../../src/projekti/projektiHandler";
export const changeFilesOrder = async () => {
  const { handleChangedAineistotAndTiedostotStub, handleChangedAineistoStub, handleChangedTiedostotStub } = stubBasics();
  const oldLPs = [
    {
      uuid: "jotain",
      poistumisPaiva: "2022-01-01",
      lisaAineistot: [
        {
          tiedosto: "/lausuntopyynnon_taydennys/jotain/eka.txt",
          nimi: "eka.txt",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "2021-01-01T01:01",
          jarjestys: 0,
        },
        {
          tiedosto: "/lausuntopyynnon_taydennys/jotain/toka.txt",
          nimi: "toka.txt",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "2021-01-01T01:02",
          jarjestys: 1,
        },
        {
          tiedosto: "/lausuntopyynnon_taydennys/jotain/kolmas.txt",
          nimi: "kolmas.txt",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "2021-01-01T01:03",
          jarjestys: 2,
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
        poistumisPaiva: "2022-01-01",
        lisaAineistot: [
          {
            tiedosto: "/lausuntopyynnon_taydennys/jotain/toka.txt",
            nimi: "toka.txt",
            tila: API.LadattuTiedostoTila.VALMIS,
            jarjestys: 0,
          },
          {
            tiedosto: "/lausuntopyynnon_taydennys/jotain/eka.txt",
            nimi: "eka.txt",
            tila: API.LadattuTiedostoTila.VALMIS,
            jarjestys: 1,
          },
          {
            tiedosto: "/lausuntopyynnon_taydennys/jotain/kolmas.txt",
            nimi: "kolmas.txt",
            tila: API.LadattuTiedostoTila.VALMIS,
            jarjestys: 2,
          },
        ],
      },
    ],
  };
  const projektiAdaptationResult = await projektiAdapter.adaptProjektiToSave(projektiInDB, input);
  const expectedLausuntoPyynnot: LausuntoPyynto[] = [
    {
      uuid: "jotain",
      poistumisPaiva: "2022-01-01",
      lisaAineistot: [
        {
          tiedosto: "/lausuntopyynnon_taydennys/jotain/toka.txt",
          nimi: "toka.txt",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "2021-01-01T01:02",
          jarjestys: 0,
        },
        {
          tiedosto: "/lausuntopyynnon_taydennys/jotain/eka.txt",
          nimi: "eka.txt",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "2021-01-01T01:01",
          jarjestys: 1,
        },
        {
          tiedosto: "/lausuntopyynnon_taydennys/jotain/kolmas.txt",
          nimi: "kolmas.txt",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "2021-01-01T01:03",
          jarjestys: 2,
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
