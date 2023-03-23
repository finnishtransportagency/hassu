import { PathTuple } from "../../../files/ProjektiPath";
import { KuulutusSaamePDF, KuulutusSaamePDFt, LadattuTiedosto } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { forEverySaameDo } from "../common";

export function adaptKuulutusSaamePDFt(projektiPath: PathTuple, dbPDFt: KuulutusSaamePDFt | undefined): API.KuulutusSaamePDFt | undefined {
  if (!dbPDFt) {
    return undefined;
  }
  const apiPDFt: API.KuulutusSaamePDFt = { __typename: "KuulutusSaamePDFt" };
  forEverySaameDo((kieli) => {
    const kuulutusIlmoitus: KuulutusSaamePDF | undefined = dbPDFt[kieli];
    if (kuulutusIlmoitus) {
      const kuulutusIlmoitusPDFt: API.KuulutusSaamePDF = { __typename: "KuulutusSaamePDF" };
      let ladattuTiedosto = kuulutusIlmoitus.kuulutusPDF;
      if (ladattuTiedosto) {
        kuulutusIlmoitusPDFt.kuulutusPDF = adaptLadattuTiedostoToAPI(projektiPath, ladattuTiedosto);
      }
      ladattuTiedosto = kuulutusIlmoitus.kuulutusIlmoitusPDF;
      if (ladattuTiedosto) {
        kuulutusIlmoitusPDFt.kuulutusIlmoitusPDF = adaptLadattuTiedostoToAPI(projektiPath, ladattuTiedosto);
      }
      apiPDFt[kieli] = kuulutusIlmoitusPDFt;
    }
  });
  return apiPDFt;
}

export function adaptLadattuTiedostoToAPI(projektiPath: PathTuple, ladattuTiedosto: LadattuTiedosto): API.LadattuTiedosto | undefined {
  if (ladattuTiedosto && ladattuTiedosto.nimi) {
    const { tiedosto, nimi, tuotu } = ladattuTiedosto;
    return { __typename: "LadattuTiedosto", tiedosto: projektiPath.yllapitoFullPath + tiedosto, nimi, tuotu };
  }
}
