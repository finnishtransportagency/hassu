import { DBProjekti, LausuntoPyynto } from "../../../src/database/model";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import { fakeEventInSqsQueue, stubBasics } from "./util/util";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";
import { cleanupLausuntoPyyntoTimestamps } from "../../../commonTestUtil/cleanUpFunctions";

// sqsEventHandlerLambda handles event FILES_CHANGED by persisting lausuntoPyynto files when there is one lausuntoPyynto
export const filesChangedPersistsLausuntoPyyntoFiles = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.FILES_CHANGED, projektiOid: "1" });
  const projekti: DBProjekti = {
    oid: "1.2.246.578.5.1.2978288874.2711575506",
    versio: 8,
    kayttoOikeudet: [],
    salt: "salt",
    tallennettu: true,
    velho: { nimi: "Projekti 1" },
    lausuntoPyynnot: [
      {
        uuid: "ee626b8b-e719-4d47-b161-06f7455614b4",
        poistumisPaiva: "2023-11-16",
        muistiinpano: "ff",
        lisaAineistot: [
          {
            nimi: "Screenshot 2023-09-29 at 17.59.03.png",
            jarjestys: 0,
            tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
            tiedosto: "/e6169b47-2035-40e5-9343-46fec03f7e95/Screenshot 2023-09-29 at 17.59.03.png",
            uuid: "792d8ce0-f412-4a11-9f28-32399365e5ed",
          },
          {
            nimi: "Screenshot 2023-09-28 at 12.24.31.png",
            jarjestys: 1,
            tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
            tiedosto: "/e9ab1d6a-e8fd-4796-adea-d8e8e55e3481/Screenshot 2023-09-28 at 12.24.31.png",
            uuid: "4e248d4c-ac3b-493e-9678-acd2f1f0d695",
          },
        ],
      },
    ],
  };
  const { saveProjektiInternalStub, persistFileStub, deleteFileStub, addEventZipLausuntoPyyntoAineistoStub } = stubBasics({
    loadProjektiByOidReturnValue: projekti,
    applyProjektiStatusSetStatus: API.Status.NAHTAVILLAOLO,
  });
  await handler();
  expect(saveProjektiInternalStub.callCount).to.eql(1);
  expect(saveProjektiInternalStub.firstCall).to.exist;
  expect(saveProjektiInternalStub.firstCall.args).to.exist;
  expect(saveProjektiInternalStub.firstCall.args[0]).to.exist;
  const firstArgs = saveProjektiInternalStub.firstCall.args[0];
  expect((Object.keys(firstArgs) as (keyof DBProjekti)[]).filter((key) => !!firstArgs[key])).to.eql(["oid", "versio", "lausuntoPyynnot"]);
  expect(firstArgs.oid).to.eql("1.2.246.578.5.1.2978288874.2711575506");
  expect(firstArgs.versio).to.eql(8);
  const expectedLausuntoPyynnot: LausuntoPyynto[] = [
    {
      uuid: "ee626b8b-e719-4d47-b161-06f7455614b4",
      poistumisPaiva: "2022-01-01",
      lisaAineistot: [
        {
          nimi: "Screenshot 2023-09-29 at 17.59.03.png",
          jarjestys: 0,
          tila: API.LadattuTiedostoTila.VALMIS,
          tiedosto: "/lausuntopyynto/ee626b8b-e719-4d47-b161-06f7455614b4/Screenshot 2023-09-29 at 17.59.03.png",
          tuotu: "***unittest***",
          uuid: "792d8ce0-f412-4a11-9f28-32399365e5ed",
        },
        {
          nimi: "Screenshot 2023-09-28 at 12.24.31.png",
          jarjestys: 1,
          tila: API.LadattuTiedostoTila.VALMIS,
          tiedosto: "/lausuntopyynto/ee626b8b-e719-4d47-b161-06f7455614b4/Screenshot 2023-09-28 at 12.24.31.png",
          tuotu: "***unittest***",
          uuid: "4e248d4c-ac3b-493e-9678-acd2f1f0d695",
        },
      ],
    },
  ];
  expect(cleanupLausuntoPyyntoTimestamps(firstArgs.lausuntoPyynnot?.[0])?.lisaAineistot).to.eql(expectedLausuntoPyynnot[0].lisaAineistot);
  expect(persistFileStub?.callCount).to.eql(2);
  expect(deleteFileStub.callCount).to.eql(0);
  expect(addEventZipLausuntoPyyntoAineistoStub.callCount).to.eql(1);
};
