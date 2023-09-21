import React, { useMemo } from "react";
import { formatDate } from "hassu-common/util/dateUtils";
import ExtLink from "@components/ExtLink";
import ContentSpacer from "@components/layout/ContentSpacer";
import { splitFilePath } from "src/util/fileUtil";
import { Tagi } from "@components/Tagi";
import useTranslation from "next-translate/useTranslation";

type TiedostoLinkkiListaProps = {
  tiedostot: string[];
  julkaisupaiva: string;
};

export const TiedostoLinkkiLista = ({ tiedostot, julkaisupaiva }: TiedostoLinkkiListaProps) => {
  return (
    <ContentSpacer as="ul" gap={2}>
      {tiedostot.map((tiedosto, index) => (
        <TiedostoLinkki key={index} tiedosto={tiedosto} julkaisupaiva={julkaisupaiva} />
      ))}
    </ContentSpacer>
  );
};

type TiedostoLinkkiProps = {
  tiedosto: string;
  julkaisupaiva: string;
  tiedostoNimi?: string;
  isUusiAineisto?: boolean;
};

export function TiedostoLinkki({ tiedosto, julkaisupaiva, tiedostoNimi, isUusiAineisto }: TiedostoLinkkiProps): JSX.Element {
  const { t } = useTranslation("aineisto");
  const { fileExt, fileName, path } = useMemo(() => splitFilePath(tiedosto), [tiedosto]);

  return (
    <li>
      <ExtLink className="file_download" sx={{ marginRight: 8 }} href={path || ""}>
        {tiedostoNimi || fileName}{" "}
        <span className="text-black ml-2">
          ({fileExt}) {formatDate(julkaisupaiva)}
        </span>
      </ExtLink>
      {isUusiAineisto && <Tagi>{t("aineisto:uusi-aineisto")}</Tagi>}
    </li>
  );
}
