import { AnnaPalautettaPalvelustaMutationVariables } from "../../../common/graphql/apiModel";
import { createAnnaPalautettaPalvelustaEmail } from "../email/emailTemplates";
import { emailClient } from "../email/email";
import { log } from "../logger";

class PalautePalvelustaJulkinenHandler {
  async lisaaPalautePalvelusta(input: AnnaPalautettaPalvelustaMutationVariables) {
    const emailOptions = createAnnaPalautettaPalvelustaEmail(input.palveluPalauteInput);
    try {
      await emailClient.sendEmail(emailOptions);
    } catch {
      log.error("Palautteen lähetys epäonnistui", input);
    }
  }
}

export const palautePalvelustaJulkinenHandler = new PalautePalvelustaJulkinenHandler();
