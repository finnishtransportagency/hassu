import {
  AloitusKuulutusJulkaisu,
  DBProjekti,
  HyvaksymisPaatosVaiheJulkaisu,
  KuulutusYhteystiedot,
  NahtavillaoloVaiheJulkaisu,
  Velho,
  Yhteystieto,
} from "../database/model";
import cloneDeep from "lodash/cloneDeep";
import {
  AloitusKuulutusTila,
  HyvaksymisPaatosVaiheTila,
  NahtavillaoloVaiheTila,
  ProjektiRooli,
} from "../../../common/graphql/apiModel";
import { deepClone } from "aws-cdk/lib/util";
import { vaylaUserToYhteystieto } from "../util/vaylaUserToYhteystieto";
import { findJulkaisuWithTila } from "../projekti/projektiUtil";

function createNextAloitusKuulutusJulkaisuID(dbProjekti: DBProjekti) {
  if (!dbProjekti.aloitusKuulutusJulkaisut) {
    return 1;
  }
  return dbProjekti.aloitusKuulutusJulkaisut.length + 1;
}

export class AsiakirjaAdapter {
  adaptAloitusKuulutusJulkaisu(dbProjekti: DBProjekti): AloitusKuulutusJulkaisu {
    if (dbProjekti.aloitusKuulutus) {
      const { kuulutusYhteystiedot, palautusSyy: _palautusSyy, ...includedFields } = dbProjekti.aloitusKuulutus;
      return {
        ...includedFields,
        id: createNextAloitusKuulutusJulkaisuID(dbProjekti),
        yhteystiedot: adaptKuulutusYhteystiedot(dbProjekti, kuulutusYhteystiedot),
        velho: adaptVelho(dbProjekti),
        suunnitteluSopimus: cloneDeep(dbProjekti.suunnitteluSopimus),
        kielitiedot: cloneDeep(dbProjekti.kielitiedot),
      };
    }
    throw new Error("Aloituskuulutus puuttuu");
  }

  adaptNahtavillaoloVaiheJulkaisu(dbProjekti: DBProjekti): NahtavillaoloVaiheJulkaisu {
    if (dbProjekti.nahtavillaoloVaihe) {
      const { palautusSyy: _palautusSyy, ...includedFields } = dbProjekti.nahtavillaoloVaihe;
      return {
        ...includedFields,
        velho: adaptVelho(dbProjekti),
        kielitiedot: cloneDeep(dbProjekti.kielitiedot),
      };
    }
    throw new Error("NahtavillaoloVaihe puuttuu");
  }

  adaptHyvaksymisPaatosVaiheJulkaisu(dbProjekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu {
    if (dbProjekti.hyvaksymisPaatosVaihe) {
      const { palautusSyy: _palautusSyy, ...includedFields } = dbProjekti.hyvaksymisPaatosVaihe;
      return {
        ...includedFields,
        velho: adaptVelho(dbProjekti),
        kielitiedot: cloneDeep(dbProjekti.kielitiedot),
      };
    }
    throw new Error("NahtavillaoloVaihe puuttuu");
  }

  migrateAloitusKuulutusJulkaisu(dbProjekti: DBProjekti): AloitusKuulutusJulkaisu {
    if (dbProjekti.aloitusKuulutus) {
      const { palautusSyy: _palautusSyy, ...includedFields } = dbProjekti.aloitusKuulutus;
      return {
        ...includedFields,
        id: createNextAloitusKuulutusJulkaisuID(dbProjekti),
        yhteystiedot: [],
        velho: adaptVelho(dbProjekti),
        suunnitteluSopimus: null,
      };
    }
    throw new Error("Aloituskuulutus puuttuu");
  }

  findAloitusKuulutusWaitingForApproval(projekti: DBProjekti): AloitusKuulutusJulkaisu | undefined {
    if (projekti.aloitusKuulutusJulkaisut) {
      return findJulkaisuWithTila(projekti.aloitusKuulutusJulkaisut, AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findNahtavillaoloWaitingForApproval(projekti: DBProjekti): NahtavillaoloVaiheJulkaisu | undefined {
    if (projekti.nahtavillaoloVaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.nahtavillaoloVaiheJulkaisut, NahtavillaoloVaiheTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findHyvaksymisPaatosVaiheWaitingForApproval(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
    if (projekti.hyvaksymisPaatosVaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.hyvaksymisPaatosVaiheJulkaisut, HyvaksymisPaatosVaiheTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findAloitusKuulutusLastApproved(projekti: DBProjekti): AloitusKuulutusJulkaisu | undefined {
    if (projekti.aloitusKuulutusJulkaisut) {
      return findJulkaisuWithTila(projekti.aloitusKuulutusJulkaisut, AloitusKuulutusTila.HYVAKSYTTY);
    }
  }
}

function adaptKuulutusYhteystiedot(
  dbProjekti: DBProjekti,
  kuulutusYhteystiedot: KuulutusYhteystiedot | null
): Yhteystieto[] {
  const yt: Yhteystieto[] = [];
  const sahkopostit: string[] = [];
  dbProjekti.kayttoOikeudet
    .filter(
      ({ kayttajatunnus, rooli }) =>
        rooli === ProjektiRooli.PROJEKTIPAALLIKKO ||
        kuulutusYhteystiedot?.yhteysHenkilot?.find((yh) => yh === kayttajatunnus)
    )
    .forEach((oikeus) => {
      yt.push(vaylaUserToYhteystieto(oikeus));
      sahkopostit.push(oikeus.email); //Kerää sähköpostit myöhempää duplikaattien tarkistusta varten.
    });
  if (kuulutusYhteystiedot.yhteysTiedot) {
    kuulutusYhteystiedot.yhteysTiedot.forEach((yhteystieto) => {
      if (!sahkopostit.find((email) => email === yhteystieto.sahkoposti)) {
        //Varmista, ettei ole duplikaatteja
        yt.push(yhteystieto);
        sahkopostit.push(yhteystieto.sahkoposti);
      }
    });
  }
  return yt;
}

function adaptVelho(dbProjekti: DBProjekti): Velho {
  return deepClone(dbProjekti.velho);
}

export const asiakirjaAdapter = new AsiakirjaAdapter();
