import React from "react";
import useTranslation from "next-translate/useTranslation";
import { ProjektinJakotieto } from "hassu-common/graphql/apiModel";
import ContentSpacer from "@components/layout/ContentSpacer";
import { H3 } from "@components/Headings";
import { DashedList } from "./DashedList";
import { ProjektinJakotietoJulkinen } from "./ProjektinJakotietoJulkinen";

export function LiittyvatSuunnitelmat({ liittyvatSuunnitelmat }: { liittyvatSuunnitelmat: ProjektinJakotieto[] | null | undefined }) {
  const { t } = useTranslation("projekti");

  if (!liittyvatSuunnitelmat?.length) {
    return <></>;
  }

  return (
    <ContentSpacer>
      <H3 variant="h4">{t(`liittyvat-suunnitelmat.title`)}</H3>
      <p>{t("liittyvat-suunnitelmat.kuulutettu-yhdessa", { count: liittyvatSuunnitelmat.length })}</p>
      <DashedList>
        {liittyvatSuunnitelmat.map((jakotieto) => (
          <li key={jakotieto.oid}>
            <ProjektinJakotietoJulkinen jakotieto={jakotieto} />
          </li>
        ))}
      </DashedList>
    </ContentSpacer>
  );
}
