import { useEffect } from "react";
import { useRouter } from "next/router";
import { PageProps } from "@pages/_app";
import { useProjektiJulkinen } from "./useProjektiJulkinen";

export const useProjektiBreadcrumbsJulkinen = (setRouteLabels: PageProps["setRouteLabels"]) => {
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti } = useProjektiJulkinen(oid);

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
          "/suunnitelma/[oid]": { label: routeLabel },
        });
      }
    }
  }, [router.isReady, oid, projekti, setRouteLabels]);
};

export default useProjektiBreadcrumbsJulkinen;
