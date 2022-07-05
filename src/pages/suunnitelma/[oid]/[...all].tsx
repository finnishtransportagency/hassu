import React from "react";
import Link from "next/link";
import useTranslation from "next-translate/useTranslation";
import log from "loglevel";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";

function ProjektiPage() {
  const { t } = useTranslation("projekti");
  const { data: projekti, error } = useProjektiJulkinen();
  if (error) {
    return <></>;
  }
  if (!projekti) {
    log.info("loading");
    return <></>;
  }
  log.info("loaded", projekti);
  return (
    <>
      <p>
        {t("ui-otsikot.nimi")}
        {": "}
        {projekti.velho?.nimi}
      </p>
      <p />
      <p />
      <p>
        <Link href="..">
          <a className="btn btn-sm btn-success mb-2">{t("ui-linkkitekstit.takaisin_listaukseen")}</a>
        </Link>
      </p>
    </>
  );
}

export default ProjektiPage;
