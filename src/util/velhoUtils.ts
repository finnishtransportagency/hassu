import { Projekti } from "hassu-common/graphql/apiModel";
import { getPublicEnv } from "./env";

export const isKuntatietoMissing = (projekti: Projekti) => {
  return !projekti.velho.maakunnat || !projekti.velho.kunnat;
};

export const getVelhoUrl = (oid: Projekti["oid"]) => {
  return getPublicEnv("VELHO_BASE_URL") + "/projektivelho/projektit/oid-" + oid + "/toimeksiannot";
};
