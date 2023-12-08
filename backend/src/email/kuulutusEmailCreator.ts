import { Kayttaja } from "hassu-common/graphql/apiModel";
import { KuulutusKutsuAdapter, KuulutusKutsuAdapterProps } from "../asiakirja/adapter/kuulutusKutsuAdapter";
import { createKuulutusHyvaksyttyLaatijalleEmail, createKuulutusHyvaksyttyPpEmail } from "./emailTemplates";
import { EmailOptions } from "./model/emailOptions";

export abstract class KuulutusEmailCreator {
  protected adapter!: KuulutusKutsuAdapter<KuulutusKutsuAdapterProps>;

  public createHyvaksyttyEmailMuokkaajalle(muokkaaja: Kayttaja): EmailOptions {
    return createKuulutusHyvaksyttyLaatijalleEmail(this.adapter, muokkaaja);
  }

  public createHyvaksyttyEmailPp(): EmailOptions {
    return createKuulutusHyvaksyttyPpEmail(this.adapter);
  }
}
