import { AsiakirjanMuoto } from "./asiakirjaTypes";
import { AsiakirjaTyyppi, ProjektiTyyppi } from "hassu-common/graphql/apiModel";
import { assertIsDefined } from "../util/assertions";
import { translate } from "../util/localization";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

const pdfTypeKeys: Partial<Record<AsiakirjaTyyppi, Record<AsiakirjanMuoto, Partial<Record<ProjektiTyyppi, string>>>>> = {
  ALOITUSKUULUTUS: {
    TIE: { [ProjektiTyyppi.TIE]: "T412", [ProjektiTyyppi.YLEINEN]: "10YS" },
    RATA: { [ProjektiTyyppi.RATA]: "10R", [ProjektiTyyppi.YLEINEN]: "10YS" },
  },
  ILMOITUS_KUULUTUKSESTA: {
    TIE: { [ProjektiTyyppi.TIE]: "T412_1", [ProjektiTyyppi.YLEINEN]: "12YS_aloituskuulutus" },
    RATA: {
      [ProjektiTyyppi.RATA]: "12R_aloituskuulutus",
      [ProjektiTyyppi.YLEINEN]: "12YS_aloituskuulutus",
    },
  },
  [AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU]: {
    TIE: { [ProjektiTyyppi.TIE]: "T413", [ProjektiTyyppi.YLEINEN]: "20YS" },
    RATA: {
      [ProjektiTyyppi.RATA]: "20R",
      [ProjektiTyyppi.YLEINEN]: "20YS",
    },
  },
  NAHTAVILLAOLOKUULUTUS: {
    TIE: { [ProjektiTyyppi.TIE]: "T414", [ProjektiTyyppi.YLEINEN]: "30YS" },
    RATA: { [ProjektiTyyppi.RATA]: "30R", [ProjektiTyyppi.YLEINEN]: "30YS" },
  },
  ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE: {
    TIE: { [ProjektiTyyppi.TIE]: "T414_1", [ProjektiTyyppi.YLEINEN]: "12YS_nahtavillaolo" },
    RATA: {
      [ProjektiTyyppi.RATA]: "12R_nahtavillaolo",
      [ProjektiTyyppi.YLEINEN]: "12YS_nahtavillaolo",
    },
  },
  ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE: {
    TIE: { [ProjektiTyyppi.TIE]: "T415", [ProjektiTyyppi.YLEINEN]: "31YS" },
    RATA: { [ProjektiTyyppi.RATA]: "31R", [ProjektiTyyppi.YLEINEN]: "31YS" },
  },
  ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA: {
    TIE: {
      [ProjektiTyyppi.TIE]: "T431_2",
      [ProjektiTyyppi.YLEINEN]: "12YS_hyvaksymispaatos",
    },
    RATA: {
      [ProjektiTyyppi.RATA]: "12R_hyvaksymispaatos",
      [ProjektiTyyppi.YLEINEN]: "12YS_hyvaksymispaatos",
    },
  },
  ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE: {
    TIE: { [ProjektiTyyppi.TIE]: "T431_3", [ProjektiTyyppi.YLEINEN]: "62YS" },
    RATA: { [ProjektiTyyppi.RATA]: "62R", [ProjektiTyyppi.YLEINEN]: "62YS" },
  },
  ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE: {
    TIE: { [ProjektiTyyppi.TIE]: "T431_4", [ProjektiTyyppi.YLEINEN]: "63YS" },
    RATA: { [ProjektiTyyppi.RATA]: "63R", [ProjektiTyyppi.YLEINEN]: "63YS" },
  },
  ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE: {
    TIE: { [ProjektiTyyppi.TIE]: "T431_1", [ProjektiTyyppi.YLEINEN]: "61YS" },
    RATA: { [ProjektiTyyppi.RATA]: "61R", [ProjektiTyyppi.YLEINEN]: "61YS" },
  },
  HYVAKSYMISPAATOSKUULUTUS: {
    TIE: { [ProjektiTyyppi.TIE]: "T431", [ProjektiTyyppi.YLEINEN]: "60YS" },
    RATA: { [ProjektiTyyppi.RATA]: "60R", [ProjektiTyyppi.YLEINEN]: "60YS" },
  },
  JATKOPAATOSKUULUTUS: {
    TIE: { [ProjektiTyyppi.TIE]: "T441", [ProjektiTyyppi.YLEINEN]: "70YS" },
    RATA: { [ProjektiTyyppi.RATA]: "70R", [ProjektiTyyppi.YLEINEN]: "70YS" },
  },
  ILMOITUS_JATKOPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE: {
    TIE: { [ProjektiTyyppi.TIE]: "T441_1", [ProjektiTyyppi.YLEINEN]: "71YS" },
    RATA: { [ProjektiTyyppi.RATA]: "71R", [ProjektiTyyppi.YLEINEN]: "71YS" },
  },
  ILMOITUS_JATKOPAATOSKUULUTUKSESTA_MAAKUNTALIITOILLE: {
    TIE: { [ProjektiTyyppi.TIE]: "T441_3", [ProjektiTyyppi.YLEINEN]: "72YS" },
    RATA: { [ProjektiTyyppi.RATA]: "72R", [ProjektiTyyppi.YLEINEN]: "72YS" },
  },
  ILMOITUS_JATKOPAATOSKUULUTUKSESTA: {
    TIE: {
      [ProjektiTyyppi.TIE]: "T441_2",
      [ProjektiTyyppi.YLEINEN]: "12YS_jatkopaatos",
    },
    RATA: {
      [ProjektiTyyppi.RATA]: "12R_jatkopaatos",
      [ProjektiTyyppi.YLEINEN]: "12YS_jatkopaatos",
    },
  },
  JATKOPAATOSKUULUTUS2: {
    TIE: { [ProjektiTyyppi.TIE]: "T441", [ProjektiTyyppi.YLEINEN]: "70YS" },
    RATA: { [ProjektiTyyppi.RATA]: "70R", [ProjektiTyyppi.YLEINEN]: "70YS" },
  },
  ILMOITUS_JATKOPAATOSKUULUTUKSESTA2_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE: {
    TIE: { [ProjektiTyyppi.TIE]: "T441_1", [ProjektiTyyppi.YLEINEN]: "71YS" },
    RATA: { [ProjektiTyyppi.RATA]: "71R", [ProjektiTyyppi.YLEINEN]: "71YS" },
  },
  ILMOITUS_JATKOPAATOSKUULUTUKSESTA2_MAAKUNTALIITOILLE: {
    TIE: { [ProjektiTyyppi.TIE]: "T441_3", [ProjektiTyyppi.YLEINEN]: "72YS" },
    RATA: { [ProjektiTyyppi.RATA]: "72R", [ProjektiTyyppi.YLEINEN]: "72YS" },
  },
  ILMOITUS_JATKOPAATOSKUULUTUKSESTA2: {
    TIE: {
      [ProjektiTyyppi.TIE]: "T441_2",
      [ProjektiTyyppi.YLEINEN]: "12YS_jatkopaatos",
    },
    RATA: {
      [ProjektiTyyppi.RATA]: "12R_jatkopaatos",
      [ProjektiTyyppi.YLEINEN]: "12YS_jatkopaatos",
    },
  },
};

