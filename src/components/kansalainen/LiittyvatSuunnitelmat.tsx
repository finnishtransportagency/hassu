import React from "react";
import useTranslation from "next-translate/useTranslation";
import { ProjektinJakotieto } from "hassu-common/graphql/apiModel";
import ContentSpacer from "@components/layout/ContentSpacer";
import { H3 } from "@components/Headings";
import { ProjektinJakotietoJulkinen } from "./ProjektinJakotietoJulkinen";
import Trans from "next-translate/Trans";

export function LiittyvatSuunnitelmat({ liittyvatSuunnitelma }: { liittyvatSuunnitelma: ProjektinJakotieto | null | undefined }) {
  const { t } = useTranslation("projekti");

  if (!liittyvatSuunnitelma) {
    return <></>;
  }

  return (
    <ContentSpacer>
      <H3 variant="h4">{t(`liittyvat-suunnitelmat.title`)}</H3>
      <p>
        <Trans
          i18nKey="projekti:liittyvat-suunnitelmat.kuulutettu-yhdessa"
          components={{
            suunnitelma: <ProjektinJakotietoJulkinen jakotieto={liittyvatSuunnitelma} />,
          }}
        />
        {!liittyvatSuunnitelma.julkinen && ` ${t("liittyvat-suunnitelmat.ei-julkaisuja")}`}
      </p>
    </ContentSpacer>
  );
}
