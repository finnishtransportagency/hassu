import { Kayttaja } from "hassu-common/graphql/apiModel";
import { personSearch } from "../../personSearch/personSearchClient";

export abstract class KuulutusHyvaksyntaEmailSender {
  public abstract sendEmails(oid: string): Promise<void>;

  async getKayttaja(uid: string): Promise<Kayttaja | undefined> {
    const kayttajas = await personSearch.getKayttajas();
    return kayttajas.getKayttajaByUid(uid);
  }
}
