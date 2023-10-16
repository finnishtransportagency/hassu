import useSWR, { Fetcher, SWRConfiguration } from "swr";
import { apiConfig, KayttajaTyyppi, NykyinenKayttaja, Projekti, SuunnittelustaVastaavaViranomainen } from "@services/api";
import { ProjektiLisatiedolla, ProjektiLisatiedot } from "hassu-common/ProjektiValidationContext";
import useCurrentUser from "./useCurrentUser";
import { useRouter } from "next/router";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo } from "react";

export type useProjektiOptions = SWRConfiguration<ProjektiLisatiedolla | null, any, Fetcher<ProjektiLisatiedolla | null>> | undefined;

export function useProjekti(config: useProjektiOptions = {}) {
  const api = useApi();
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  if (!router.asPath.startsWith("/yllapito")) {
    throw new Error("Inproper route for the use of useProjekti hook");
  }

  const projektiLoader = useMemo(() => getProjektiLoader(api), [api]);

  const { data: kayttaja } = useCurrentUser();
  return useSWR([apiConfig.lataaProjekti.graphql, oid, kayttaja], projektiLoader, config);
}

const getProjektiLoader = (api: API) => async (_query: string, oid: string | undefined, kayttaja: NykyinenKayttaja | undefined) => {
  if (!oid) {
    return null;
  }
  if (!kayttaja) {
    return null;
  }
  const projekti = await api.lataaProjekti(oid);
  const lisatiedot: ProjektiLisatiedot = {
    nykyinenKayttaja: {
      omaaMuokkausOikeuden: userIsAdmin(kayttaja) || userHasAccessToProjekti({ projekti, kayttaja }),
      onProjektipaallikkoTaiVarahenkilo: userIsAdmin(kayttaja) || userIsProjectManagerOrSubstitute({ kayttaja, projekti }),
      onYllapitaja: userIsAdmin(kayttaja),
    },
  };
  return {
    ...projekti,
    ...lisatiedot,
  } as ProjektiLisatiedolla;
};

const userIsAdmin = (kayttaja?: NykyinenKayttaja) => !!kayttaja?.roolit?.includes("hassu_admin");
const userHasAccessToProjekti = ({ kayttaja, projekti }: { kayttaja?: NykyinenKayttaja; projekti?: Projekti }) =>
  !!kayttaja?.uid && !!projekti?.kayttoOikeudet?.some(({ kayttajatunnus }) => kayttaja.uid === kayttajatunnus);
const userIsProjectManagerOrSubstitute = ({ kayttaja, projekti }: { kayttaja?: NykyinenKayttaja; projekti?: Projekti }) =>
  !!kayttaja?.uid &&
  !!projekti?.kayttoOikeudet?.find(
    ({ kayttajatunnus, tyyppi }) =>
      kayttaja.uid === kayttajatunnus && (tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO || tyyppi === KayttajaTyyppi.VARAHENKILO)
  );
