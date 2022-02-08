import { AloitusKuulutusJulkaisu, DBProjekti, Velho, Yhteystieto } from "../database/model/projekti";
import cloneDeep from "lodash/cloneDeep";

const firstCharactersInWords = /(?<=^|[^\p{L}])\p{L}/gu;
const notFirstCharacterInWords = /(?<!^|[^\p{L}])\p{L}/gu;

export class AsiakirjaAdapter {
  adaptAloitusKuulutusJulkaisu(dbProjekti: DBProjekti): AloitusKuulutusJulkaisu {
    if (dbProjekti.aloitusKuulutus) {
      const { esitettavatYhteystiedot, ...includedFields } = dbProjekti.aloitusKuulutus;
      return {
        ...includedFields,
        yhteystiedot: adaptYhteystiedot(dbProjekti),
        velho: adaptVelho(dbProjekti),
        suunnitteluSopimus: cloneDeep(dbProjekti.suunnitteluSopimus),
      };
    }
    throw new Error("Aloituskuulutus puuttuu");
  }
}

function adaptYhteystiedot(dbProjekti: DBProjekti): Yhteystieto[] {
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
  if (dbProjekti.aloitusKuulutus?.esitettavatYhteystiedot) {
    dbProjekti.aloitusKuulutus?.esitettavatYhteystiedot.forEach((yhteystieto) => {
      yt.push(yhteystieto);
    });
  }
  return yt;
}

function adaptVelho(dbProjekti: DBProjekti): Velho {
  const { nimi, tilaajaOrganisaatio, kunnat, tyyppi, vaylamuoto } = dbProjekti.velho!;
  return {
    nimi,
    tyyppi: tyyppi || dbProjekti.tyyppi, // remove deprectaed usage after all data has been updated in dev/test
    tilaajaOrganisaatio,
    kunnat,
    vaylamuoto,
  };
}

export function capitalizeAllWords(text: string) {
  return text
    .replace(firstCharactersInWords, (a) => a.toUpperCase())
    .replace(notFirstCharacterInWords, (a) => a.toLowerCase());
}

export const asiakirjaAdapter = new AsiakirjaAdapter();
