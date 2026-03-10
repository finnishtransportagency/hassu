import { NykyinenKayttaja, TestiKomento, TestiKomentoInput } from "hassu-common/graphql/apiModel";
import { projektiResetTool } from "./projektiResetTool";
import { dateMoverTool } from "./dateMoverTool";
import Pick from "lodash/pick";
import { asianhallintaVientiTool } from "./asianhallintaVientiTool";
import { importProjekti, Tila, migraatioTilat } from "../migraatio/migration";
import { setLogContextOid } from "../logger";

class TestHandler {
  async suoritaTestiKomento(params: TestiKomentoInput): Promise<void> {
    setLogContextOid(params.oid);
    switch (params.tyyppi) {
      case TestiKomento.RESET:
        return await projektiResetTool.reset(params.oid, params.vaihe);
      case TestiKomento.AJANSIIRTO:
        return await dateMoverTool.ajansiirto(Pick(params, "oid", "vaihe", "ajansiirtoPaivina"));
      case TestiKomento.MIGRAATIO:
        return await this.migraatio(params);
      case TestiKomento.VIE_ASIANHALLINTAAN:
        return await asianhallintaVientiTool.kaynnista(params.oid);
    }
  }

  private async migraatio(params: TestiKomentoInput) {
    const targetStatus = params.migraatioTargetStatus;
    this.validateMigrationStatus(targetStatus);
    const kayttaja: NykyinenKayttaja = {
      __typename: "NykyinenKayttaja",
      etunimi: "migraatio",
      sukunimi: "migraatio",
      roolit: ["hassu_admin"],
      uid: "migraatio",
    };

    await importProjekti({
      rivi: {
        oid: params.oid,
        tila: targetStatus,
      },
      kayttaja,
    });
  }

  private validateMigrationStatus(targetStatus: string | null | undefined): asserts targetStatus is Tila {
    if (!targetStatus) {
      throw new Error("targetStatus-parametri puuttuu");
    }
    if (!migraatioTilat.includes(targetStatus as Tila)) {
      throw new Error("targetStatus-parametrin arvo ei löydy sallittujen arvojen joukosta");
    }
  }
}

export const testHandler = new TestHandler();
