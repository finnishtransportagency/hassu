import React from "react";
import { Kieli, ProjektinJakotieto } from "hassu-common/graphql/apiModel";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { ExternalStyledLink } from "@components/StyledLink";

export function ProjektinJakotietoJulkinen({ jakotieto }: { jakotieto: ProjektinJakotieto }): React.JSX.Element {
  const kieli = useKansalaiskieli();
  const nimi = jakotieto.nimi[kieli] ?? jakotieto.nimi[Kieli.SUOMI];

  if (!jakotieto.julkinen) {
    return <>{nimi}</>;
  }

  return <ExternalStyledLink href={{ pathname: "/suunnitelma/[oid]", query: { oid: jakotieto.oid } }}>{nimi}</ExternalStyledLink>;
}
