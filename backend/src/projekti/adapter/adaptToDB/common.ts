import * as API from "hassu-common/graphql/apiModel";
import { AineistoTila } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import {
  Aineisto,
  IlmoituksenVastaanottajat,
  Kielitiedot,
  KuntaVastaanottaja,
  LadattuTiedosto,
  Linkki,
  LocalizedMap,
  RequiredLocalizedMap,
  SaameKieli,
  StandardiYhteystiedot,
  ViranomaisVastaanottaja,
  Yhteystieto,
} from "../../../database/model";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import remove from "lodash/remove";
import isString from "lodash/isString";
import { isKieliTranslatable, KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import cloneDeep from "lodash/cloneDeep";
import assert from "assert";
import { uniqBy } from "lodash";

export function adaptLokalisoituTekstiEiPakollinen(
  alkuperaisetArvot?: LocalizedMap<string>,
  lokalisoituTekstiEiPakollinen?: API.LokalisoituTekstiInputEiPakollinen | null,
  projektiAdaptationResult?: ProjektiAdaptationResult
): API.LokalisoituTekstiInput | null | undefined {
  if (lokalisoituTekstiEiPakollinen) {
    const { SUOMI, RUOTSI, ...rest } = lokalisoituTekstiEiPakollinen;
    if (lokalisoituTekstiEiPakollinen?.SUOMI || lokalisoituTekstiEiPakollinen?.RUOTSI) {
      projektiAdaptationResult?.logoFilesChanged();
    }
    return { ...rest, SUOMI: SUOMI || alkuperaisetArvot?.SUOMI || "", RUOTSI: RUOTSI || alkuperaisetArvot?.RUOTSI };
  }
  return lokalisoituTekstiEiPakollinen;
}

export function adaptIlmoituksenVastaanottajatToSave(
  vastaanottajat: API.IlmoituksenVastaanottajatInput | null | undefined
): IlmoituksenVastaanottajat | null | undefined {
  if (vastaanottajat === null) {
    return null;
  }
  if (vastaanottajat === undefined) {
    return undefined;
  }
  if (!vastaanottajat.kunnat) {
    throw new IllegalArgumentError("Ilmoituksen vastaanottajissa tulee olla kunnat mukana!");
  }
  const kunnat: API.KuntaVastaanottajaInput[] = vastaanottajat.kunnat;
  if (!vastaanottajat?.viranomaiset || vastaanottajat.viranomaiset.length === 0) {
    throw new IllegalArgumentError("Viranomaisvastaanottajia pitää olla vähintään yksi.");
  }
  const viranomaiset: ViranomaisVastaanottaja[] = vastaanottajat?.viranomaiset;
  return {
    kunnat: kunnat.map((kunta) => removeTypeName(kunta as General<KuntaVastaanottaja>) as KuntaVastaanottaja),
    viranomaiset: viranomaiset.map(
      (viranomainen) => removeTypeName(viranomainen as General<ViranomaisVastaanottaja>) as ViranomaisVastaanottaja
    ),
  };
}

export const adaptYhteystiedotToSave = (yhteystietoInputs: Array<API.YhteystietoInput> | undefined | null): Yhteystieto[] | undefined =>
  yhteystietoInputs?.map((yt: API.YhteystietoInput) => {
    const ytToSave: Yhteystieto = {
      etunimi: yt.etunimi,
      sukunimi: yt.sukunimi,
      organisaatio: yt.organisaatio || undefined,
      kunta: yt.kunta || undefined,
      puhelinnumero: yt.puhelinnumero,
      sahkoposti: yt.sahkoposti,
    };
    return ytToSave;
  });

export function adaptStandardiYhteystiedotToSave(
  kuulutusYhteystiedot: API.StandardiYhteystiedotInput | null | undefined,
  tyhjaEiOk?: boolean
): StandardiYhteystiedot | undefined {
  if ((kuulutusYhteystiedot?.yhteysTiedot?.length ?? 0) + (kuulutusYhteystiedot?.yhteysHenkilot?.length ?? 0) === 0 && tyhjaEiOk) {
    throw new IllegalArgumentError("Standardiyhteystietojen on sisällettävä vähintään yksi yhteystieto!");
  }
  return {
    yhteysTiedot: adaptYhteystiedotToSave(kuulutusYhteystiedot?.yhteysTiedot),
    yhteysHenkilot: kuulutusYhteystiedot?.yhteysHenkilot || undefined,
  };
}

export function adaptAineistotToSave(
  dbAineistot: Aineisto[] | undefined | null,
  aineistotInput: API.AineistoInput[] | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult,
  iteratee = (a: Aineisto) => a.dokumenttiOid + a.tila + a.nimi
): Aineisto[] | undefined {
  const resultAineistot: Aineisto[] = [];

  if (!aineistotInput) {
    return dbAineistot ?? undefined;
  }

  const inputs = cloneDeep(aineistotInput);

  let hasPendingChanges = examineAndUpdateExistingDocuments(dbAineistot, inputs, resultAineistot);

  // Add new ones and optionally trigger import later
  for (const aineistoInput of inputs) {
    resultAineistot.push({
      dokumenttiOid: aineistoInput.dokumenttiOid,
      nimi: aineistoInput.nimi,
      kategoriaId: aineistoInput.kategoriaId ?? undefined,
      jarjestys: aineistoInput.jarjestys,
      tila: aineistoInput.tila == API.AineistoTila.ODOTTAA_POISTOA ? API.AineistoTila.ODOTTAA_POISTOA : API.AineistoTila.ODOTTAA_TUONTIA,
    });
    hasPendingChanges = true;
  }

  if (hasPendingChanges) {
    projektiAdaptationResult.aineistoChanged();
  }

  // Poistetaan duplikaatit
  return uniqBy(resultAineistot, iteratee);
}

function examineAndUpdateExistingDocuments(
  dbAineistot: Aineisto[] | null | undefined,
  inputs: API.AineistoInput[],
  resultAineistot: Aineisto[]
) {
  let hasPendingChanges = false;
  if (dbAineistot) {
    const aineistot = cloneDeep(dbAineistot);
    // Jos pyydetään aineiston poistoa, poista aineisto ja jatka muuta käsittelyä vasta sen jälkeen
    const deletedInputs = inputs
      .filter((ai) => ai.tila == AineistoTila.ODOTTAA_POISTOA)
      .map((ai) => {
        // Poista kaikki poistettavat aineistot listasta
        // Varmista kaikkien tilaksi ODOTTAA_POISTOA
        resultAineistot.push(
          ...remove(aineistot, (a) => a.dokumenttiOid == ai.dokumenttiOid).map((a) => {
            a.tila = AineistoTila.ODOTTAA_POISTOA;
            return a;
          })
        );
        return ai;
      });

    if (deletedInputs.length > 0) {
      hasPendingChanges = true;
    }
    remove(inputs, (i) => deletedInputs.indexOf(i) >= 0);

    // Säilytä olemassa olevat tai tuo uudet jos nimi on vaihtunut
    aineistot.forEach((dbAineisto) => {
      const updateAineistoInput = pickAineistoFromInputByDocumenttiOid(inputs, dbAineisto.dokumenttiOid);
      if (updateAineistoInput) {
        // Update existing one
        dbAineisto.jarjestys = updateAineistoInput.jarjestys;
        dbAineisto.kategoriaId = updateAineistoInput.kategoriaId ?? undefined;
        if (dbAineisto.nimi !== updateAineistoInput.nimi) {
          hasPendingChanges = true;
          resultAineistot.push({ ...dbAineisto, tila: API.AineistoTila.ODOTTAA_POISTOA });
          dbAineisto.tila = API.AineistoTila.ODOTTAA_TUONTIA;
          dbAineisto.nimi = updateAineistoInput.nimi;
        }
      }
      resultAineistot.push(dbAineisto);
    });
  }
  return hasPendingChanges;
}

export function pickAineistoFromInputByDocumenttiOid(
  aineistotInput: API.AineistoInput[],
  dokumenttiOid: string
): API.AineistoInput | undefined {
  if (aineistotInput) {
    const sortedAineistotInput = aineistotInput.sort((a, b) => {
      if (a.tila == AineistoTila.ODOTTAA_POISTOA) {
        return -1;
      } else if (b.tila == AineistoTila.ODOTTAA_POISTOA) {
        return 1;
      }
      return 0;
    });
    const matchedElements = remove(sortedAineistotInput, (item) => item.dokumenttiOid === dokumenttiOid);
    if (matchedElements.length > 0) {
      return matchedElements[0];
    }
  }
  return undefined;
}

type General<T> = { __typename: string } & T;

export function removeTypeName<Type>(o: General<Type> | null | undefined): Type | null | undefined {
  if (!o) {
    return o;
  }
  const result: Partial<General<Type>> = { ...o };
  delete result.__typename;
  return result as Type;
}

export function adaptHankkeenKuvausToSave(
  hankkeenKuvaus: API.LokalisoituTekstiInput | undefined | null
): LocalizedMap<string> | undefined | null {
  if (!hankkeenKuvaus) {
    return hankkeenKuvaus;
  }
  const kuvausSuomi = hankkeenKuvaus[API.Kieli.SUOMI];
  if (!kuvausSuomi) {
    throw new Error(`adaptHankkeenKuvaus: hankkeenKuvaus.${API.Kieli.SUOMI} puuttuu`);
  }
  const kuvaus: LocalizedMap<string> = { [API.Kieli.SUOMI]: hankkeenKuvaus[API.Kieli.SUOMI] };
  Object.keys(API.Kieli).forEach((kieli) => {
    if (hankkeenKuvaus[kieli as KaannettavaKieli]) {
      kuvaus[kieli as API.Kieli] = hankkeenKuvaus[kieli as KaannettavaKieli] || undefined;
    }
  });
  return kuvaus;
}

export function adaptLokalisoituTekstiToSave(
  lokalisoituTekstiInput: API.LokalisoituTekstiInput | undefined | null,
  kielitiedot: Kielitiedot
): LocalizedMap<string> | undefined | null {
  if (!lokalisoituTekstiInput) {
    return lokalisoituTekstiInput;
  }

  assert(
    isKieliTranslatable(kielitiedot.ensisijainenKieli),
    "ensisijaisen kielen on oltava käännettävä kieli, esim. saame ei ole sallittu"
  );
  if (!isString(lokalisoituTekstiInput[kielitiedot.ensisijainenKieli as KaannettavaKieli])) {
    throw new IllegalArgumentError(
      `adaptLokalisoituTekstiToSave: lokalisoituTekstiInput.${kielitiedot.ensisijainenKieli} (ensisijainen kieli) puuttuu`
    );
  }
  const teksti: LocalizedMap<string> = {
    [kielitiedot.ensisijainenKieli]: lokalisoituTekstiInput[kielitiedot.ensisijainenKieli as KaannettavaKieli],
  };
  if (isKieliTranslatable(kielitiedot.toissijainenKieli)) {
    const toisellaKielella = lokalisoituTekstiInput[kielitiedot.toissijainenKieli as KaannettavaKieli];
    if (!isString(toisellaKielella)) {
      throw new IllegalArgumentError(
        `adaptLokalisoituTekstiToSave: lokalisoituTekstiInput.${kielitiedot.toissijainenKieli} (toissijainen kieli) puuttuu`
      );
    }
    teksti[kielitiedot.toissijainenKieli as KaannettavaKieli] = toisellaKielella;
  }
  return teksti;
}

export function adaptLokalisoituLinkkiToSave(
  lokalisoituLinkkiInput: API.LokalisoituLinkkiInput | undefined | null,
  kielitiedot: Kielitiedot
): RequiredLocalizedMap<Linkki> | undefined {
  if (!lokalisoituLinkkiInput) {
    return lokalisoituLinkkiInput as undefined;
  }

  if (!lokalisoituLinkkiInput[API.Kieli.SUOMI]) {
    throw new IllegalArgumentError(`adaptLokalisoituLinkkiToSave: lokalisoituLinkkiInput.SUOMI puuttuu`);
  }
  const teksti: RequiredLocalizedMap<Linkki> = { [API.Kieli.SUOMI]: lokalisoituLinkkiInput[API.Kieli.SUOMI] };
  assert(
    isKieliTranslatable(kielitiedot.ensisijainenKieli),
    "ensisijaisen kielen on oltava käännettävä kieli, esim. saame ei ole sallittu"
  );
  const ensisijainenKieliLinkki = lokalisoituLinkkiInput[kielitiedot.ensisijainenKieli as KaannettavaKieli];
  if (!ensisijainenKieliLinkki) {
    throw new IllegalArgumentError(
      `adaptLokalisoituLinkkiToSave: lokalisoituLinkkiInput.${kielitiedot.ensisijainenKieli} (ensisijainen kieli) puuttuu`
    );
  }
  teksti[kielitiedot.ensisijainenKieli as KaannettavaKieli] = ensisijainenKieliLinkki;
  if (kielitiedot.toissijainenKieli && isKieliTranslatable(kielitiedot.toissijainenKieli)) {
    const toisellaKielella = lokalisoituLinkkiInput[kielitiedot.toissijainenKieli as KaannettavaKieli];
    if (!toisellaKielella) {
      throw new IllegalArgumentError(
        `adaptLokalisoituLinkkiToSave: lokalisoituLinkkiInput.${kielitiedot.toissijainenKieli} (toissijainen kieli) puuttuu`
      );
    }
    teksti[kielitiedot.toissijainenKieli as KaannettavaKieli] = toisellaKielella;
  }
  return teksti;
}

export function adaptLokalisoidutLinkitToSave(
  lokalisoituLinkkiInput: API.LokalisoituLinkkiInput[] | undefined | null,
  kielitiedot: Kielitiedot
): RequiredLocalizedMap<Linkki>[] | undefined | null {
  if (!lokalisoituLinkkiInput) {
    return lokalisoituLinkkiInput;
  }
  return lokalisoituLinkkiInput
    .map((linkki) => adaptLokalisoituLinkkiToSave(linkki, kielitiedot))
    .filter((linkki) => !!linkki) as RequiredLocalizedMap<Linkki>[];
}

export function getId(
  vaihe:
    | {
        id: number | undefined;
      }
    | undefined
    | null
): number {
  let id = vaihe?.id;
  if (!id) {
    id = 1;
  }
  return id;
}

export async function forEverySaameDoAsync(func: (kieli: SaameKieli) => Promise<void>): Promise<void> {
  for (const saame in SaameKieli) {
    await func(saame as SaameKieli);
  }
}

export function adaptLadattuTiedostoToSave(
  dbLadattuTiedosto: LadattuTiedosto | null | undefined,
  inputTiedostoPath: string | null | undefined
): LadattuTiedosto | undefined | null {
  if (inputTiedostoPath == null) {
    if (dbLadattuTiedosto) {
      dbLadattuTiedosto.nimi = null;
    }
  }
  if (inputTiedostoPath) {
    if (!dbLadattuTiedosto) {
      dbLadattuTiedosto = { tiedosto: inputTiedostoPath };
    } else if (!inputTiedostoPath.endsWith(dbLadattuTiedosto.tiedosto)) {
      // Jos APIin lähetetty absoluuttinen polku ei osoita samaan tiedostoon joka on ladattu, korvataan se
      dbLadattuTiedosto.tiedosto = inputTiedostoPath;
      dbLadattuTiedosto.tuotu = undefined;
      dbLadattuTiedosto.nimi = undefined;
    }
  }
  return dbLadattuTiedosto;
}
