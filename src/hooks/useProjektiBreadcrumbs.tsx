import { useEffect } from "react";
import { useRouter } from "next/router";
import { useProjekti } from "./useProjekti";
import { PageProps } from "@pages/_app";

export const useProjektiBreadcrumbs = (setRouteLabels: PageProps["setRouteLabels"]) => {
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti } = useProjekti(oid);

  useEffect(() => {
    if (router.isReady) {
      let routeLabel = "";
      if (projekti?.velho?.nimi) {
        routeLabel = projekti.velho?.nimi;
      } else if (typeof oid === "string") {
        routeLabel = oid;
      }
      if (routeLabel) {
        setRouteLabels({
          "/yllapito/projekti/[oid]": { label: routeLabel },
          "/yllapito/perusta/[oid]": { label: routeLabel },
          "/suunnitelma/[oid]": { label: routeLabel }
        });
      }
    }
  }, [router.isReady, oid, projekti, setRouteLabels]);
};

export default useProjektiBreadcrumbs;
