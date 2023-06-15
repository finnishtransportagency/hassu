import {
  AloitusKuulutusJulkaisu,
  DBProjekti,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  NahtavillaoloVaiheJulkaisu,
  Velho,
  VuorovaikutusKierrosJulkaisu,
  VuorovaikutusTilaisuus,
  VuorovaikutusTilaisuusJulkaisu,
} from "../database/model";
import cloneDeep from "lodash/cloneDeep";
import { KuulutusJulkaisuTila, VuorovaikutusKierrosTila } from "../../../common/graphql/apiModel";
import { adaptStandardiYhteystiedotToYhteystiedot } from "../util/adaptStandardiYhteystiedot";
import { findJulkaisuWithTila, findUserByKayttajatunnus } from "../projekti/projektiUtil";
import { adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu } from "../projekti/adapter/adaptToAPI";
import { assertIsDefined } from "../util/assertions";
import { uuid } from "../util/uuid";
import { parameters } from "../aws/parameters";

function createNextAloitusKuulutusJulkaisuID(dbProjekti: DBProjekti) {
  if (!dbProjekti.aloitusKuulutusJulkaisut) {
    return 1;
  }
  return dbProjekti.aloitusKuulutusJulkaisut.length + 1;
}

export class AsiakirjaAdapter {
  async adaptAloitusKuulutusJulkaisu(dbProjekti: DBProjekti): Promise<AloitusKuulutusJulkaisu> {
    if (dbProjekti.aloitusKuulutus) {
      const { kuulutusYhteystiedot, palautusSyy: _palautusSyy, ...includedFields } = dbProjekti.aloitusKuulutus;
      const julkaisu: AloitusKuulutusJulkaisu = {
        ...includedFields,
        id: createNextAloitusKuulutusJulkaisuID(dbProjekti),
        // Tässä vaiheessa kuulutusYhteystiedot on oltava olemassa
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        yhteystiedot: adaptStandardiYhteystiedotToYhteystiedot(dbProjekti, kuulutusYhteystiedot, true, true),
        velho: adaptVelho(dbProjekti),
        suunnitteluSopimus: adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu(
          dbProjekti.suunnitteluSopimus,
          findUserByKayttajatunnus(dbProjekti.kayttoOikeudet, dbProjekti.suunnitteluSopimus?.yhteysHenkilo)
        ),
        kielitiedot: cloneDeep(dbProjekti.kielitiedot),
      };
      if (await parameters.isAsianhallintaIntegrationEnabled()) {
        julkaisu.asianhallintaEventId = uuid.v4();
      }
      return julkaisu;
    }
    throw new Error("Aloituskuulutus puuttuu");
  }

  adaptVuorovaikutusKierrosJulkaisu(dbProjekti: DBProjekti): VuorovaikutusKierrosJulkaisu {
    if (dbProjekti.vuorovaikutusKierros) {
      const { vuorovaikutusTilaisuudet, esitettavatYhteystiedot, vuorovaikutusNumero, ...includedFields } = dbProjekti.vuorovaikutusKierros;
      return {
        ...includedFields,
        id: vuorovaikutusNumero,
        vuorovaikutusTilaisuudet: vuorovaikutusTilaisuudet?.map((tilaisuus) =>
          this.adaptVuorovaikutusTilaisuusJulkaisuksi(dbProjekti, tilaisuus)
        ),
        yhteystiedot: adaptStandardiYhteystiedotToYhteystiedot(dbProjekti, esitettavatYhteystiedot, true, true), // pakotetaan kunnan edustaja tai projari
        tila: VuorovaikutusKierrosTila.JULKINEN,
      };
    }
    throw new Error("VuorovaikutusKierros puuttuu");
  }

