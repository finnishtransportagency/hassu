/**
 * @jest-environment jsdom
 */

import dayjs from "dayjs";
import { today } from "../dateUtils";
import { expect } from "chai";
import { Projekti, SuunnittelustaVastaavaViranomainen } from "../../graphql/apiModel";
import { isElyJulkaisuEstetty } from "../isElyJulkaisuEstetty";

const ONLY_DATE_FORMAT = "YYYY-MM-DD";
const DAY = "day";

const luoDummyProjekti = (
  suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen,
  uspaKaytossa: boolean
): Projekti => {
  return {
    oid: "1.2.246.578.5.1.2978288874.2711575506",
    versio: 8,
    kayttoOikeudet: [],
    tallennettu: true,
    velho: {
      nimi: "Projekti 1",
      __typename: "Velho",
      suunnittelustaVastaavaViranomainen,
    },
    asianhallinta: {
      __typename: "Asianhallinta",
      inaktiivinen: !uspaKaytossa,
      aktivoitavissa: false,
    },
    lausuntoPyynnot: [],
    __typename: "Projekti",
  };
};

describe("isElyJulkaisuEstetty - Väylävirasto, ei estoa", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE; // Reset after each test
  });

  it("VÄYLÄVIRASTO -projekti, USPA - käytössä, pvm EVK aktivoinnin jälkeen => EI ESTETTY", () => {
    const projekti: Projekti = luoDummyProjekti(SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO, true);
    const DATE_TO_CHECKED = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_CHECKED).subtract(1, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE_IN_THE_PAST = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE_IN_THE_PAST);
    const isBlocked = isElyJulkaisuEstetty(projekti, DATE_TO_CHECKED);
    expect(isBlocked).to.be.false;
  });

  it("VÄYLÄVIRASTO -projekti, USPA - käytössä, pvm ennen EVK aktivointia => EI ESTETTY", () => {
    const projekti: Projekti = luoDummyProjekti(SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO, true);
    const DATE_TO_CHECKED = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_CHECKED).add(1, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE_IN_THE_FUTURE = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE_IN_THE_FUTURE);
    const isBlocked = isElyJulkaisuEstetty(projekti, DATE_TO_CHECKED);
    expect(isBlocked).to.be.false;
  });

  it("VÄYLÄVIRASTO -projekti, USPA - ei käytössä, pvm EVK aktivoinnin jälkeen => EI ESTETTY", () => {
    const projekti: Projekti = luoDummyProjekti(SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO, false);
    const DATE_TO_CHECKED = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_CHECKED).subtract(1, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE_IN_THE_FUTURE = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE_IN_THE_FUTURE);
    const isBlocked = isElyJulkaisuEstetty(projekti, DATE_TO_CHECKED);
    expect(isBlocked).to.be.false;
  });
});

describe("isElyJulkaisuEstetty - EVK", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE; // Reset after each test
  });

  it("EVK -projekti, USPA - ei käytössä, EVK aktivoitu menneisyydessä => EI ESTETTY", () => {
    const projekti: Projekti = luoDummyProjekti(SuunnittelustaVastaavaViranomainen.ETELA_POHJANMAAN_EVK, false);
    const DATE_TO_BE_CHECKED = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_BE_CHECKED).subtract(1, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE_IN_THE_PAST = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE_IN_THE_PAST);
    const isBlocked = isElyJulkaisuEstetty(projekti, DATE_TO_BE_CHECKED);
    expect(isBlocked).to.be.false;
  });

  it("EVK -projekti, USPA - käytössä, EVK aktivoitu menneisyydessä => EI ESTETTY", () => {
    const projekti: Projekti = luoDummyProjekti(SuunnittelustaVastaavaViranomainen.ETELA_POHJANMAAN_EVK, true);
    const DATE_TO_BE_CHECKED = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_BE_CHECKED).subtract(1, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE_IN_THE_PAST = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE_IN_THE_PAST);
    const isBlocked = isElyJulkaisuEstetty(projekti, DATE_TO_BE_CHECKED);
    expect(isBlocked).to.be.false;
  });

  it("EVK -projekti, USPA - ei käytössä, pvm ennen EVK aktivointia => EI ESTETTY", () => {
    const projekti: Projekti = luoDummyProjekti(SuunnittelustaVastaavaViranomainen.ETELA_POHJANMAAN_EVK, false);
    const DATE_TO_BE_CHECKED = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_BE_CHECKED).add(1, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE_IN_THE_PAST = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE_IN_THE_PAST);
    const isBlocked = isElyJulkaisuEstetty(projekti, DATE_TO_BE_CHECKED);
    expect(isBlocked).to.be.false;
  });

  it("EVK -projekti, USPA - käytössä, pvm ennen EVK aktivointia => EI ESTETTY", () => {
    const projekti: Projekti = luoDummyProjekti(SuunnittelustaVastaavaViranomainen.ETELA_POHJANMAAN_EVK, true);
    const DATE_TO_BE_CHECKED = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_BE_CHECKED).add(1, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE_IN_THE_PAST = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE_IN_THE_PAST);
    const isBlocked = isElyJulkaisuEstetty(projekti, DATE_TO_BE_CHECKED);
    expect(isBlocked).to.be.false;
  });
});

describe("isElyJulkaisuEstetty - ELY", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE; // Reset after each test
  });
  it("ELY -projekti, USPA - ei käytössä, pvm EVK aktivoinnin jälkeen => ESTETTY", () => {
    const projekti: Projekti = luoDummyProjekti(SuunnittelustaVastaavaViranomainen.ETELA_POHJANMAAN_ELY, false);
    const DATE_TO_BE_CHECKED = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_BE_CHECKED).subtract(1, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE_IN_THE_PAST = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE_IN_THE_PAST);
    const isBlocked = isElyJulkaisuEstetty(projekti, DATE_TO_BE_CHECKED);
    expect(isBlocked).to.be.true;
  });

  it("ELY -projekti, USPA - käytössä, pvm EVK aktivoinnin jälkeen => ESTETTY", () => {
    const projekti: Projekti = luoDummyProjekti(SuunnittelustaVastaavaViranomainen.ETELA_POHJANMAAN_ELY, true);
    const DATE_TO_BE_CHECKED = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_BE_CHECKED).subtract(1, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE_IN_THE_PAST = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE_IN_THE_PAST);
    const isBlocked = isElyJulkaisuEstetty(projekti, DATE_TO_BE_CHECKED);
    expect(isBlocked).to.be.true;
  });

  it("ELY -projekti, USPA - ei käytössä, pvm ennen EVK aktivointia => EI ESTETTY", () => {
    const projekti: Projekti = luoDummyProjekti(SuunnittelustaVastaavaViranomainen.ETELA_POHJANMAAN_ELY, false);
    const DATE_TO_BE_CHECKED = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_BE_CHECKED).add(1, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE_IN_THE_PAST = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE_IN_THE_PAST);
    const isBlocked = isElyJulkaisuEstetty(projekti, DATE_TO_BE_CHECKED);
    expect(isBlocked).to.be.false;
  });

  it("ELY -projekti, USPA - käytössä, pvm ennen EVK aktivointia => EI ESTETTY", () => {
    const projekti: Projekti = luoDummyProjekti(SuunnittelustaVastaavaViranomainen.ETELA_POHJANMAAN_ELY, true);
    const DATE_TO_BE_CHECKED = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_BE_CHECKED).add(1, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE_IN_THE_PAST = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE_IN_THE_PAST);
    const isBlocked = isElyJulkaisuEstetty(projekti, DATE_TO_BE_CHECKED);
    expect(isBlocked).to.be.false;
  });
});
