import { describe, it } from "mocha";
import { adaptVuorovaikutusKierrosToSave } from "../../../src/projekti/adapter/adaptToDB";
import { ProjektiAdaptationResult } from "../../../src/projekti/adapter/projektiAdaptationResult";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import { IlmoitettavaViranomainen, VuorovaikutusTilaisuusTyyppi } from "../../../../common/graphql/apiModel";

const { expect } = require("chai");

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
          Saapumisohjeet: {
            SUOMI: "",
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
      vuorovaikutusNumero: 0,
      kysymyksetJaPalautteetViimeistaan: "2023-02-22",
    };

    const result = adaptVuorovaikutusKierrosToSave(dbProjekti, vuorovaikutusKierrosInput, new ProjektiAdaptationResult(dbProjekti));

    expect(result).toMatchSnapshot();
  });
});
