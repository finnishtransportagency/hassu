import { AnnaPalautettaPalvelustaMutationVariables } from "hassu-common/graphql/apiModel";
import { createAnnaPalautettaPalvelustaEmail } from "../email/emailTemplates";
import { emailClient } from "../email/email";
import { log } from "../logger";

class PalautePalvelustaJulkinenHandler {
  async lisaaPalautePalvelusta(input: AnnaPalautettaPalvelustaMutationVariables) {
    try {
      const emailOptions = createAnnaPalautettaPalvelustaEmail(input.palveluPalauteInput);
      await emailClient.sendEmail(emailOptions);
    } catch {
      log.error("Palautteen lähetys epäonnistui", input);
    }
  }
}

export const palautePalvelustaJulkinenHandler = new PalautePalvelustaJulkinenHandler();
