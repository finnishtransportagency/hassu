import { describe, it } from "mocha";
import * as API from "../../../common/graphql/apiModel";
import {
  collectEiPeruttuVuorovaikutusSorted,
  collectVuorovaikutusJulkinen,
  getEndTime,
  getLastVuorovaikutusDateTime,
  jarjestaLoppumisajanMukaan,
  ProjektiVuorovaikutuksilla,
} from "../../src/util/vuorovaikutus";
import { expect } from "chai";
import dayjs from "dayjs";

describe("vuorovaikutus helper funtions;", () => {
  it("getEndTime should return the correct end time", async function () {
    const tilaisuus = {
      nimi: {
        SUOMI: "This should be second",
      },
      tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
      paivamaara: "2023-02-01",
      alkamisAika: "12:00",
      paattymisAika: "13:00",
    };
    const endTime = getEndTime(tilaisuus);
    expect(endTime).to.eql(dayjs("2023-02-0113:00").toDate().getTime());
  });

  it("jarjestaLoppumisajanMukaan should return 0 for equal dates", async function () {
    const tilaisuus = {
      nimi: {
        SUOMI: "This should be second",
      },
      tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
      paivamaara: "2023-02-01",
      alkamisAika: "12:00",
      paattymisAika: "13:00",
    };
    const value = jarjestaLoppumisajanMukaan(tilaisuus, tilaisuus);
    expect(value).to.eql(0);
  });

  it("jarjestaLoppumisajanMukaan should return a positive number if first VuorovaikutusTilaisuus is later", async function () {
    const tilaisuusA = {
      nimi: {
        SUOMI: "This should be second",
      },
      tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
      paivamaara: "2023-02-01",
      alkamisAika: "12:00",
      paattymisAika: "13:01",
    };
    const tilaisuusB = {
      nimi: {
        SUOMI: "This should be second",
      },
      tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
      paivamaara: "2023-02-01",
      alkamisAika: "12:00",
      paattymisAika: "13:00",
    };
    const value = jarjestaLoppumisajanMukaan(tilaisuusA, tilaisuusB);
    expect(value).to.not.be.lessThanOrEqual(0);
  });

  it("jarjestaLoppumisajanMukaan should return a positive number if first VuorovaikutusTilaisuus is later", async function () {
    const tilaisuusA = {
      nimi: {
        SUOMI: "This should be second",
      },
      tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
      paivamaara: "2023-02-01",
      alkamisAika: "12:00",
      paattymisAika: "13:01",
    };
    const tilaisuusB = {
      nimi: {
        SUOMI: "This should be second",
      },
      tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
      paivamaara: "2023-02-01",
      alkamisAika: "12:00",
      paattymisAika: "13:00",
    };
    const value = jarjestaLoppumisajanMukaan(tilaisuusA, tilaisuusB);
    expect(value).to.not.be.lessThanOrEqual(0);
  });

  it("getLastVuorovaikutusDateTime should return the last vuorovaikutusTilaisuus dateTime", async function () {
    const vuorovaikutusKierrosJulkaisut: ProjektiVuorovaikutuksilla = {
      vuorovaikutusKierrosJulkaisut: [
        {
          tila: API.VuorovaikutusKierrosTila.JULKINEN,
          vuorovaikutusJulkaisuPaiva: "2023-01-01",
          vuorovaikutusTilaisuudet: [
            {
              nimi: {
                SUOMI: "This should be second",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-01-01",
              alkamisAika: "12:00",
              paattymisAika: "13:00",
            },
            {
              nimi: {
                SUOMI: "This should be first",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-01-01",
              alkamisAika: "11:00",
              paattymisAika: "12:00",
            },
          ],
        },
        {
          tila: API.VuorovaikutusKierrosTila.JULKINEN,
          vuorovaikutusJulkaisuPaiva: "2023-01-01",
          vuorovaikutusTilaisuudet: [
            {
              nimi: {
                SUOMI: "This should be third",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-02-01",
              alkamisAika: "11:00",
              paattymisAika: "12:00",
            },
            {
              nimi: {
                SUOMI: "This should be fourth",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-02-01",
              alkamisAika: "12:00",
              paattymisAika: "13:00",
            },
          ],
        },
      ],
    };
    const lastVuorovaikutusDateTime = getLastVuorovaikutusDateTime(vuorovaikutusKierrosJulkaisut);
    expect(lastVuorovaikutusDateTime?.toString()).to.eql(dayjs("2023-02-0113:00").toString());
  });

  it("collectVuorovaikutusJulkinen should collect the right VuorovaikutusTilaisuus", async function () {
    const vuorovaikutusKierrosJulkaisut: ProjektiVuorovaikutuksilla = {
      vuorovaikutusKierrosJulkaisut: [
        {
          tila: API.VuorovaikutusKierrosTila.JULKINEN,
          vuorovaikutusJulkaisuPaiva: "2022-01-01",
          vuorovaikutusTilaisuudet: [
            {
              nimi: {
                SUOMI: "This should be second",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-01-01",
              alkamisAika: "12:00",
              paattymisAika: "13:00",
            },
            {
              nimi: {
                SUOMI: "This should be first",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-01-02",
              alkamisAika: "11:00",
              paattymisAika: "12:00",
            },
          ],
        },
        {
          tila: API.VuorovaikutusKierrosTila.JULKINEN,
          vuorovaikutusJulkaisuPaiva: "2222-01-01",
          vuorovaikutusTilaisuudet: [
            {
              nimi: {
                SUOMI: "Not published",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2222-02-01",
              alkamisAika: "11:00",
              paattymisAika: "12:00",
            },
            {
              nimi: {
                SUOMI: "Not published",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2222-02-01",
              alkamisAika: "12:00",
              paattymisAika: "13:00",
            },
          ],
        },
      ],
    };
    const publishedVuorovaikutus = collectVuorovaikutusJulkinen(vuorovaikutusKierrosJulkaisut);
    expect(publishedVuorovaikutus.length).to.eql(2);
    expect(publishedVuorovaikutus[0].paivamaara).to.eql("2023-01-01");
  });

  it("collectEiPeruttuVuorovaikutusSorted should collect the right VuorovaikutusTilaisuus", async function () {
    const vuorovaikutusKierrosJulkaisut: ProjektiVuorovaikutuksilla = {
      vuorovaikutusKierrosJulkaisut: [
        {
          tila: API.VuorovaikutusKierrosTila.JULKINEN,
          vuorovaikutusJulkaisuPaiva: "2022-01-01",
          vuorovaikutusTilaisuudet: [
            {
              nimi: {
                SUOMI: "This should be second",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-01-01",
              alkamisAika: "12:00",
              paattymisAika: "13:00",
            },
            {
              nimi: {
                SUOMI: "This should be first",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-01-01",
              alkamisAika: "11:00",
              paattymisAika: "12:00",
            },
          ],
        },
        {
          tila: API.VuorovaikutusKierrosTila.JULKINEN,
          vuorovaikutusJulkaisuPaiva: "2022-02-01",
          vuorovaikutusTilaisuudet: [
            {
              nimi: {
                SUOMI: "This should be fourth",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-01-01",
              alkamisAika: "13:00",
              paattymisAika: "15:00",
            },
            {
              nimi: {
                SUOMI: "This is cancelled",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-01-02",
              alkamisAika: "11:00",
              paattymisAika: "12:00",
              peruttu: true,
            },
            {
              nimi: {
                SUOMI: "This should be third",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-01-01",
              alkamisAika: "12:00",
              paattymisAika: "13:00",
            },
          ],
        },
        {
          tila: API.VuorovaikutusKierrosTila.JULKINEN,
          vuorovaikutusJulkaisuPaiva: "2222-01-01",
          vuorovaikutusTilaisuudet: [
            {
              nimi: {
                SUOMI: "Not published",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2222-02-01",
              alkamisAika: "11:00",
              paattymisAika: "12:00",
            },
            {
              nimi: {
                SUOMI: "Not published",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2222-02-01",
              alkamisAika: "12:00",
              paattymisAika: "13:00",
            },
          ],
        },
      ],
    };
    const sortedNotPeruttuTilaisuus = collectEiPeruttuVuorovaikutusSorted(vuorovaikutusKierrosJulkaisut);
    expect(sortedNotPeruttuTilaisuus.length).to.eql(4);
    expect(sortedNotPeruttuTilaisuus[0].nimi?.SUOMI).to.eql("This should be first");
    expect(sortedNotPeruttuTilaisuus[1].nimi?.SUOMI).to.eql("This should be second");
    expect(sortedNotPeruttuTilaisuus[2].nimi?.SUOMI).to.eql("This should be third");
    expect(sortedNotPeruttuTilaisuus[3].nimi?.SUOMI).to.eql("This should be fourth");
  });

  it("getLastVuorovaikutusDateTime should return the right datetime, even when some VuorovaikutusKierros is not published, and some VuorovaikutusTilaisuus are cancelled", async function () {
    const vuorovaikutusKierrosJulkaisut: ProjektiVuorovaikutuksilla = {
      vuorovaikutusKierrosJulkaisut: [
        {
          tila: API.VuorovaikutusKierrosTila.JULKINEN,
          vuorovaikutusJulkaisuPaiva: "2022-01-01",
          vuorovaikutusTilaisuudet: [
            {
              nimi: {
                SUOMI: "This should be second",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-01-01",
              alkamisAika: "12:00",
              paattymisAika: "13:00",
            },
            {
              nimi: {
                SUOMI: "This should be first",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-01-01",
              alkamisAika: "11:00",
              paattymisAika: "12:00",
            },
          ],
        },
        {
          tila: API.VuorovaikutusKierrosTila.JULKINEN,
          vuorovaikutusJulkaisuPaiva: "2022-02-01",
          vuorovaikutusTilaisuudet: [
            {
              nimi: {
                SUOMI: "This should be fourth",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-01-01",
              alkamisAika: "13:00",
              paattymisAika: "15:00",
            },
            {
              nimi: {
                SUOMI: "This is cancelled",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-01-02",
              alkamisAika: "11:00",
              paattymisAika: "12:00",
              peruttu: true,
            },
            {
              nimi: {
                SUOMI: "This should be third",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2023-01-01",
              alkamisAika: "12:00",
              paattymisAika: "13:00",
            },
          ],
        },
        {
          tila: API.VuorovaikutusKierrosTila.JULKINEN,
          vuorovaikutusJulkaisuPaiva: "2222-01-01",
          vuorovaikutusTilaisuudet: [
            {
              nimi: {
                SUOMI: "Not published",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2222-02-01",
              alkamisAika: "11:00",
              paattymisAika: "12:00",
            },
            {
              nimi: {
                SUOMI: "Not published",
              },
              tyyppi: API.VuorovaikutusTilaisuusTyyppi.PAIKALLA,
              paivamaara: "2222-02-01",
              alkamisAika: "12:00",
              paattymisAika: "13:00",
            },
          ],
        },
      ],
    };
    const lastDateTime = getLastVuorovaikutusDateTime(vuorovaikutusKierrosJulkaisut);
    expect(lastDateTime?.toString()).to.eql(dayjs("2023-01-0115:00").toString());
  });
});
