import React from "react";
import useTranslation from "next-translate/useTranslation";
import { Kieli, ProjektinJakotieto } from "hassu-common/graphql/apiModel";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { ExternalStyledLink } from "@components/StyledLink";

export function ProjektinJakotietoJulkinen({ jakotieto }: { jakotieto: ProjektinJakotieto }): React.JSX.Element {
  const { t } = useTranslation("projekti");
  const kieli = useKansalaiskieli();
  const nimi = jakotieto.nimi[kieli] ?? jakotieto.nimi[Kieli.SUOMI];

  if (!jakotieto.julkinen) {
    const eiJulkaisuja = t("liittyvat-suunnitelmat.ei-julkaisuja");
    return <>{`${nimi} (${eiJulkaisuja})`}</>;
  }

  return <ExternalStyledLink href={{ pathname: "/suunnitelma/[oid]", query: { oid: jakotieto.oid } }}>{nimi}</ExternalStyledLink>;
}
