import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { Link } from "@mui/material";
import { Vuorovaikutus } from "@services/api";

interface Props {
  vuorovaikutus: Vuorovaikutus | undefined;
}

export default function LukutilaLuonnoksetJaAineistot({ vuorovaikutus }: Props) {
  return (
    <Section>
      {!!vuorovaikutus?.videot?.length && (
        <SectionContent>
          <div>Videoesittely</div>
          {vuorovaikutus.videot.map((video) => (
            <div key={video.url} style={{ marginTop: "0.4rem" }}>
              <Link underline="none" href={video.url}>
                {video.url}
              </Link>
            </div>
          ))}
        </SectionContent>
      )}
      {!vuorovaikutus?.suunnitelmaluonnokset?.length && !vuorovaikutus?.esittelyaineistot?.length && (
        <SectionContent>
          <p>Lisää suunnitelmalle luonnokset ja esittelyaineistot Muokkaa-painikkeesta.</p>
        </SectionContent>
      )}
      {!!vuorovaikutus?.esittelyaineistot?.length && (
        <SectionContent>
          <div>Esittelyaineistot</div>
          {vuorovaikutus.esittelyaineistot.map((aineisto) => (
            <div key={aineisto.dokumenttiOid} style={{ marginTop: "0.4rem" }}>
              <Link underline="none" href={aineisto.tiedosto || "#"}>
                {aineisto.nimi}
              </Link>
            </div>
          ))}
        </SectionContent>
      )}
      {!!vuorovaikutus?.suunnitelmaluonnokset?.length && (
        <SectionContent>
          <div>Suunnitelmaluonnokset</div>
          {vuorovaikutus.suunnitelmaluonnokset.map((aineisto) => (
            <div key={aineisto.dokumenttiOid} style={{ marginTop: "0.4rem" }}>
              <Link underline="none" href={aineisto.tiedosto || "#"}>
                {aineisto.nimi}
              </Link>
            </div>
          ))}
        </SectionContent>
      )}
      {vuorovaikutus?.suunnittelumateriaali?.nimi && (
        <SectionContent>
          <div>Muu esittelymateriaali</div>
          <div style={{ marginTop: "0.4rem" }}>{vuorovaikutus.suunnittelumateriaali.nimi}</div>
          <div style={{ marginTop: "0.4rem" }}>
            <Link underline="none" href={vuorovaikutus.suunnittelumateriaali.url}>
              {vuorovaikutus.suunnittelumateriaali.url}
            </Link>
          </div>
        </SectionContent>
      )}
    </Section>
  );
}
