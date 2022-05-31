import useSWR from "swr";
import { api, apiConfig, NykyinenKayttaja, Projekti, ProjektiRooli } from "@services/api";
import useCurrentUser from "./useCurrentUser";
import { useState } from "react";
import { isEqual } from "lodash";

export function useProjekti(oid?: string) {
  const [some, setSome] = useState<{ [key: string]: ProjektiLisatiedolla }>({});
  const { data: kayttaja } = useCurrentUser();

  console.log({ oid });
  const swr = useSWR([apiConfig.lataaProjekti.graphql, oid, kayttaja], projektiLoader, {
    onSuccess: (data, key) => {
      if (data) {
        some[key] = data;
        setSome(some);
      }
    },

    fallback: some,
    compare: (a, b) => {
      const result = isEqual(a, b);
      console.log({ result, a, b });
      return result;
    },
  });

  return swr;
}

interface ProjektiLisatiedot {
  nykyinenKayttaja: { omaaMuokkausOikeuden: boolean; onProjektipaallikko: boolean };
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
      onProjektipaallikko: userIsAdmin(kayttaja) || userIsProjectManager({ kayttaja, projekti }),
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

export default useProjekti;
