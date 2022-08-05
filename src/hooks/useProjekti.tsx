import useSWR from "swr";
import { api, apiConfig, NykyinenKayttaja, Projekti, ProjektiRooli } from "@services/api";
import useCurrentUser from "./useCurrentUser";
import { useRouter } from "next/router";

export function useProjekti() {
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  if (!router.route.startsWith("/yllapito")) {
    throw new Error("Inproper route for the use of useProjekti hook");
  }
  const { data: kayttaja } = useCurrentUser();
  return useSWR([apiConfig.lataaProjekti.graphql, oid, kayttaja], projektiLoader);
}

interface ProjektiLisatiedot {
  nykyinenKayttaja: { omaaMuokkausOikeuden: boolean; onProjektipaallikko: boolean; onYllapitaja: boolean };
}

export type ProjektiLisatiedolla = Projekti & ProjektiLisatiedot;

async function projektiLoader(_query: string, oid: string | undefined, kayttaja: NykyinenKayttaja | undefined) {
  if (!oid) {
    return null;
  }
  const projekti = await api.lataaProjekti(oid);
  const lisatiedot: ProjektiLisatiedot = {
    nykyinenKayttaja: {
      omaaMuokkausOikeuden: userIsAdmin(kayttaja) || userHasAccessToProjekti({ projekti, kayttaja }),
      onProjektipaallikko: userIsAdmin(kayttaja) || userIsProjectManager({ kayttaja, projekti }),
      onYllapitaja: userIsAdmin(kayttaja),
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
const userIsProjectManager = ({ kayttaja, projekti }: { kayttaja?: NykyinenKayttaja; projekti?: Projekti }) =>
  !!kayttaja?.uid &&
  !!projekti?.kayttoOikeudet?.find(
    ({ kayttajatunnus, rooli }) => kayttaja.uid === kayttajatunnus && rooli === ProjektiRooli.PROJEKTIPAALLIKKO
  );
