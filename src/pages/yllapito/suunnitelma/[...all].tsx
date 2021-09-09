import { AddEditSuunnitelma } from "../../../components/addEditSuunnitelma";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { getSuunnitelmaById } from "../../../graphql/queries";
import { Suunnitelma } from "../../../API";
import { callAPI } from "../../../graphql/apiEndpoint";
import { graphqlOperation } from "aws-amplify";

export default function EditSuunnitelmaPage() {
  const router = useRouter();
  const id = router.query.all?.[0];
  const [suunnitelma, setSuunnitelma] = useState<Suunnitelma>();

  useEffect(() => {
    async function loadSuunnitelma() {
      if (id) {
        const result = (await callAPI(graphqlOperation(getSuunnitelmaById, { suunnitelmaId: id }))) as Suunnitelma;
        // @ts-ignore
        const loaded = result.data.getSuunnitelmaById;
        setSuunnitelma(loaded);
      }
    }

    loadSuunnitelma().then();
  }, [id]);

  if (!suunnitelma) {
    return <></>;
  }

  return <AddEditSuunnitelma key={id} suunnitelma={suunnitelma} />;
}
