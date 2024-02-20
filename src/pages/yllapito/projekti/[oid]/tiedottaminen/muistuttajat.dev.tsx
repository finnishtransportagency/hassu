import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { TiedottaminenPageLayout } from "@components/projekti/tiedottaminen/TiedottaminenPageLayout";
import React from "react";

type Props = {};

export default function Muistuttajat({}: Props) {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <TiedottaminenPageLayout projekti={projekti}>muistuttajat</TiedottaminenPageLayout>}
    </ProjektiConsumer>
  );
}
