import { PathTuple } from "../../../../files/ProjektiPath";
import { KuulutusSaamePDF, KuulutusSaamePDFt } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { forEverySaameDo } from "../../common";
import { adaptLadattuTiedostoToAPI } from ".";

export function adaptKuulutusSaamePDFtToAPI(
  projektiPath: PathTuple,
  dbPDFt: KuulutusSaamePDFt | undefined,
  julkinen: boolean
): API.KuulutusSaamePDFt | undefined {
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
        kuulutusIlmoitusPDFt.kuulutusPDF = adaptLadattuTiedostoToAPI(projektiPath, ladattuTiedosto, julkinen);
      }
      ladattuTiedosto = kuulutusIlmoitus.kuulutusIlmoitusPDF;
      if (ladattuTiedosto) {
        kuulutusIlmoitusPDFt.kuulutusIlmoitusPDF = adaptLadattuTiedostoToAPI(projektiPath, ladattuTiedosto, julkinen);
      }
      apiPDFt[kieli] = kuulutusIlmoitusPDFt;
    }
  });
  return apiPDFt;
}
