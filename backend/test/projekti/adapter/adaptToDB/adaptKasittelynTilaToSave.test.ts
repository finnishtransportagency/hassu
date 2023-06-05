import { describe, it } from "mocha";
import { ProjektiAdaptationResult } from "../../../../src/projekti/adapter/projektiAdaptationResult";
import { ProjektiFixture } from "../../../fixture/projektiFixture";
import { cloneDeep, identity, pickBy } from "lodash";
import { KasittelyntilaInput } from "../../../../../common/graphql/apiModel";
import { adaptKasittelynTilaToSave } from "../../../../src/projekti/adapter/adaptToDB/adaptKasittelynTilaToSave";
import { KasittelynTila } from "../../../../src/database/model";

const { expect } = require("chai");

describe("adaptKasittelynTilaToSave", () => {
  it("should save paatos when valipaatos is already saved", async () => {
    const dbProjekti = new ProjektiFixture().dbProjekti1();
    dbProjekti.kasittelynTila = {
      ennakkoneuvotteluPaiva: "2023-04-20",
      ensimmainenJatkopaatos: {
        paatoksenPvm: "2023-04-21",
      },
      hyvaksymisesitysTraficomiinPaiva: "2023-04-21",

      hyvaksymispaatos: {
        aktiivinen: true,
        asianumero: "VÄYLÄ/1234/01.02.03/2022",
        paatoksenPvm: "2023-04-21",
      },
      lainvoimaAlkaen: "2023-04-22",
      lainvoimaPaattyen: "2023-04-23",
      liikenteeseenluovutusKokonaan: "2022-11-25",
      liikenteeseenluovutusOsittain: "2022-11-25",
      suunnitelmanTila: "suunnitelman-tila/sutil09",
      toinenJatkopaatos: {
        paatoksenPvm: "2020-01-01",
      },
      valitustenMaara: 3,
      hallintoOikeus: {
        valipaatos: {
          paiva: "2023-01-01",
          sisalto: "Blah blah",
        },
        hyvaksymisPaatosKumottu: false,
      },
      korkeinHallintoOikeus: undefined,
    };
    const kasittelynTilaInput: KasittelyntilaInput = {
      hallintoOikeus: {
        valipaatos: {
          paiva: "2023-01-01",
          sisalto: "Blah blah",
        },
        paatos: {
          paiva: "2023-01-03",
          sisalto: "Blah blah2",
        },
        hyvaksymisPaatosKumottu: true,
      },
    };

    const expectedResult: KasittelynTila = cloneDeep({
      ...dbProjekti.kasittelynTila,
      hallintoOikeus: {
        valipaatos: {
          paiva: "2023-01-01",
          sisalto: "Blah blah",
        },
        paatos: {
          paiva: "2023-01-03",
          sisalto: "Blah blah2",
        },
        hyvaksymisPaatosKumottu: true,
      },
    });

    const result = adaptKasittelynTilaToSave(
      pickBy(dbProjekti.kasittelynTila, identity),
      pickBy(kasittelynTilaInput, identity),
      new ProjektiAdaptationResult(dbProjekti)
    );

    expect(result).to.eql(expectedResult);
  });

  it("should adapt kasittelynTila to save", async () => {
    const dbProjekti = new ProjektiFixture().dbProjekti1();
    delete dbProjekti.kielitiedot?.toissijainenKieli;
    const kasittelynTilaInput: KasittelyntilaInput = {
      hallintoOikeus: {
        valipaatos: {
          paiva: "2023-01-01",
          sisalto: "Blah blah",
        },
        hyvaksymisPaatosKumottu: false,
      },
    };

    const result = adaptKasittelynTilaToSave(dbProjekti.kasittelynTila, kasittelynTilaInput, new ProjektiAdaptationResult(dbProjekti));
    expect(pickBy(result, identity)).eql(pickBy(kasittelynTilaInput, identity));
  });

  it("should not null keys that are not given", async () => {
    const dbProjekti = new ProjektiFixture().dbProjekti1();
    dbProjekti.kasittelynTila = {
      ennakkoneuvotteluPaiva: "2023-04-20",
      ensimmainenJatkopaatos: {
        paatoksenPvm: "2023-04-21",
      },
      hyvaksymisesitysTraficomiinPaiva: "2023-04-21",

      hyvaksymispaatos: {
        aktiivinen: true,
        asianumero: "VÄYLÄ/1234/01.02.03/2022",
        paatoksenPvm: "2023-04-21",
      },
      lainvoimaAlkaen: "2023-04-22",
      lainvoimaPaattyen: "2023-04-23",
      liikenteeseenluovutusKokonaan: "2022-11-25",
      liikenteeseenluovutusOsittain: "2022-11-25",
      suunnitelmanTila: "suunnitelman-tila/sutil09",
      toinenJatkopaatos: {
        paatoksenPvm: "2020-01-01",
      },
      valitustenMaara: 3,
    };
    const kasittelynTilaInput: KasittelyntilaInput = {
      hallintoOikeus: {
        valipaatos: {
          paiva: "2023-01-01",
          sisalto: "Blah blah",
        },
        hyvaksymisPaatosKumottu: false,
      },
    };

    const expectedResult: KasittelynTila = cloneDeep({
      ...dbProjekti.kasittelynTila,
      hallintoOikeus: {
        valipaatos: {
          paiva: "2023-01-01",
          sisalto: "Blah blah",
        },
        hyvaksymisPaatosKumottu: false,
      },
    });

    const result = adaptKasittelynTilaToSave(dbProjekti.kasittelynTila, kasittelynTilaInput, new ProjektiAdaptationResult(dbProjekti));

    expect(pickBy(result, identity)).to.eql(pickBy(expectedResult, identity));
  });

  it("should not null keys that are not given", async () => {
    const dbProjekti = new ProjektiFixture().dbProjekti1();
    dbProjekti.kasittelynTila = {
      ennakkoneuvotteluPaiva: "2023-04-20",
      ensimmainenJatkopaatos: {
        paatoksenPvm: "2023-04-21",
      },
      hyvaksymisesitysTraficomiinPaiva: "2023-04-21",

      hyvaksymispaatos: {
        aktiivinen: true,
        asianumero: "VÄYLÄ/1234/01.02.03/2022",
        paatoksenPvm: "2023-04-21",
      },
      lainvoimaAlkaen: "2023-04-22",
      lainvoimaPaattyen: "2023-04-23",
      liikenteeseenluovutusKokonaan: "2022-11-25",
      liikenteeseenluovutusOsittain: "2022-11-25",
      suunnitelmanTila: "suunnitelman-tila/sutil09",
      toinenJatkopaatos: {
        paatoksenPvm: "2020-01-01",
      },
      valitustenMaara: 3,
      hallintoOikeus: {
        valipaatos: {
          paiva: "2023-01-01",
          sisalto: "Blah blah",
        },
        hyvaksymisPaatosKumottu: false,
      },
      korkeinHallintoOikeus: undefined,
    };
    const kasittelynTilaInput: KasittelyntilaInput = {
      hallintoOikeus: null,
    };

    const expectedResult: KasittelynTila = cloneDeep({
      ...dbProjekti.kasittelynTila,
    });

    const result = adaptKasittelynTilaToSave(
      pickBy(dbProjekti.kasittelynTila, identity),
      pickBy(kasittelynTilaInput, identity),
      new ProjektiAdaptationResult(dbProjekti)
    );

    expect(result).to.eql(expectedResult);
  });
});
