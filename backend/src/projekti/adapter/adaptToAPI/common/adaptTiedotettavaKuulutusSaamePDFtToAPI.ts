import { PathTuple } from "../../../../files/ProjektiPath";
import { TiedotettavaKuulutusSaamePDF, TiedotettavaKuulutusSaamePDFt } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { forEverySaameDo } from "../../common";
import { adaptLadattuTiedostoToAPI } from ".";

export function adaptTiedotettavaKuulutusSaamePDFtToAPI(
  projektiPath: PathTuple,
  dbPDFt: TiedotettavaKuulutusSaamePDFt | undefined,
  julkinen: boolean
): API.TiedotettavaKuulutusSaamePDFt | undefined {
  if (!dbPDFt) {
    return undefined;
  }
  const apiPDFt: API.TiedotettavaKuulutusSaamePDFt = { __typename: "TiedotettavaKuulutusSaamePDFt" };
  forEverySaameDo((kieli) => {
    const kuulutusIlmoitus: TiedotettavaKuulutusSaamePDF | undefined = dbPDFt[kieli];
    if (kuulutusIlmoitus) {
      const kuulutusIlmoitusPDFt: API.TiedotettavaKuulutusSaamePDF = { __typename: "TiedotettavaKuulutusSaamePDF" };
      if (kuulutusIlmoitus.kuulutusPDF) {
        kuulutusIlmoitusPDFt.kuulutusPDF = adaptLadattuTiedostoToAPI(projektiPath, kuulutusIlmoitus.kuulutusPDF, julkinen);
      }
      if (kuulutusIlmoitus.kuulutusIlmoitusPDF) {
        kuulutusIlmoitusPDFt.kuulutusIlmoitusPDF = adaptLadattuTiedostoToAPI(projektiPath, kuulutusIlmoitus.kuulutusIlmoitusPDF, julkinen);
      }
      if (kuulutusIlmoitus.kirjeTiedotettavillePDF) {
        kuulutusIlmoitusPDFt.kuulutusIlmoitusPDF = adaptLadattuTiedostoToAPI(
          projektiPath,
          kuulutusIlmoitus.kirjeTiedotettavillePDF,
          julkinen
        );
      }
      apiPDFt[kieli] = kuulutusIlmoitusPDFt;
    }
  });
  return apiPDFt;
}