  private adaptVuorovaikutusTilaisuusJulkaisuksi(
    projekti: DBProjekti,
    vuorovaikutusTilaisuus: VuorovaikutusTilaisuus
  ): VuorovaikutusTilaisuusJulkaisu {
    const tilaisuusKopio = { ...vuorovaikutusTilaisuus };
    const esitettavatYhteystiedotKopio = tilaisuusKopio.esitettavatYhteystiedot;
    delete tilaisuusKopio.esitettavatYhteystiedot;
    return {
      ...tilaisuusKopio,
      yhteystiedot: adaptStandardiYhteystiedotToYhteystiedot(projekti, esitettavatYhteystiedotKopio),
    };
  }

  adaptNahtavillaoloVaiheJulkaisu(dbProjekti: DBProjekti): NahtavillaoloVaiheJulkaisu {
    if (dbProjekti.nahtavillaoloVaihe) {
      const { kuulutusYhteystiedot, palautusSyy: _palautusSyy, ...includedFields } = dbProjekti.nahtavillaoloVaihe;
      if (!dbProjekti.kielitiedot) {
        throw new Error("adaptNahtavillaoloVaiheJulkaisu: dbProjekti.kielitiedot puuttuu");
      }
      return {
        ...includedFields,
        velho: adaptVelho(dbProjekti),
        yhteystiedot: adaptStandardiYhteystiedotToYhteystiedot(dbProjekti, kuulutusYhteystiedot, true, false),
        // dbProjekti.kielitiedot on oltava olemassa
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        kielitiedot: cloneDeep(dbProjekti.kielitiedot),
      };
    }
    throw new Error("NahtavillaoloVaihe puuttuu");
  }

  adaptHyvaksymisPaatosVaiheJulkaisu(
    dbProjekti: DBProjekti,
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe | null | undefined
  ): HyvaksymisPaatosVaiheJulkaisu {
    if (hyvaksymisPaatosVaihe) {
      const { kuulutusYhteystiedot, palautusSyy: _palautusSyy, ...includedFields } = hyvaksymisPaatosVaihe;
      return {
        ...includedFields,
        velho: adaptVelho(dbProjekti),
        yhteystiedot: adaptStandardiYhteystiedotToYhteystiedot(dbProjekti, kuulutusYhteystiedot, true, false),
        // dbProjekti.kielitiedot on oltava olemassa
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        kielitiedot: cloneDeep(dbProjekti.kielitiedot),
      };
    }
    throw new Error("HyvaksymisPaatosVaihe puuttuu");
  }

  findAloitusKuulutusWaitingForApproval(projekti: DBProjekti): AloitusKuulutusJulkaisu | undefined {
    if (projekti.aloitusKuulutusJulkaisut) {
      return findJulkaisuWithTila(projekti.aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findNahtavillaoloWaitingForApproval(projekti: DBProjekti): NahtavillaoloVaiheJulkaisu | undefined {
    if (projekti.nahtavillaoloVaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.nahtavillaoloVaiheJulkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findHyvaksymisPaatosVaiheWaitingForApproval(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
    if (projekti.hyvaksymisPaatosVaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.hyvaksymisPaatosVaiheJulkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findJatkoPaatos1VaiheWaitingForApproval(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
    if (projekti.jatkoPaatos1VaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.jatkoPaatos1VaiheJulkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findJatkoPaatos2VaiheWaitingForApproval(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
    if (projekti.jatkoPaatos2VaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.jatkoPaatos2VaiheJulkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findAloitusKuulutusLastApproved(projekti: DBProjekti): AloitusKuulutusJulkaisu | undefined {
    if (projekti.aloitusKuulutusJulkaisut) {
      return findJulkaisuWithTila(projekti.aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    }
  }

  findHyvaksymisKuulutusLastApproved(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
    if (projekti.hyvaksymisPaatosVaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.hyvaksymisPaatosVaiheJulkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    }
  }

  findNahtavillaoloLastApproved(projekti: DBProjekti): NahtavillaoloVaiheJulkaisu | undefined {
    if (projekti.nahtavillaoloVaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.nahtavillaoloVaiheJulkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    }
  }
}

function adaptVelho(dbProjekti: DBProjekti): Velho {
  assertIsDefined(dbProjekti.velho);
  return cloneDeep(dbProjekti.velho);
}

export const asiakirjaAdapter = new AsiakirjaAdapter();
