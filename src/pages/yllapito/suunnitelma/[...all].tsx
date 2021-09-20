import { AddEditSuunnitelma } from "../../../components/addEditSuunnitelma";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Suunnitelma } from "../../../graphql/apiModel";
import { getSuunnitelmaById } from "../../../graphql/api";

export default function EditSuunnitelmaPage() {
  const router = useRouter();
  const id = router.query.all?.[0];
  const [suunnitelma, setSuunnitelma] = useState<Suunnitelma>();

  useEffect(() => {
    async function loadSuunnitelma() {
      if (id) {
        setSuunnitelma(await getSuunnitelmaById(id));
      }
    }

    loadSuunnitelma().then();
  }, [id]);

  if (!suunnitelma) {
    return <></>;
  }

  return <AddEditSuunnitelma key={id} suunnitelma={suunnitelma} />;
}
