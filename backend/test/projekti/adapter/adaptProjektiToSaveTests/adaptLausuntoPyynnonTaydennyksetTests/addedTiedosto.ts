import { expect } from "chai";
import { stubBasics, testDbProjekti } from "../util";
import { projektiAdapter } from "../../../../../src/projekti/adapter/projektiAdapter";
import { DBProjekti, LausuntoPyynnonTaydennys } from "../../../../../src/database/model";
import * as API from "hassu-common/graphql/apiModel";
import { handleEvents } from "../../../../../src/projekti/projektiHandler";
export const addedTiedosto = async () => {
  const { handleChangedAineistotAndTiedostotStub, handleChangedAineistoStub, handleChangedTiedostotStub } = stubBasics();
  const oldLPTs = [
    {
      uuid: "jotain",
      kunta: 1,
      poistumisPaiva: "2022-01-01",
      muistutukset: [
        {
          tiedosto: "/lausuntopyynnon_taydennys/jotain/tiedosto.txt",
          nimi: "tiedosto.txt",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "2021-01-01T01:01",
        },
      ],
      muuAineisto: [
        {
          dokumenttiOid: "foo",
          tiedosto: "/lausuntopyynnon_taydennys/jotain/aineisto.txt",
          nimi: "aineisto.txt",
          tila: API.AineistoTila.VALMIS,
          tuotu: "2021-01-01T01:01",
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
            tiedosto: "/lausuntopyynnon_taydennys/jotain/tiedosto.txt",
            nimi: "tiedosto.txt",
            tila: API.LadattuTiedostoTila.VALMIS,
          },
          {
            tiedosto: "upload/23435345.txt",
            nimi: "tiedosto2.txt",
            tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
          },
        ],
        muuAineisto: [
          {
            dokumenttiOid: "foo",
            nimi: "aineisto.txt",
            tila: API.AineistoTila.VALMIS,
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
      muistutukset: [
        {
          tiedosto: "upload/23435345.txt",
          nimi: "tiedosto2.txt",
          tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
        },
        {
          tiedosto: "/lausuntopyynnon_taydennys/jotain/tiedosto.txt",
          nimi: "tiedosto.txt",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "2021-01-01T01:01",
        },
      ],
      muuAineisto: [
        {
          dokumenttiOid: "foo",
          tiedosto: "/lausuntopyynnon_taydennys/jotain/aineisto.txt",
          nimi: "aineisto.txt",
          tila: API.AineistoTila.VALMIS,
          tuotu: "2021-01-01T01:01",
          jarjestys: undefined,
          kategoriaId: undefined,
        },
      ],
    },
  ];
  expect(projektiAdaptationResult.projekti.lausuntoPyynnonTaydennykset).to.eql(expectedLausuntoPyynnonTaydennykset);
  await handleEvents(projektiAdaptationResult);
  expect(handleChangedAineistotAndTiedostotStub.callCount).to.eql(0);
  expect(handleChangedAineistoStub.callCount).to.eql(0);
  expect(handleChangedTiedostotStub.callCount).to.eql(1);
};