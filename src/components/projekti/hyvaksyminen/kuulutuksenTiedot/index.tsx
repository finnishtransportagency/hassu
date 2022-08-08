import React from "react";
import { useProjekti } from "src/hooks/useProjekti";
//import { useFormContext } from "react-hook-form";

export default function KuulutuksenJaIlmoituksenEsikatselu() {
  const { data: projekti } = useProjekti();

  //const { handleSubmit } = useFormContext<tyypitys>();

  if (!projekti) {
    return null;
  }

  return <div>OSIO</div>;
}