export function createPDFFileName(
  asiakirjaTyyppi: AsiakirjaTyyppi,
  asiakirjanMuoto: AsiakirjanMuoto,
  projektiTyyppi: ProjektiTyyppi | null | undefined,
  kieli: KaannettavaKieli
): string {
  assertIsDefined(projektiTyyppi, "ProjektiTyyppi puuttuu!");
  if (
    (asiakirjanMuoto === AsiakirjanMuoto.RATA && projektiTyyppi === ProjektiTyyppi.TIE) ||
    (asiakirjanMuoto === AsiakirjanMuoto.TIE && projektiTyyppi === ProjektiTyyppi.RATA)
  ) {
    throw new Error(
      `Asiakirjan tyyppi ja projektityyppi ristiriidassa! asiakirjanMuoto=${asiakirjanMuoto} projektiTyyppi=${projektiTyyppi}`
    );
  }

  const pdfType = pdfTypeKeys[asiakirjaTyyppi]?.[asiakirjanMuoto]?.[projektiTyyppi];
  if (!pdfType) {
    throw new Error(`pdfTypeä ei löydy: ` + asiakirjaTyyppi + " " + asiakirjanMuoto + " " + projektiTyyppi);
  }
  const language = kieli;
  const kaannos: string = translate("tiedostonimi." + pdfType, language) ?? "";
  if (kaannos) {
    return kaannos;
  } else {
    throw new Error(`Puuttu käännös tiedostonimi.${pdfType}:lle`);
  }
}
