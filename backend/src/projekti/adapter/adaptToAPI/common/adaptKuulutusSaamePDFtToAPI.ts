import { PathTuple } from "../../../../files/ProjektiPath";
import { KuulutusSaamePDF, KuulutusSaamePDFt, LadattuTiedosto } from "../../../../database/model";
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
    if (!kuulutusIlmoitus) {
      return;
    }
    apiPDFt[kieli] = {
      __typename: "KuulutusSaamePDF",
      kirjeTiedotettavillePDF: adaptSaamePdfTiedosto(kuulutusIlmoitus.kirjeTiedotettavillePDF, projektiPath, julkinen),
      kuulutusPDF: adaptSaamePdfTiedosto(kuulutusIlmoitus.kuulutusPDF, projektiPath, julkinen),
      kuulutusIlmoitusPDF: adaptSaamePdfTiedosto(kuulutusIlmoitus.kuulutusIlmoitusPDF, projektiPath, julkinen),
    };
  });
  return apiPDFt;
}

function adaptSaamePdfTiedosto(kuulutusPdf: LadattuTiedosto | null | undefined, projektiPath: PathTuple, julkinen: boolean) {
  return kuulutusPdf ? adaptLadattuTiedostoToAPI(projektiPath, kuulutusPdf, julkinen) : undefined;
}
