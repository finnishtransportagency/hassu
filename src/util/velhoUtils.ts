import { Projekti } from "hassu-common/graphql/apiModel";

export const isKuntatietoMissing = (projekti: Projekti) => {
    return !projekti.velho.maakunnat || !projekti.velho.kunnat 
}

export const getVelhoUrl = (oid: Projekti["oid"]) => {
    return process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-" + oid;
}