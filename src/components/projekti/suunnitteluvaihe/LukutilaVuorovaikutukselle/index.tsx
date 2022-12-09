import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { Yhteystieto } from "@services/api";
import { useMemo, useState } from "react";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import useProjektiHenkilot from "src/hooks/useProjektiHenkilot";
import { yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";
import IlmoituksenVastaanottajatLukutila from "../komponentit/IlmoituksenVastaanottajatLukutila";
import VuorovaikutusPaivamaaraJaTiedotLukutila from "../komponentit/VuorovaikutusPaivamaaraJaTiedotLukutila";
import VuorovaikutustilaisuusDialog, { VuorovaikutustilaisuusFormValues } from "../komponentit/VuorovaikutustilaisuusDialog";
import LukutilaLinkkiJaKutsut from "./LukutilaLinkkiJaKutsut";
import VuorovaikutusMahdollisuudet from "./VuorovaikutusMahdollisuudet";

type Props = {
  vuorovaikutusnro: number;
  projekti: ProjektiLisatiedolla;
};

export default function VuorovaikutusKierrosLukutila({ vuorovaikutusnro, projekti }: Props) {
  const [muokkausAuki, setMuokkausAuki] = useState(false);

  const projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[] = useProjektiHenkilot(projekti);

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
      <Section className="mb-4" noDivider>
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
          setOpenVuorovaikutustilaisuus={() => setMuokkausAuki(true)}
        />
        <Section>
          <h4 className="vayla-label">Kutsussa esitettävät yhteyshenkilöt</h4>
          {vuorovaikutusKierrosjulkaisu.yhteystiedot?.map((yhteystieto, index) => {
            return <p key={index}>{yhteystietoKansalaiselleTekstiksi("fi", yhteystieto)}</p>;
          })}
        </Section>
        <IlmoituksenVastaanottajatLukutila vuorovaikutus={vuorovaikutusKierrosjulkaisu} />
        <LukutilaLinkkiJaKutsut vuorovaikutus={vuorovaikutusKierrosjulkaisu} projekti={projekti} />
        <VuorovaikutustilaisuusDialog
          open={muokkausAuki}
          windowHandler={(isOpen: boolean) => setMuokkausAuki(isOpen)}
          tilaisuudet={projekti.vuorovaikutusKierros?.vuorovaikutusTilaisuudet || []}
          projektiHenkilot={projektiHenkilot}
          onSubmit={(formData: VuorovaikutustilaisuusFormValues) => console.log(formData)}
          mostlyDisabled={true}
        />
      </Section>
    </>
  );
}
