import Section from "@components/layout/Section2";
import { VuorovaikutusKierrosJulkaisu } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import React, { FunctionComponent } from "react";
import { yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";
import { H3 } from "../../../Headings";

export const VuorovaikuttamisenYhteysHenkilot: FunctionComponent<{
  julkaisu: VuorovaikutusKierrosJulkaisu;
}> = ({ julkaisu }) => {
  const { t } = useTranslation("suunnittelu");

  return (
    <Section>
      <H3>Kutsussa esitettävät yhteyshenkilöt</H3>
      {julkaisu.yhteystiedot?.map((yhteystieto, index) => {
        return <p key={index}>{yhteystietoKansalaiselleTekstiksi("fi", yhteystieto, t)}</p>;
      })}
    </Section>
  );
};
