import { AloitusKuulutusJulkaisu, DBProjekti, Velho, Yhteystieto } from "../database/model/projekti";
import cloneDeep from "lodash/cloneDeep";
import { AloitusKuulutusTila } from "../../../common/graphql/apiModel";

function createNextID(dbProjekti: DBProjekti) {
  if (!dbProjekti.aloitusKuulutusJulkaisut) {
    return 1;
  }
  return dbProjekti.aloitusKuulutusJulkaisut.length + 1;
}

export class AsiakirjaAdapter {
  adaptAloitusKuulutusJulkaisu(dbProjekti: DBProjekti): AloitusKuulutusJulkaisu {
    if (dbProjekti.aloitusKuulutus) {
      const { esitettavatYhteystiedot, palautusSyy: _palautusSyy, ...includedFields } = dbProjekti.aloitusKuulutus;
      return {
        ...includedFields,
        id: createNextID(dbProjekti),
        yhteystiedot: adaptYhteystiedot(dbProjekti, esitettavatYhteystiedot),
        velho: adaptVelho(dbProjekti),
        suunnitteluSopimus: cloneDeep(dbProjekti.suunnitteluSopimus),
        kielitiedot: cloneDeep(dbProjekti.kielitiedot),
      };
    }
    throw new Error("Aloituskuulutus puuttuu");
  }

  migrateAloitusKuulutusJulkaisu(dbProjekti: DBProjekti): AloitusKuulutusJulkaisu {
    if (dbProjekti.aloitusKuulutus) {
      const { palautusSyy: _palautusSyy, ...includedFields } = dbProjekti.aloitusKuulutus;
      return {
        ...includedFields,
        id: createNextID(dbProjekti),
        yhteystiedot: [],
        velho: adaptVelho(dbProjekti),
        suunnitteluSopimus: null,
      };
    }
    throw new Error("Aloituskuulutus puuttuu");
  }

  findAloitusKuulutusWaitingForApproval(projekti: DBProjekti): AloitusKuulutusJulkaisu | undefined {
    if (projekti.aloitusKuulutusJulkaisut) {
      return projekti.aloitusKuulutusJulkaisut
        .filter((julkaisu) => julkaisu.tila == AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA)
        .pop();
    }
  }

  findAloitusKuulutusLastApproved(projekti: DBProjekti): AloitusKuulutusJulkaisu | undefined {
    if (projekti.aloitusKuulutusJulkaisut) {
      return projekti.aloitusKuulutusJulkaisut
        .filter((julkaisu) => julkaisu.tila == AloitusKuulutusTila.HYVAKSYTTY)
        .pop();
    }
  }
}

function adaptYhteystiedot(dbProjekti: DBProjekti, esitettavatYhteystiedot: Yhteystieto[] | null): Yhteystieto[] {
  const yt: Yhteystieto[] = [];
  dbProjekti.kayttoOikeudet
    .filter(({ esitetaanKuulutuksessa }) => !!esitetaanKuulutuksessa)
    .forEach((oikeus) => {
      const [sukunimi, etunimi] = oikeus.nimi.split(/, /g);
      yt.push({
        etunimi,
        sukunimi,
        puhelinnumero: oikeus.puhelinnumero,
        sahkoposti: oikeus.email,
        organisaatio: oikeus.organisaatio,
      });
    });
  if (esitettavatYhteystiedot) {
    esitettavatYhteystiedot.forEach((yhteystieto) => {
      yt.push(yhteystieto);
    });
  }
  return yt;
}

function adaptVelho(dbProjekti: DBProjekti): Velho {
  const { nimi, tilaajaOrganisaatio, suunnittelustaVastaavaViranomainen, kunnat, tyyppi, vaylamuoto } =
    dbProjekti.velho!;
  return {
    nimi,
    tyyppi: tyyppi || dbProjekti.tyyppi, // remove deprectaed usage after all data has been updated in dev/test
    tilaajaOrganisaatio,
    suunnittelustaVastaavaViranomainen,
    kunnat,
    vaylamuoto,
  };
}

export const asiakirjaAdapter = new AsiakirjaAdapter();
