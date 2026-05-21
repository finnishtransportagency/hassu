// Contains code generated or recommended by Amazon Q
import { expect } from "chai";
import { adaptOmistajaToIndex, adaptSearchResultsToApiOmistaja } from "../../../src/projektiSearch/omistajaSearch/kiinteistonomistajaSearchAdapter";
import { DBOmistaja } from "../../../src/database/omistajaDatabase";
import { LahetysTapa, TiedotettavanLahetyksenTila } from "hassu-common/graphql/apiModel";

describe("kiinteistonomistajaSearchAdapter", () => {
  describe("adaptOmistajaToIndex", () => {
    it("should set hasHetu true when henkilotunnus exists", () => {
      const omistaja: DBOmistaja = {
        id: "1",
        oid: "1.2.3",
        kiinteistotunnus: "09100100010001",
        henkilotunnus: "010101-123A",
        etunimet: "Matti",
        sukunimi: "Meikäläinen",
        jakeluosoite: "Katu 1",
        postinumero: "00100",
        paikkakunta: "Helsinki",
        kaytossa: true,
        lisatty: "2024-01-01",
        expires: 0,
      };
      const result = adaptOmistajaToIndex(omistaja);
      expect(result.hasHetu).to.equal(true);
    });

    it("should set hasHetu false when henkilotunnus is missing", () => {
      const omistaja: DBOmistaja = {
        id: "2",
        oid: "1.2.3",
        kiinteistotunnus: "09100100010001",
        etunimet: "Jatta",
        sukunimi: "Tuntematon",
        jakeluosoite: "Katu 2",
        postinumero: "00100",
        paikkakunta: "Helsinki",
        kaytossa: true,
        lisatty: "2024-01-01",
        expires: 0,
      };
      const result = adaptOmistajaToIndex(omistaja);
      expect(result.hasHetu).to.equal(false);
    });

    it("should set viimeisinLahetysTapa from latest lahetys", () => {
      const omistaja: DBOmistaja = {
        id: "3",
        oid: "1.2.3",
        kiinteistotunnus: "09100100010001",
        henkilotunnus: "010101-123A",
        etunimet: "Matti",
        sukunimi: "Meikäläinen",
        jakeluosoite: "Katu 1",
        postinumero: "00100",
        paikkakunta: "Helsinki",
        kaytossa: true,
        lisatty: "2024-01-01",
        expires: 0,
        lahetykset: [
          { tila: TiedotettavanLahetyksenTila.OK, lahetysaika: "2024-01-01T10:00:00+02:00", lahetysTapa: LahetysTapa.KIRJE },
          { tila: TiedotettavanLahetyksenTila.OK, lahetysaika: "2024-06-01T10:00:00+02:00", lahetysTapa: LahetysTapa.VIESTI },
        ],
      };
      const result = adaptOmistajaToIndex(omistaja);
      expect(result.viimeisinLahetysTapa).to.equal(LahetysTapa.VIESTI);
      expect(result.viimeisinTila).to.equal(TiedotettavanLahetyksenTila.OK);
      expect(result.viimeisinLahetysaika).to.equal("2024-06-01T10:00:00+02:00");
    });

    it("should set viimeisinLahetysTapa null when no lahetykset", () => {
      const omistaja: DBOmistaja = {
        id: "4",
        oid: "1.2.3",
        kiinteistotunnus: "09100100010001",
        henkilotunnus: "010101-123A",
        etunimet: "Matti",
        sukunimi: "Meikäläinen",
        jakeluosoite: "Katu 1",
        postinumero: "00100",
        paikkakunta: "Helsinki",
        kaytossa: true,
        lisatty: "2024-01-01",
        expires: 0,
      };
      const result = adaptOmistajaToIndex(omistaja);
      expect(result.viimeisinLahetysTapa).to.equal(null);
      expect(result.viimeisinTila).to.equal(null);
      expect(result.viimeisinLahetysaika).to.equal(null);
    });

    it("should include osoitetiedotSaatu field", () => {
      const omistaja: DBOmistaja = {
        id: "5",
        oid: "1.2.3",
        kiinteistotunnus: "09100100010001",
        etunimet: "Jatta",
        sukunimi: "Tuntematon",
        jakeluosoite: "Katu 2",
        postinumero: "00100",
        paikkakunta: "Helsinki",
        kaytossa: true,
        lisatty: "2024-01-01",
        expires: 0,
        osoitetiedotSaatu: true,
      };
      const result = adaptOmistajaToIndex(omistaja);
      expect(result.osoitetiedotSaatu).to.equal(true);
    });
  });

  describe("adaptSearchResultsToApiOmistaja", () => {
    it("should map hasHetu and viimeisinLahetysTapa to API model", () => {
      const results = {
        hits: {
          hits: [
            {
              _id: "id-1",
              _source: {
                oid: "1.2.3",
                kiinteistotunnus: "091-001-0001-0001",
                nimi: "Matti Meikäläinen",
                jakeluosoite: "Katu 1",
                postinumero: "00100",
                paikkakunta: "Helsinki",
                maa: "Suomi",
                maakoodi: "FI",
                lisatty: "2024-01-01",
                paivitetty: null,
                hasHetu: true,
                osoitetiedotSaatu: true,
                viimeisinLahetysaika: "2024-06-01T10:00:00+02:00",
                viimeisinTila: TiedotettavanLahetyksenTila.OK,
                viimeisinLahetysTapa: LahetysTapa.VIESTI,
              },
            },
            {
              _id: "id-2",
              _source: {
                oid: "1.2.3",
                kiinteistotunnus: "091-001-0001-0002",
                nimi: "Jatta Tuntematon",
                jakeluosoite: "Katu 2",
                postinumero: "00100",
                paikkakunta: "Helsinki",
                maa: "Suomi",
                maakoodi: "FI",
                lisatty: "2024-01-01",
                paivitetty: null,
                hasHetu: false,
                osoitetiedotSaatu: true,
                viimeisinLahetysaika: "2024-06-01T10:00:00+02:00",
                viimeisinTila: TiedotettavanLahetyksenTila.OK,
                viimeisinLahetysTapa: LahetysTapa.KIRJE,
              },
            },
          ],
        },
      };
      const apiOmistajat = adaptSearchResultsToApiOmistaja(results);
      expect(apiOmistajat).to.have.length(2);
      expect(apiOmistajat[0].hasHetu).to.equal(true);
      expect(apiOmistajat[0].viimeisinLahetysTapa).to.equal(LahetysTapa.VIESTI);
      expect(apiOmistajat[0].osoitetiedotSaatu).to.equal(true);
      expect(apiOmistajat[1].hasHetu).to.equal(false);
      expect(apiOmistajat[1].viimeisinLahetysTapa).to.equal(LahetysTapa.KIRJE);
    });
  });
});
