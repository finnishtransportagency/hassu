import { DBProjekti } from "../backend/src/database/model";
import { Projekti, SuunnittelustaVastaavaViranomainen } from "./graphql/apiModel";

export const isVaylaAsianhallinta = (projekti: DBProjekti | Projekti) =>
  projekti?.velho?.suunnittelustaVastaavaViranomainen == SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO;
