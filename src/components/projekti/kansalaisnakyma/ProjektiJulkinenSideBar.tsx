import React, { ComponentProps } from "react";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import HassuStack from "@components/layout/HassuStack";
import Section from "@components/layout/Section";
import { Kieli, SuunnittelustaVastaavaViranomainen } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import { kuntametadata } from "hassu-common/kuntametadata";
import { styled } from "@mui/material";
import { formatNimi } from "../../../util/userUtil";
import { muodostaOrganisaatioTeksti } from "src/util/kayttajaTransformationUtil";
import { KarttaKansalaiselle } from "../common/KarttaKansalaiselle";
import { SideCard, SideCardHeading, SideCardContent } from "./SideCard";

const ProjektiSideNavigation = styled((props) => {
  const { t, lang } = useTranslation("projekti-side-bar");
  const { data: projekti } = useProjektiJulkinen();
  if (!projekti) {
    return <></>;
  }

  const suunnitteluSopimus = projekti.suunnitteluSopimus;
  const viranomainen = projekti?.velho.suunnittelustaVastaavaViranomainen;

  const getTilaajaLogoImg = () => {
    if (SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO === viranomainen) {
      return { src: "/vayla_sivussa_fi_sv_rgb.png", alt: t(`common:vaylavirasto`) + " logo" };
    } else {
      return { src: "/ely-logo-vaaka.png", alt: t(`common:ely-keskus`) + " logo" };
    }
  };

  return (
    <Section noDivider {...props}>
      <SideCard>
        <SideCardHeading>{t("suunnitteluhankkeen_yhteystiedot")}</SideCardHeading>
        <SideCardContent>
          <HassuStack id="yhteystiedot">
            <img {...getTilaajaLogoImg()} />
            {projekti.projektiHenkilot?.map((yt) => {
              const nimi = formatNimi(yt);
              return (
                <div key={nimi} className="vayla-calling-card">
                  <p>{muodostaOrganisaatioTeksti(yt, t, lang)}</p>
                  {!!yt.projektiPaallikko && <p>{t("common:rooli.PROJEKTIPAALLIKKO")}</p> /* yhteystiedoilta puuttuu tittelitieto */}
                  <p>
                    <b>{nimi}</b>
                  </p>
                  <p>{yt.puhelinnumero}</p>
                  <p>{yt.email}</p>
                </div>
              );
            })}
          </HassuStack>
          {suunnitteluSopimus && (
            <HassuStack id="kuntatiedot">
              {suunnitteluSopimus.logo && (
                <img
                  src={suunnitteluSopimus.logo?.[lang == "fi" ? Kieli.SUOMI : Kieli.RUOTSI] || undefined}
                  alt={`${suunnitteluSopimus.kunta} logo`}
                />
              )}
              <div className="vayla-calling-card">
                <p>{kuntametadata.nameForKuntaId(suunnitteluSopimus.kunta, lang)}</p>
                <p>{t("common:rooli.PROJEKTIPAALLIKKO")}</p>
                <p>
                  <b>{formatNimi(suunnitteluSopimus)}</b>
                </p>
                <p>{suunnitteluSopimus.puhelinnumero}</p>
                <p>{suunnitteluSopimus.email}</p>
              </div>
            </HassuStack>
          )}
        </SideCardContent>
      </SideCard>
      <SideCard>
        {projekti.velho.geoJSON && (
          <>
            <SideCardHeading>{t("suunnitelma_kartalla")}</SideCardHeading>
            <KarttaKansalaiselle geoJSON={projekti.velho.geoJSON} />
          </>
        )}
      </SideCard>
    </Section>
  );
})<ComponentProps<typeof Section>>({});

export default ProjektiSideNavigation;
