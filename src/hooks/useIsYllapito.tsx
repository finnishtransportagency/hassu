import { useRouter } from "next/router";

export const useIsYllapito = () => {
  const router = useRouter();
  return router.asPath.startsWith("/yllapito");
};
