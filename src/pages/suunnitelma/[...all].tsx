import { getSuunnitelmaById } from "../../graphql/queries";
import { Suunnitelma } from "../../graphql/apiModel";
import React from "react";
import Link from "next/link";
import useSWR from "swr";
import { useRouter } from "next/router";
import log from "loglevel";
import { callAPI } from "../../graphql/api";
import { graphqlOperation } from "aws-amplify";

function SuunnitelmaPage() {
  const router = useRouter();
  const id = router.query.all?.[0];
  const { data, error } = useSWR(JSON.stringify({ id }), suunnitelmaFetcher);
  if (error) {
    return <></>;
  }
  if (!data) {
    log.info("loading");
    return <></>;
  }
  log.info("loaded", data);
  const suunnitelma = data;
  return (
    <>
      <p>Nimi: {suunnitelma.name}</p>
      <p>Sijainti: {suunnitelma.location}</p>
      <p />
      <p>
        <Link href="..">
          <a className="btn btn-sm btn-success mb-2">Takaisin listaukseen</a>
        </Link>
      </p>
    </>
  );
}

export default SuunnitelmaPage;

export async function suunnitelmaFetcher(params: string) {
  const id = JSON.parse(params).id;
  if (!id) {
    return null;
  }
  const result = (await callAPI(graphqlOperation(getSuunnitelmaById, { suunnitelmaId: id }))) as Suunnitelma;
  // @ts-ignore
  return result.data.getSuunnitelmaById;
}
