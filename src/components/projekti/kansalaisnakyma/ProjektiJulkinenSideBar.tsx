import React, { ComponentProps, useEffect, useState } from "react";
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
import axios from "axios";
import { DynaaminenVideoUpotus } from "./videoupotus/DynaaminenVideoUpotus";
import { useRouter } from "next/router";

const ProjektiSideNavigation = styled((props) => {
  const { t, lang } = useTranslation("projekti-side-bar");
  const { data: projekti } = useProjektiJulkinen();

  const [geoJSON, setGeoJSON] = useState<string | null>(projekti?.velho.geoJSON ?? null);

  useEffect(() => {
    const updateGeoJson = async (oid: string) => {
      try {
        const response = await axios.get(`/tiedostot/suunnitelma/${oid}/sijaintitieto/sijaintitieto.geojson`, {
          responseType: "blob",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache", Expires: "0" },
        });

        if (!(response.data instanceof Blob)) {
          return;
        }
        const text = await response.data.text();
        setGeoJSON(text);
      } catch (e) {
        setGeoJSON(null);
        // Ei tehdä mitään. Karttarajaustiedostoa ei toistaiseksi ole
      }
    };
    if (projekti?.oid && !projekti?.velho.geoJSON) {
      updateGeoJson(projekti.oid);
    }
  }, [projekti]);

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

  const router = useRouter();
  const pathName = router.pathname;
  const isVideoPage = pathName.includes("aloituskuulutus") || pathName.includes("suunnittelu") || pathName.includes("nahtavillaolo");

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
        {geoJSON && (
          <>
            <SideCardHeading>{t("suunnitelma_kartalla")}</SideCardHeading>
            <KarttaKansalaiselle geoJSON={geoJSON} />
          </>
        )}
      </SideCard>

      <SideCard>
        {isVideoPage && (
          <>
            <SideCardHeading>{t("vls-esittely")}</SideCardHeading>
            <SideCardContent>{t("tutustu-videoiden-avulla")}</SideCardContent>
            <DynaaminenVideoUpotus projekti={projekti} />
          </>
        )}
      </SideCard>
    </Section>
  );
})<ComponentProps<typeof Section>>({});

export default ProjektiSideNavigation;
