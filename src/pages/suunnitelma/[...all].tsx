import React from "react";
import Link from "next/link";
import useSWR from "swr";
import { useRouter } from "next/router";
import log from "loglevel";
import { lataaProjekti } from "@graphql/api";

function ProjektiPage() {
  const router = useRouter();
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
      <p>Nimi: {projekti.nimi}</p>
      <p></p>
      <p />
      <p>
        <Link href="..">
          <a className="btn btn-sm btn-success mb-2">Takaisin listaukseen</a>
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
  return await lataaProjekti(oid);
}
