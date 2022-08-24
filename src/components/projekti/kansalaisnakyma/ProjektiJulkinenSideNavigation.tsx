import React, { ReactElement } from "react";
import styles from "@styles/projekti/ProjektiJulkinenSideNavigation.module.css";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import HassuStack from "@components/layout/HassuStack";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { Viranomainen } from "@services/api";
import useTranslation from "next-translate/useTranslation";

export default function ProjektiSideNavigation(): ReactElement {
  const { t } = useTranslation("projekti");
  const { data: projekti } = useProjektiJulkinen();
  if (!projekti) {
    return <div />;
  }
  if (!projekti.aloitusKuulutusJulkaisut || !projekti.aloitusKuulutusJulkaisut[0]) {
    return <div />;
  }
  const kuulutus = projekti.aloitusKuulutusJulkaisut[0];
  const velho = kuulutus.velho;
  const suunnitteluSopimus = kuulutus.suunnitteluSopimus;

  let sijainti = "";
  if (velho.maakunnat) {
    sijainti = sijainti + velho.maakunnat.join(", ") + "; ";
  }
  if (velho.kunnat) {
    sijainti = sijainti + velho.kunnat.join(", ");
  }

  const getTilaajaLogoImg = () => {
    const viranomainen = velho?.suunnittelustaVastaavaViranomainen;
    if (
      Viranomainen.VAYLAVIRASTO === viranomainen ||
      velho.suunnittelustaVastaavaViranomainen === Viranomainen.VAYLAVIRASTO
    ) {
      return { src: "/vayla_sivussa_fi_sv_rgb.png", alt: t(`common:vaylavirasto`) + " logo" };
    } else {
      return { src: "/ely-logo-vaaka.png", alt: t(`common:ely-keskus`) + " logo" };
    }
  };

  return (
    <Section noDivider>
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
          <h4 className="vayla-title-small mb-0">Suunnitteluhankkeen yhteyshenkilöt</h4>
        </div>
        <SectionContent className={styles["side-nav-content"]}>
          <HassuStack>
            <img {...getTilaajaLogoImg()} />
            {kuulutus.yhteystiedot.map((yt, index) => (
              <div key={yt.etunimi + yt.sukunimi} className="vayla-calling-card">
                <p>{yt.organisaatio}</p>
                {index == 0 && <p>PROJEKTIPÄÄLLIKKÖ</p> /* yhteystiedoilta puuttuu tittelitieto */}
                <p>
                  <b>
                    {yt.etunimi} {yt.sukunimi}
                  </b>
                </p>
                <p>{yt.puhelinnumero}</p>
                <p>{yt.sahkoposti}</p>
              </div>
            ))}
          </HassuStack>
          {suunnitteluSopimus && (
            <HassuStack>
              {suunnitteluSopimus.logo && (
                <img src={suunnitteluSopimus.logo} alt={`${suunnitteluSopimus.kunta} logo`} />
              )}
              <div className="vayla-calling-card">
                <p>{suunnitteluSopimus.kunta}</p>
                <p>PROJEKTIPÄÄLLIKKÖ</p>
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
}
