import React from "react";
import useTranslation from "next-translate/useTranslation";
import { SuunnitelmaJaettuJulkinen } from "hassu-common/graphql/apiModel";
import ContentSpacer from "@components/layout/ContentSpacer";
import { H3 } from "@components/Headings";
import { ProjektinJakotietoJulkinen } from "./ProjektinJakotietoJulkinen";
import Trans from "next-translate/Trans";

export function LiittyvatSuunnitelmat({ suunnitelmaJaettu }: { suunnitelmaJaettu: SuunnitelmaJaettuJulkinen | null | undefined }) {
  const { t } = useTranslation("projekti");

  const liittyvaSuunnitelma = suunnitelmaJaettu?.julkaisuKopioituSuunnitelmaan ?? suunnitelmaJaettu?.julkaisuKopioituSuunnitelmasta;

  if (!liittyvaSuunnitelma) {
    return <></>;
  }

  return (
    <ContentSpacer>
      <H3 variant="h4">{t(`liittyvat-suunnitelmat.title`)}</H3>
      <p>
        <Trans
          i18nKey="projekti:liittyvat-suunnitelmat.kuulutettu-yhdessa"
          components={{
            suunnitelma: <ProjektinJakotietoJulkinen jakotieto={liittyvaSuunnitelma} />,
          }}
        />
        {!liittyvaSuunnitelma.julkinen && ` ${t("liittyvat-suunnitelmat.ei-julkaisuja")}`}
      </p>
    </ContentSpacer>
  );
}
