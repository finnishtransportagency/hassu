import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { Link } from "@mui/material";
import { Kieli, Kielitiedot, VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu } from "@services/api";

interface Props {
  vuorovaikutus:
    | Pick<
        VuorovaikutusKierros | VuorovaikutusKierrosJulkaisu,
        "suunnitelmaluonnokset" | "esittelyaineistot" | "suunnittelumateriaali" | "videot"
      >
    | undefined;
  kielitiedot: Kielitiedot | undefined | null;
}

export default function LukutilaLuonnoksetJaAineistot({ vuorovaikutus, kielitiedot }: Props) {
  const ensisijainenKieli = kielitiedot?.ensisijainenKieli || Kieli.SUOMI;
  const toissijainenKieli = kielitiedot?.toissijainenKieli;

  return (
    <Section>
      {!!vuorovaikutus?.videot?.length && (
        <SectionContent>
          <div>Videoesittely</div>
          {vuorovaikutus.videot.map((video) => (
            <>
              <div key={video?.[ensisijainenKieli]?.url} style={{ marginTop: "0.4rem" }}>
                <Link underline="none" href={video?.[ensisijainenKieli]?.url}>
                  {video?.[ensisijainenKieli]?.url}
                </Link>
              </div>
              {toissijainenKieli && (
                <div key={video?.[toissijainenKieli]?.url} style={{ marginTop: "0.4rem" }}>
                  <Link underline="none" href={video?.[toissijainenKieli]?.url}>
                    {video?.[toissijainenKieli]?.url}
                  </Link>
                </div>
              )}
            </>
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
      {vuorovaikutus?.suunnittelumateriaali?.[ensisijainenKieli]?.nimi && (
        <SectionContent>
          <div>Muu esittelymateriaali</div>
          <>
            <div style={{ marginTop: "0.4rem" }}>{vuorovaikutus.suunnittelumateriaali?.[ensisijainenKieli]?.nimi}</div>
            <div style={{ marginTop: "0.4rem" }}>
              <Link underline="none" href={vuorovaikutus.suunnittelumateriaali?.[ensisijainenKieli]?.url}>
                {vuorovaikutus.suunnittelumateriaali?.[ensisijainenKieli]?.url}
              </Link>
            </div>
          </>

          {toissijainenKieli && (
            <>
              <div style={{ marginTop: "0.4rem" }}>{vuorovaikutus.suunnittelumateriaali?.[toissijainenKieli]?.nimi}</div>
              <div style={{ marginTop: "0.4rem" }}>
                <Link underline="none" href={vuorovaikutus.suunnittelumateriaali?.[toissijainenKieli]?.url}>
                  {vuorovaikutus.suunnittelumateriaali?.[toissijainenKieli]?.url}
                </Link>
              </div>
            </>
          )}
        </SectionContent>
      )}
    </Section>
  );
}
