import { useRouter } from "next/router";

export const useIsYllapito = () => {
  const router = useRouter();
  // Käytetään router.pathname propertya, joka käyttää internal route templatea
  // jolloin mahdolliset next.config.js tason rewritet on huomioitu
  // asPath käyttää sisääntulevaa clientin pyytämää urlia
  return router.pathname.startsWith("/yllapito");
};
