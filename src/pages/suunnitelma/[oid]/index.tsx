import React, { useEffect } from "react";
import useTranslation from "next-translate/useTranslation";
import log from "loglevel";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { useRouter } from "next/router";
import { getSivuTilanPerusteella } from "@components/kansalaisenEtusivu/Hakutulokset";
import { Status } from "@services/api";
import EiJulkaistuSivu from "@components/kansalainen/EiJulkaistuSivu";

function ProjektiPage() {
  const { t } = useTranslation("common");
  const { data: projekti, error } = useProjektiJulkinen();
  const router = useRouter();

  useEffect(() => {
    if (projekti && projekti.status !== Status.EI_JULKAISTU)
      router.push(`/suunnitelma/${projekti?.oid}/${getSivuTilanPerusteella(projekti?.status)}`);
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

  if (projekti.status === Status.EI_JULKAISTU) {
    return <EiJulkaistuSivu />;
  }

  return (
    <>
      <p>{t("siirrytaan-aktiiviseen-vaiheeseen")}</p>
    </>
  );
}

export default ProjektiPage;
