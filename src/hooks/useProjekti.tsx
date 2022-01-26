import useSWR from "swr";
import { api, apiConfig, NykyinenKayttaja, Projekti } from "@services/api";
import useCurrentUser from "./useCurrentUser";

export function useProjekti(oid?: string) {
  const { data: kayttaja } = useCurrentUser();
  return useSWR([apiConfig.lataaProjekti.graphql, oid, kayttaja], projektiLoader);
}

interface ProjektiLisatiedot {
  nykyinenKayttaja: { omaaMuokkausOikeuden: boolean };
}

export type ProjektiLisatiedolla = Projekti & ProjektiLisatiedot;

async function projektiLoader(_: string, oid: string | undefined, kayttaja: NykyinenKayttaja | undefined) {
  if (!oid) {
    return null;
  }
  const projekti = await api.lataaProjekti(oid);
  const lisatiedot: ProjektiLisatiedot = {
    nykyinenKayttaja: {
      omaaMuokkausOikeuden: userIsAdmin(kayttaja) || userHasAccessToProjekti({ projekti, kayttaja }),
    },
  };
  return {
    ...projekti,
    ...lisatiedot,
  } as ProjektiLisatiedolla;
}

const userIsAdmin = (kayttaja?: NykyinenKayttaja) => !!kayttaja?.roolit?.includes("hassu_admin");
const userHasAccessToProjekti = ({ kayttaja, projekti }: { kayttaja?: NykyinenKayttaja; projekti?: Projekti }) =>
  !!kayttaja?.uid && !!projekti?.kayttoOikeudet?.some(({ kayttajatunnus }) => kayttaja.uid === kayttajatunnus);

export default useProjekti;
