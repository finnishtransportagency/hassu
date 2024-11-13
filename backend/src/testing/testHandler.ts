import { NykyinenKayttaja, TestiKomento, TestiKomentoInput } from "hassu-common/graphql/apiModel";
import { projektiResetTool } from "./projektiResetTool";
import { dateMoverTool } from "./dateMoverTool";
import Pick from "lodash/pick";
import { asianhallintaVientiTool } from "./asianhallintaVientiTool";
import { importProjekti, TargetStatuses } from "../migraatio/migration";
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
    if (!targetStatus) {
      throw new Error("targetStatus-parametri puuttuu");
    }
    const kayttaja: NykyinenKayttaja = {
      __typename: "NykyinenKayttaja",
      etunimi: "migraatio",
      sukunimi: "migraatio",
      roolit: ["hassu_admin"],
      uid: "migraatio",
    };

    await importProjekti({
      oid: params.oid,
      kayttaja,
      targetStatus: targetStatus as TargetStatuses,
    });
  }
}

export const testHandler = new TestHandler();
