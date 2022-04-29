import React from "react";
import Link from "next/link";
import useSWR from "swr";
import { useRouter } from "next/router";
import useTranslation from "next-translate/useTranslation";
import log from "loglevel";
import { api } from "@services/api";

function ProjektiPage() {
  const router = useRouter();
  const { t } = useTranslation("projekti");
  const oid = router.query.all?.[0];
  const { data: projekti, error } = useSWR(JSON.stringify({ oid }), projektiLoader);
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
      <p>{t("ui-otsikot.nimi")}{": "}{projekti.velho?.nimi}</p>
      <p/>
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

export async function projektiLoader(params: string) {
  const oid = JSON.parse(params).oid;
  if (!oid) {
    return null;
  }
  return await api.lataaProjekti(oid);
}
