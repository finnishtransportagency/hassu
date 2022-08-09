import React from "react";
import Section from "@components/layout/Section";
import { Kieli, AsiakirjaTyyppi } from "@services/api";
// import Notification, { NotificationType } from "@components/notification/Notification";
// import lowerCase from "lodash/lowerCase";
// import Button from "@components/button/Button";
// import { Box } from "@mui/material";
import { useProjekti } from "src/hooks/useProjekti";
import { KuulutuksenTiedotFormValues } from "./index";
// import { useFormContext } from "react-hook-form";

type Props = {
  esikatselePdf: (formData: KuulutuksenTiedotFormValues, asiakirjaTyyppi: AsiakirjaTyyppi, kieli: Kieli) => void;
};

export default function KuulutuksenJaIlmoituksenEsikatselu({ esikatselePdf }: Props) {
  const { data: projekti } = useProjekti();

  // const { handleSubmit } = useFormContext<KuulutuksenTiedotFormValues>();

  // const ensisijainenKieli = projekti?.kielitiedot?.ensisijainenKieli;
  // const toissijainenKieli = projekti?.kielitiedot?.toissijainenKieli;

  if (!projekti || !esikatselePdf) {
    // TODO: poista tuosta || !esikatselePdf.
    return null;
  }

  return (
    <Section>
      <h4 className="vayla-small-title">Kuulutuksen ja ilmoituksen esikatselu</h4>
    </Section>
  );
}
