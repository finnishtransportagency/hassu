import { DBProjekti } from "../backend/src/database/model";
import { Projekti, SuunnittelustaVastaavaViranomainen } from "./graphql/apiModel";

export const isVaylaAsianhallinta = (projekti: Pick<DBProjekti | Projekti, "velho">) =>
  projekti?.velho?.suunnittelustaVastaavaViranomainen == SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO;
