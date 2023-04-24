import Section from "@components/layout/Section2";
import { VuorovaikutusKierrosJulkaisu } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import React, { VFC } from "react";
import { yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";

export const VuorovaikuttamisenYhteysHenkilot: VFC<{
  julkaisu: VuorovaikutusKierrosJulkaisu;
}> = ({ julkaisu }) => {
  const { t } = useTranslation("suunnittelu");

  return (
    <Section>
      <h4 className="vayla-label">Kutsussa esitettävät yhteyshenkilöt</h4>
      {julkaisu.yhteystiedot?.map((yhteystieto, index) => {
        return <p key={index}>{yhteystietoKansalaiselleTekstiksi("fi", yhteystieto, t)}</p>;
      })}
    </Section>
  );
};
