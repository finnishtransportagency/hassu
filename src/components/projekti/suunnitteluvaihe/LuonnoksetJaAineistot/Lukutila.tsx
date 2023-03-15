import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { Link } from "@mui/material";
import { Kielitiedot, VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu } from "@services/api";
import { getKaannettavatKielet } from "common/kaannettavatKielet";

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
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  return (
    <Section>
      {!!vuorovaikutus?.videot?.length && (
        <SectionContent>
          <div>Videoesittely</div>
          {vuorovaikutus.videot.map((video) => (
            <>
              {ensisijainenKaannettavaKieli && (
                <div key={video?.[ensisijainenKaannettavaKieli]?.url} style={{ marginTop: "0.4rem" }}>
                  <Link underline="none" href={video?.[ensisijainenKaannettavaKieli]?.url}>
                    {video?.[ensisijainenKaannettavaKieli]?.url}
                  </Link>
                </div>
              )}

              {toissijainenKaannettavaKieli && (
                <div key={video?.[toissijainenKaannettavaKieli]?.url} style={{ marginTop: "0.4rem" }}>
                  <Link underline="none" href={video?.[toissijainenKaannettavaKieli]?.url}>
                    {video?.[toissijainenKaannettavaKieli]?.url}
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
      {ensisijainenKaannettavaKieli && vuorovaikutus?.suunnittelumateriaali?.[ensisijainenKaannettavaKieli]?.nimi && (
        <SectionContent>
          <div>Muu esittelymateriaali</div>
          <>
            <div style={{ marginTop: "0.4rem" }}>{vuorovaikutus.suunnittelumateriaali?.[ensisijainenKaannettavaKieli]?.nimi}</div>
            <div style={{ marginTop: "0.4rem" }}>
              <Link underline="none" href={vuorovaikutus.suunnittelumateriaali?.[ensisijainenKaannettavaKieli]?.url}>
                {vuorovaikutus.suunnittelumateriaali?.[ensisijainenKaannettavaKieli]?.url}
              </Link>
            </div>
          </>

          {toissijainenKaannettavaKieli && (
            <>
              <div style={{ marginTop: "0.4rem" }}>{vuorovaikutus.suunnittelumateriaali?.[toissijainenKaannettavaKieli]?.nimi}</div>
              <div style={{ marginTop: "0.4rem" }}>
                <Link underline="none" href={vuorovaikutus.suunnittelumateriaali?.[toissijainenKaannettavaKieli]?.url}>
                  {vuorovaikutus.suunnittelumateriaali?.[toissijainenKaannettavaKieli]?.url}
                </Link>
              </div>
            </>
          )}
        </SectionContent>
      )}
    </Section>
  );
}
