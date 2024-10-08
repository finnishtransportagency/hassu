import { KuulutusPDFInput, KuulutusSaamePDFtInput } from "hassu-common/graphql/apiModel";
import { KuulutusSaamePDFt } from "../../../../database/model";
import { adaptLadattuTiedostoToSave } from ".";
import { forEverySaameDo } from "../../common";

export function adaptKuulutusSaamePDFtInput(
  dbKuulutusSaamePDFt: KuulutusSaamePDFt | undefined | null,
  pdftInput: KuulutusSaamePDFtInput
): KuulutusSaamePDFt | undefined | null {
  if (!pdftInput) {
    return dbKuulutusSaamePDFt;
  }
  let result = dbKuulutusSaamePDFt;
  forEverySaameDo((kieli) => {
    const kuulutusPDFInputForKieli: KuulutusPDFInput | undefined | null = pdftInput[kieli];
    if (kuulutusPDFInputForKieli) {
      if (!result) {
        result = {};
      }
      let dbPDFt = result[kieli];
      if (!dbPDFt) {
        dbPDFt = {};
        result[kieli] = dbPDFt;
      }

      dbPDFt.kuulutusPDF = adaptLadattuTiedostoToSave(dbPDFt.kuulutusPDF, kuulutusPDFInputForKieli.kuulutusPDFPath);
      dbPDFt.kuulutusIlmoitusPDF = adaptLadattuTiedostoToSave(dbPDFt.kuulutusIlmoitusPDF, kuulutusPDFInputForKieli.kuulutusIlmoitusPDFPath);
      dbPDFt.kirjeTiedotettavillePDF = adaptLadattuTiedostoToSave(
        dbPDFt.kirjeTiedotettavillePDF,
        kuulutusPDFInputForKieli.kirjeTiedotettavillePDFPath
      );
    }
  });

  return result;
}
