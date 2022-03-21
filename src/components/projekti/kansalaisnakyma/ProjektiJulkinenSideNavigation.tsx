import React, { ReactElement } from "react";
import styles from "@styles/projekti/ProjektiJulkinenSideNavigation.module.css";
import { useRouter } from "next/router";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import HassuStack from "@components/layout/HassuStack";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";

export default function ProjektiSideNavigation(): ReactElement {
  const router = useRouter();
  const oidParam = router.query.oid;
  const { data: projekti } = useProjektiJulkinen(oidParam as string);
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

  const getTilaajaLogoUrl = () => {
    return kuulutus?.velho?.tilaajaOrganisaatio?.includes("ELY") ? "/ely-logo-vaaka.png" : "/vayla_sivussa_fi_sv_rgb.png";
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
            <img src={getTilaajaLogoUrl()} alt={`${kuulutus.velho.tilaajaOrganisaatio} logo`} />
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
