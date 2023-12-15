import { describe, it } from "mocha";
import { adaptVuorovaikutusKierrosToSave } from "../../../src/projekti/adapter/adaptToDB";
import { ProjektiAdaptationResult } from "../../../src/projekti/adapter/projektiAdaptationResult";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import {
  IlmoitettavaViranomainen,
  KaytettavaPalvelu,
  VuorovaikutusKierrosInput,
  VuorovaikutusKierrosTila,
  VuorovaikutusTilaisuusTyyppi,
} from "hassu-common/graphql/apiModel";
import { VuorovaikutusKierros } from "../../../src/database/model";
import { cloneDeep } from "lodash";

import { expect } from "chai";

describe("adaptVuorovaikutusKierrosToSave", () => {
  it("should adapt vuorovaikutuskierros to save", async () => {
    const dbProjekti = new ProjektiFixture().dbProjekti1();
    delete dbProjekti.kielitiedot?.toissijainenKieli;
    const vuorovaikutusKierrosInput = {
      ilmoituksenVastaanottajat: {
        viranomaiset: [
          {
            nimi: IlmoitettavaViranomainen.KAINUUN_ELY,
            sahkoposti: "kirjaamo.kainuu@ely-keskus.fi",
          },
        ],
        kunnat: [
          {
            id: 620,
            sahkoposti: "maikol@iki.fi",
          },
        ],
      },
      vuorovaikutusTilaisuudet: [
        {
          nimi: {
            SUOMI: "fdsaadfs",
          },
          paivamaara: "2023-02-23",
          alkamisAika: "00:00",
          paattymisAika: "00:00",
          tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
          paikka: {
            SUOMI: "adfsdfas",
          },
          osoite: {
            SUOMI: "dfsasdaf",
          },
          postinumero: "12344",
          postitoimipaikka: {
            SUOMI: "",
          },
          lisatiedot: {
            SUOMI: "",
          },
        },
        {
          nimi: {
            SUOMI: "fdsaadfs",
          },
          paivamaara: "2023-02-23",
          alkamisAika: "00:00",
          paattymisAika: "00:00",
          tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
          kaytettavaPalvelu: KaytettavaPalvelu.TEAMS,
          linkki: "http://www.fi",
          lisatiedot: {
            SUOMI: "Voit liittyä tilaisuuteen myös puhelimella soittamalla numeroon 05012345.",
          },
        },
      ],
      esitettavatYhteystiedot: {
        yhteysTiedot: [],
        yhteysHenkilot: [],
      },
      vuorovaikutusJulkaisuPaiva: "2023-02-20",
      hankkeenKuvaus: {
        SUOMI: "Kuvaus",
      },
      vuorovaikutusNumero: 1,
      kysymyksetJaPalautteetViimeistaan: "2023-02-22",
    };

    const result = adaptVuorovaikutusKierrosToSave(dbProjekti, vuorovaikutusKierrosInput, new ProjektiAdaptationResult(dbProjekti));

    expect(result).toMatchSnapshot();
  });

  it("should not null keys that are not given", async () => {
    const dbProjekti = new ProjektiFixture().dbProjektiLackingNahtavillaoloVaihe();
    dbProjekti.vuorovaikutusKierros = {
      ...dbProjekti.vuorovaikutusKierros,
      vuorovaikutusNumero: 1,
      tila: VuorovaikutusKierrosTila.MUOKATTAVISSA,
    };
    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = {
      vuorovaikutusNumero: 1,
      esittelyaineistot: [],
    };

    const expectedResult: VuorovaikutusKierros = cloneDeep({
      ...dbProjekti.vuorovaikutusKierros,
      aineistot: [],
    });

    const result = adaptVuorovaikutusKierrosToSave(dbProjekti, vuorovaikutusKierrosInput, new ProjektiAdaptationResult(dbProjekti));

    expect(result).to.eql(expectedResult);
  });

  it("should allow esitettavatYhteystiedot.yhteystiedot to be emptied", async () => {
    const dbProjekti = new ProjektiFixture().dbProjektiLackingNahtavillaoloVaihe();
    const vuorovaikutusNumero = 1;
    dbProjekti.vuorovaikutusKierros = {
      ...dbProjekti.vuorovaikutusKierros,
      esitettavatYhteystiedot: {
        yhteysTiedot: [
          {
            etunimi: "etunimi",
            puhelinnumero: "123456",
            sahkoposti: "sahkoposti@sahkoposti.fi",
            sukunimi: "sukunimi",
            elyOrganisaatio: undefined,
            kunta: undefined,
            organisaatio: "organisaatio",
            titteli: undefined,
          },
        ],
        yhteysHenkilot: ["A000111"],
      },
      vuorovaikutusNumero,
      tila: VuorovaikutusKierrosTila.MUOKATTAVISSA,
    };

    const result = adaptVuorovaikutusKierrosToSave(
      dbProjekti,
      { vuorovaikutusNumero, esitettavatYhteystiedot: { yhteysHenkilot: [], yhteysTiedot: [] } },
      new ProjektiAdaptationResult(dbProjekti)
    );

    expect(result?.esitettavatYhteystiedot?.yhteysTiedot?.length).to.eql(0);
  });
});
