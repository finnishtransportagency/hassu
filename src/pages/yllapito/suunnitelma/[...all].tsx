import { AddEditSuunnitelma } from "../../../components/addEditSuunnitelma";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { API, graphqlOperation } from "aws-amplify";
import { getSuunnitelmaById } from "../../../graphql/queries";
import { Suunnitelma } from "../../../API";

export default function EditSuunnitelmaPage() {
  const router = useRouter();
  const id = router.query.all?.[0];
  const [suunnitelma, setSuunnitelma] = useState<Suunnitelma>();

  useEffect(() => {
    async function loadSuunnitelma() {
      if (id) {
        const result = (await API.graphql(graphqlOperation(getSuunnitelmaById, { suunnitelmaId: id }))) as Suunnitelma;
        // @ts-ignore
        const loaded = result.data.getSuunnitelmaById;
        setSuunnitelma(loaded);
      }
    }

    loadSuunnitelma();
  }, [id]);

  if (!suunnitelma) {
    return <></>;
  }

  return <AddEditSuunnitelma key={id} suunnitelma={suunnitelma} />;
}
