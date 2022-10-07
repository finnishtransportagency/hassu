import React, { useEffect } from "react";
import useTranslation from "next-translate/useTranslation";
import log from "loglevel";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { useRouter } from "next/router";
import { getSivuTilanPerusteella } from "@components/kansalaisenEtusivu/Hakutulokset";
import { PageProps } from "@pages/_app";
import useProjektiBreadcrumbsJulkinen from "src/hooks/useProjektiBreadcrumbsJulkinen";

function ProjektiPage({ setRouteLabels }: PageProps) {
  useProjektiBreadcrumbsJulkinen(setRouteLabels);
  const { t } = useTranslation("common");
  const { data: projekti, error } = useProjektiJulkinen();
  const router = useRouter();

  useEffect(() => {
    if (projekti) router.push(`/suunnitelma/${projekti?.oid}/${getSivuTilanPerusteella(projekti?.status)}`);
  }, [projekti, router]);

  if (error) {
    return <>{t("common:projektin_lataamisessa_virhe")}</>;
  }

  if (!projekti) {
    log.info("loading");
    return (
      <>
        <p>{t("siirrytaan-aktiiviseen-vaiheeseen")}</p>
      </>
    );
  }

  return (
    <>
      <p>{t("siirrytaan-aktiiviseen-vaiheeseen")}</p>
    </>
  );
}

export default ProjektiPage;
