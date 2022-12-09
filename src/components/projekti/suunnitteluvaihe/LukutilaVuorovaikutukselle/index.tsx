import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { useMemo } from "react";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";
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

  console.log(vuorovaikutusKierrosjulkaisu);

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
        <Section>
          <h4 className="vayla-label">Kutsussa esitettävät yhteyshenkilöt</h4>
          {vuorovaikutusKierrosjulkaisu.yhteystiedot?.map((yhteystieto, index) => {
            return <p key={index}>{yhteystietoKansalaiselleTekstiksi("fi", yhteystieto)}</p>;
          })}
        </Section>
      </Section>
    </>
  );
}
