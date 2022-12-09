import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { useMemo } from "react";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import VuorovaikutusPaivamaaraJaTiedotLukutila from "../komponentit/VuorovaikutusPaivamaaraJaTiedotLukutila";
import VuorovaikutusMahdollisuudet from "./VuorovaikutusMahdollisuudet";

type Props = {
  vuorovaikutusnro: number;
  projekti: ProjektiLisatiedolla;
};

export default function VuorovaikutusKierrosLukutila({ vuorovaikutusnro, projekti }: Props) {
  const vuorovaikutusKierrosjulkaisu = useMemo(
    () => projekti?.vuorovaikutusKierrosJulkaisut?.[vuorovaikutusnro],
    [projekti, vuorovaikutusnro]
  );
  const aloituskuulutusjulkaisu = useMemo(() => {
    // aloituskuulutusjulkaisusta katsotaan projektin sisällönkuvaus
    return projekti?.aloitusKuulutusJulkaisu;
  }, [projekti]);

  if (!(aloituskuulutusjulkaisu && vuorovaikutusKierrosjulkaisu)) {
    return <></>;
  }

  return (
    <>
      <Section className="mb-4">
        <SectionContent>
          <h3 className="vayla-title">Kutsu vuorovaikutukseen</h3>
        </SectionContent>
        <VuorovaikutusPaivamaaraJaTiedotLukutila
          aloituskuulutusjulkaisu={aloituskuulutusjulkaisu}
          vuorovaikutus={vuorovaikutusKierrosjulkaisu}
        />
        <VuorovaikutusMahdollisuudet
          projekti={projekti}
          vuorovaikutusKierrosJulkaisu={vuorovaikutusKierrosjulkaisu}
          setOpenVuorovaikutustilaisuus={() => null}
        />
      </Section>
    </>
  );
}
