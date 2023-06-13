import { useRouter } from "next/router";
import { useMemo } from "react";
import routes, { projektiMeetsMinimumStatus } from "src/util/routes";
import { useProjekti } from "./useProjekti";

interface isAllowedOnRouteResponse {
  isAllowedOnRoute: boolean;
  pathnameForAllowedRoute?: string;
}

export const useIsAllowedOnCurrentProjektiRoute: () => isAllowedOnRouteResponse = () => {
  const { data: projekti } = useProjekti();
  const router = useRouter();

  return useMemo(() => {
    const requiredStatusForCurrentPath = routes.find((route) => route.pathname === router.pathname)?.requiredStatus;
    const isAllowedOnRoute = !requiredStatusForCurrentPath || projektiMeetsMinimumStatus(projekti, requiredStatusForCurrentPath);

    const pathnameForAllowedRoute = isAllowedOnRoute
      ? undefined
      : routes.reduce<string | undefined>((allowedPathname, route) => {
          if (projektiMeetsMinimumStatus(projekti, route.requiredStatus)) {
            allowedPathname = route.pathname;
          }
          return allowedPathname;
        }, undefined);
    return { isAllowedOnRoute, pathnameForAllowedRoute };
  }, [projekti, router.pathname]);
};

export default useIsAllowedOnCurrentProjektiRoute;
