import React, { ComponentProps } from "react";
import styles from "@styles/projekti/ProjektiJulkinenSideNavigation.module.css";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import HassuStack from "@components/layout/HassuStack";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { Viranomainen } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import { kuntametadata } from "../../../../common/kuntametadata";
import { styled } from "@mui/material";

const ProjektiSideNavigation = styled((props) => {
  const { t, lang } = useTranslation("projekti-side-bar");
  const { data: projekti } = useProjektiJulkinen();
  if (!projekti) {
    return <></>;
  }

  const suunnitteluSopimus = projekti.suunnitteluSopimus;
  const viranomainen = projekti?.velho.suunnittelustaVastaavaViranomainen;

  const getTilaajaLogoImg = () => {
    if (Viranomainen.VAYLAVIRASTO === viranomainen) {
      return { src: "/vayla_sivussa_fi_sv_rgb.png", alt: t(`common:vaylavirasto`) + " logo" };
    } else {
      return { src: "/ely-logo-vaaka.png", alt: t(`common:ely-keskus`) + " logo" };
    }
  };

  return (
    <Section noDivider {...props}>
      <div role="navigation" className={styles["side-nav"]}>
        <div
          className="flex justify-center"
          style={{
            height: "60px",
            backgroundColor: "#0064AF",
            color: "white",
            alignItems: "center",
            fontWeight: "700",
          }}
        >
          <h4 className="vayla-title-small mb-0">{t("suunnitteluhankkeen_yhteystiedot")}</h4>
        </div>
        <SectionContent className={styles["side-nav-content"]}>
          <HassuStack>
            <img {...getTilaajaLogoImg()} />
            {projekti.projektiHenkilot?.map((yt) => {
              const nimi = yt.sukunimi + " " + yt.etunimi;
              return (
                <div key={nimi} className="vayla-calling-card">
                  <p>{yt.organisaatio}</p>
                  {
                    !!yt.projektiPaallikko && (
                      <p className="uppercase">{t("common:rooli.PROJEKTIPAALLIKKO")}</p>
                    ) /* yhteystiedoilta puuttuu tittelitieto */
                  }
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
            <HassuStack>
              {suunnitteluSopimus.logo && <img src={suunnitteluSopimus.logo} alt={`${suunnitteluSopimus.kunta} logo`} />}
              <div className="vayla-calling-card">
                <p>{kuntametadata.nameForKuntaId(suunnitteluSopimus.kunta, lang)}</p>
                <p className="uppercase">{t("common:rooli.PROJEKTIPAALLIKKO")}</p>
                <p>
                  <b>
                    {suunnitteluSopimus.etunimi} {suunnitteluSopimus.sukunimi}
                  </b>
                </p>
                <p>{suunnitteluSopimus.puhelinnumero}</p>
                <p>{suunnitteluSopimus.email}</p>
              </div>
            </HassuStack>
          )}
        </SectionContent>
      </div>
    </Section>
  );
})<ComponentProps<typeof Section>>({});

export default ProjektiSideNavigation;
