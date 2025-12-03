import {
  IlmoitettavaViranomainen,
  Projekti,
  Status,
  KirjaamoOsoite,
  SuunnittelustaVastaavaViranomainen,
  MuokkausTila,
  KuntaVastaanottajaInput,
} from "@services/api";
import * as isEvkUtil from "common/util/isEvkAktivoitu";
import { PaatosTyyppi } from "common/hyvaksymisPaatosUtil";
import defaultVastaanottajat from "src/util/defaultVastaanottajat";

describe("defaultVastaanottajat", () => {
  const kirjaamot: KirjaamoOsoite[] = [
    { nimi: IlmoitettavaViranomainen.VAYLAVIRASTO, sahkoposti: "vayla@kirjaamo.fi", __typename: "KirjaamoOsoite" },
    { nimi: IlmoitettavaViranomainen.UUDENMAAN_ELY, sahkoposti: "uusimaa@uusimaa.ely.fi", __typename: "KirjaamoOsoite" },
    { nimi: IlmoitettavaViranomainen.PIRKANMAAN_ELY, sahkoposti: "pirkanmaa@pirkanmaa.ely.fi", __typename: "KirjaamoOsoite" },
    { nimi: IlmoitettavaViranomainen.SATAKUNNAN_ELY, sahkoposti: "satakunta@satakunta.ely.fi", __typename: "KirjaamoOsoite" },
    { nimi: IlmoitettavaViranomainen.LAPIN_ELY, sahkoposti: "lappi@lappi.ely.fi", __typename: "KirjaamoOsoite" },
    { nimi: IlmoitettavaViranomainen.LAPIN_EVK, sahkoposti: "lappi@lappi.evk.fi", __typename: "KirjaamoOsoite" },
    { nimi: IlmoitettavaViranomainen.UUDENMAAN_EVK, sahkoposti: "uusimaa@uusimaa.evk.fi", __typename: "KirjaamoOsoite" },
    { nimi: IlmoitettavaViranomainen.SISA_SUOMEN_EVK, sahkoposti: "sisa_suomi@sisa_suomi.evk.fi", __typename: "KirjaamoOsoite" },
    { nimi: IlmoitettavaViranomainen.LOUNAIS_SUOMEN_EVK, sahkoposti: "lounais-suomi@lounais-suomi.ely.fi", __typename: "KirjaamoOsoite" },
  ];

  describe("finds ELY recipients for new project (no existing data) when Väylävirasto is responsible", () => {
    beforeEach(() => {
      jest.spyOn(isEvkUtil, "isEvkAktivoitu").mockReturnValue(false);
    });

    it("should return kunnat, viranomaiset and maakunnat", () => {
      const helsinkiKuntaId = 91;
      const viranomainen = SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY;
      const projekti: Partial<Projekti> = {
        velho: {
          kunnat: [helsinkiKuntaId],
          suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
          __typename: "Velho",
        },
      };

      const result = defaultVastaanottajat(projekti as Projekti, null, kirjaamot, null);
      const expectedEmail = kirjaamot.find((k) => k.nimi === (viranomainen as string))?.sahkoposti;

      expect(result.kunnat).toEqual([{ id: helsinkiKuntaId, sahkoposti: "" }]);
      expect(result.maakunnat).toEqual([]);
      expect(result.viranomaiset?.[0]).toEqual({
        nimi: viranomainen,
        sahkoposti: expectedEmail,
      });
    });

    it("should return viranomaiset based on kunta", () => {
      const helsinkiKuntaId = 91;
      const tampereKuntaId = 837;
      const poriKuntaId = 609;
      const kunnat = [helsinkiKuntaId, tampereKuntaId, poriKuntaId];

      const projekti: Partial<Projekti> = {
        velho: {
          kunnat,
          suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
          __typename: "Velho",
        },
      };

      const result = defaultVastaanottajat(projekti as Projekti, null, kirjaamot, null);
      const expectedViranomaiset = [
        { nimi: IlmoitettavaViranomainen.UUDENMAAN_ELY, sahkoposti: "uusimaa@uusimaa.ely.fi" },
        {
          nimi: IlmoitettavaViranomainen.PIRKANMAAN_ELY,
          sahkoposti: "pirkanmaa@pirkanmaa.ely.fi",
        },
        {
          nimi: IlmoitettavaViranomainen.SATAKUNNAN_ELY,
          sahkoposti: "satakunta@satakunta.ely.fi",
        },
      ];

      expect(result.kunnat).toEqual(kunnat.map((kunta): KuntaVastaanottajaInput => ({ id: kunta, sahkoposti: "" })));
      expect(result.maakunnat).toEqual([]);
      expect(result.viranomaiset).toEqual(expectedViranomaiset);
    });

    it("should only return unique viranomaiset based on kunta", () => {
      const helsinkiKuntaId = 91;
      const vantaaKuntaId = 92;
      const poriKuntaId = 609;
      const kunnat = [helsinkiKuntaId, vantaaKuntaId, poriKuntaId];

      const projekti: Partial<Projekti> = {
        velho: {
          kunnat,
          suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
          __typename: "Velho",
        },
      };

      const result = defaultVastaanottajat(projekti as Projekti, null, kirjaamot, null);
      const expectedViranomaiset = [
        { nimi: IlmoitettavaViranomainen.UUDENMAAN_ELY, sahkoposti: "uusimaa@uusimaa.ely.fi" },
        {
          nimi: IlmoitettavaViranomainen.SATAKUNNAN_ELY,
          sahkoposti: "satakunta@satakunta.ely.fi",
        },
      ];

      expect(result.kunnat).toEqual(kunnat.map((kunta): KuntaVastaanottajaInput => ({ id: kunta, sahkoposti: "" })));
      expect(result.maakunnat).toEqual([]);
      expect(result.viranomaiset).toEqual(expectedViranomaiset);
    });
  });

  describe("finds Elinvoimakeskus recipients for new project (no existing data) when Väylävirasto is responsible", () => {
    beforeEach(() => {
      jest.spyOn(isEvkUtil, "isEvkAktivoitu").mockReturnValue(true);
    });

    it("should return kunnat, viranomaiset and maakunnat", () => {
      const helsinkiKuntaId = 91;
      const viranomainen = SuunnittelustaVastaavaViranomainen.UUDENMAAN_EVK;
      const projekti: Partial<Projekti> = {
        velho: {
          kunnat: [helsinkiKuntaId],
          suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
          __typename: "Velho",
        },
      };

      const result = defaultVastaanottajat(projekti as Projekti, null, kirjaamot, null);
      const expectedEmail = kirjaamot.find((k) => k.nimi === (viranomainen as string))?.sahkoposti;

      expect(result.kunnat).toEqual([{ id: helsinkiKuntaId, sahkoposti: "" }]);
      expect(result.maakunnat).toEqual([]);
      expect(result.viranomaiset?.[0]).toEqual({
        nimi: viranomainen,
        sahkoposti: expectedEmail,
      });
    });

    it("should return viranomaiset based on kunta", () => {
      const helsinkiKuntaId = 91;
      const tampereKuntaId = 837;
      const poriKuntaId = 609;
      const kunnat = [helsinkiKuntaId, tampereKuntaId, poriKuntaId];

      const projekti: Partial<Projekti> = {
        velho: {
          kunnat,
          suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
          __typename: "Velho",
        },
      };

      const result = defaultVastaanottajat(projekti as Projekti, null, kirjaamot, null);
      const expectedViranomaiset = [
        { nimi: IlmoitettavaViranomainen.UUDENMAAN_EVK, sahkoposti: "uusimaa@uusimaa.evk.fi" },
        {
          nimi: IlmoitettavaViranomainen.SISA_SUOMEN_EVK,
          sahkoposti: "sisa_suomi@sisa_suomi.evk.fi",
        },
        {
          nimi: IlmoitettavaViranomainen.LOUNAIS_SUOMEN_EVK,
          sahkoposti: "lounais-suomi@lounais-suomi.ely.fi",
        },
      ];

      expect(result.kunnat).toEqual(kunnat.map((kunta): KuntaVastaanottajaInput => ({ id: kunta, sahkoposti: "" })));
      expect(result.maakunnat).toEqual([]);
      expect(result.viranomaiset).toEqual(expectedViranomaiset);
    });

    it("should only return unique viranomaiset based on kunta", () => {
      const helsinkiKuntaId = 91;
      const vantaaKuntaId = 92;
      const poriKuntaId = 609;
      const kunnat = [helsinkiKuntaId, vantaaKuntaId, poriKuntaId];

      const projekti: Partial<Projekti> = {
        velho: {
          kunnat,
          suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
          __typename: "Velho",
        },
      };

      const result = defaultVastaanottajat(projekti as Projekti, null, kirjaamot, null);
      const expectedViranomaiset = [
        { nimi: IlmoitettavaViranomainen.UUDENMAAN_EVK, sahkoposti: "uusimaa@uusimaa.evk.fi" },
        {
          nimi: IlmoitettavaViranomainen.LOUNAIS_SUOMEN_EVK,
          sahkoposti: "lounais-suomi@lounais-suomi.ely.fi",
        },
      ];

      expect(result.kunnat).toEqual(kunnat.map((kunta): KuntaVastaanottajaInput => ({ id: kunta, sahkoposti: "" })));
      expect(result.maakunnat).toEqual([]);
      expect(result.viranomaiset).toEqual(expectedViranomaiset);
    });
  });

  describe("finds recipients for new project (no existing data) when ELY / EVK is responsible", () => {
    it("should return Vaylavirasto as only authority when EVK is not active", () => {
      const poriKuntaId = 609;

      jest.spyOn(isEvkUtil, "isEvkAktivoitu").mockReturnValue(false);

      const projekti: Partial<Projekti> = {
        velho: {
          suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VARSINAIS_SUOMEN_ELY,
          __typename: "Velho",
          kunnat: [poriKuntaId],
        },
      };

      const result = defaultVastaanottajat(projekti as Projekti, null, kirjaamot, null);

      expect(result.viranomaiset).toEqual([{ nimi: IlmoitettavaViranomainen.VAYLAVIRASTO, sahkoposti: "vayla@kirjaamo.fi" }]);
    });

    it("should return Vaylavirasto as only authority when EVK is active", () => {
      const poriKuntaId = 609;

      jest.spyOn(isEvkUtil, "isEvkAktivoitu").mockReturnValue(true);

      const projekti: Partial<Projekti> = {
        velho: {
          suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.LOUNAIS_SUOMEN_EVK,
          __typename: "Velho",
          kunnat: [poriKuntaId],
        },
      };

      const result = defaultVastaanottajat(projekti as Projekti, null, kirjaamot, null);

      expect(result.viranomaiset).toEqual([{ nimi: IlmoitettavaViranomainen.VAYLAVIRASTO, sahkoposti: "vayla@kirjaamo.fi" }]);
    });
  });

  it("should use previous phase recipients if present", () => {
    const viranomainen = IlmoitettavaViranomainen.SATAKUNNAN_ELY;
    const viranomainenEmail = "old.satakunta@satakunta.ely.fi";
    const hameenlinnaId = 109;
    const helsinkiKuntaId = 91;
    const oldHameenlinnaEmail = "old.hameenlinna@hameenlinna.fi";
    const oldHelsinkiEmail = "old.helsinki@helsinki.fi";
    const projekti: Partial<Projekti> = {
      __typename: "Projekti",
      status: Status.HYVAKSYTTY,
      velho: {
        kunnat: [hameenlinnaId, helsinkiKuntaId],
        __typename: "Velho",
      },
      nahtavillaoloVaihe: {
        muokkausTila: MuokkausTila.MUOKKAUS,
        __typename: "NahtavillaoloVaihe",
        ilmoituksenVastaanottajat: {
          viranomaiset: [{ nimi: viranomainen, sahkoposti: viranomainenEmail, __typename: "ViranomaisVastaanottaja" }],
          __typename: "IlmoituksenVastaanottajat",
          kunnat: [
            { __typename: "KuntaVastaanottaja", id: hameenlinnaId, sahkoposti: oldHameenlinnaEmail },
            { __typename: "KuntaVastaanottaja", id: helsinkiKuntaId, sahkoposti: oldHelsinkiEmail },
          ],
        },
      },
    };

    const result = defaultVastaanottajat(projekti as Projekti, null, kirjaamot, null);
    // Expect to only have Satakunnan ELY from previous phase
    expect(result.viranomaiset).toEqual([{ nimi: viranomainen, sahkoposti: viranomainenEmail }]);
    expect(result.kunnat).toEqual([
      { id: hameenlinnaId, sahkoposti: oldHameenlinnaEmail },
      { id: helsinkiKuntaId, sahkoposti: oldHelsinkiEmail },
    ]);
  });

  it("should not include maakunnat for hyväksymispäätös", () => {
    const poriId = 609;
    const satakuntaId = 4;
    const projekti: Partial<Projekti> = {
      velho: {
        kunnat: [poriId],
        maakunnat: [satakuntaId],
        suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.PIRKANMAAN_ELY,
        __typename: "Velho",
      },
    };

    const result = defaultVastaanottajat(projekti as Projekti, null, kirjaamot, PaatosTyyppi.HYVAKSYMISPAATOS);

    // Expect maakunta recipients to be empty
    expect(result.maakunnat).toEqual([]);
    expect(result.kunnat).toEqual([{ id: poriId, sahkoposti: "" }]);
  });

  it("should include maakunnat for jatkopäätös", () => {
    const poriId = 609;
    const satakuntaId = 4;
    const projekti: Partial<Projekti> = {
      velho: {
        kunnat: [poriId],
        maakunnat: [satakuntaId],
        suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.PIRKANMAAN_ELY,
        __typename: "Velho",
      },
    };

    const result = defaultVastaanottajat(projekti as Projekti, null, kirjaamot, PaatosTyyppi.JATKOPAATOS1);

    expect(result.maakunnat).toEqual([{ id: satakuntaId, sahkoposti: "" }]);
    expect(result.kunnat).toEqual([{ id: poriId, sahkoposti: "" }]);
  });
});
