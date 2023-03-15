import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { VuorovaikutusTilaisuusPaivitysInput, Yhteystieto } from "@services/api";
import { useMemo, useState, useCallback } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useProjektiHenkilot from "src/hooks/useProjektiHenkilot";
import useSnackbars from "src/hooks/useSnackbars";
import { yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";
import IlmoituksenVastaanottajatLukutila from "../komponentit/IlmoituksenVastaanottajatLukutila";
import VuorovaikutusPaivamaaraJaTiedotLukutila from "../komponentit/VuorovaikutusPaivamaaraJaTiedotLukutila";
import VuorovaikutustilaisuusDialog, { VuorovaikutustilaisuusFormValues } from "../komponentit/VuorovaikutustilaisuusDialog";
import LukutilaLinkkiJaKutsut from "./LukutilaLinkkiJaKutsut";
import VuorovaikutusMahdollisuudet from "./VuorovaikutusMahdollisuudet";
import log from "loglevel";
import useApi from "src/hooks/useApi";
import useTranslation from "next-translate/useTranslation";

type Props = {
  vuorovaikutusnro: number;
  projekti: ProjektiLisatiedolla;
};

export default function VuorovaikutusKierrosLukutila({ vuorovaikutusnro, projekti }: Props) {
  const { mutate: reloadProjekti } = useProjekti();
  const [muokkausAuki, setMuokkausAuki] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[] = useProjektiHenkilot(projekti);

  const vuorovaikutusKierrosjulkaisu = useMemo(
    () => projekti?.vuorovaikutusKierrosJulkaisut?.[vuorovaikutusnro],
    [projekti, vuorovaikutusnro]
  );
  const aloituskuulutusjulkaisu = useMemo(() => {
    // aloituskuulutusjulkaisusta katsotaan projektin sisällönkuvaus
    return projekti?.aloitusKuulutusJulkaisu;
  }, [projekti]);

  const api = useApi();

  const paivitaVuorovaikutustilaisuuksia = useCallback(
    async (formData: VuorovaikutustilaisuusFormValues) => {
      let mounted = true;
      if (!(aloituskuulutusjulkaisu && vuorovaikutusKierrosjulkaisu)) {
        return;
      }
      try {
        await api.paivitaVuorovaikutusta({
          oid: projekti.oid,
          versio: projekti.versio,
          vuorovaikutusNumero: vuorovaikutusnro,
          vuorovaikutusTilaisuudet: formData.vuorovaikutusTilaisuudet.map(
            ({ esitettavatYhteystiedot, kaytettavaPalvelu, Saapumisohjeet, linkki, nimi, peruttu }) => {
              const paivitysInput: VuorovaikutusTilaisuusPaivitysInput = {
                esitettavatYhteystiedot,
                kaytettavaPalvelu,
                Saapumisohjeet,
                linkki,
                nimi,
                peruttu,
              };
              return paivitysInput;
            }
          ),
        });
        await reloadProjekti();
        showSuccessMessage(`Vuorovaikutustilaisuuksien päivittäminen onnistui`);
      } catch (error) {
        log.error(error);
        showErrorMessage("Toiminnossa tapahtui virhe");
      }
      if (mounted) {
        setMuokkausAuki(false);
      }
      return () => (mounted = false);
    },
    [
      aloituskuulutusjulkaisu,
      api,
      projekti.oid,
      projekti.versio,
      reloadProjekti,
      showErrorMessage,
      showSuccessMessage,
      vuorovaikutusKierrosjulkaisu,
      vuorovaikutusnro,
    ]
  );

  const { t } = useTranslation();

  if (!(aloituskuulutusjulkaisu && vuorovaikutusKierrosjulkaisu)) {
    return <></>;
  }

  let setOpenVuorovaikutustilaisuus;
  if (projekti.nykyinenKayttaja.omaaMuokkausOikeuden) {
    setOpenVuorovaikutustilaisuus = () => setMuokkausAuki(true);
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
          setOpenVuorovaikutustilaisuus={setOpenVuorovaikutustilaisuus}
        />
        <Section>
          <h4 className="vayla-label">Kutsussa esitettävät yhteyshenkilöt</h4>
          {vuorovaikutusKierrosjulkaisu.yhteystiedot?.map((yhteystieto, index) => {
            return <p key={index}>{yhteystietoKansalaiselleTekstiksi("fi", yhteystieto, t)}</p>;
          })}
        </Section>
        <IlmoituksenVastaanottajatLukutila vuorovaikutus={vuorovaikutusKierrosjulkaisu} />
        <LukutilaLinkkiJaKutsut vuorovaikutus={vuorovaikutusKierrosjulkaisu} projekti={projekti} />
        <VuorovaikutustilaisuusDialog
          open={muokkausAuki}
          windowHandler={(isOpen: boolean) => setMuokkausAuki(isOpen)}
          tilaisuudet={projekti.vuorovaikutusKierros?.vuorovaikutusTilaisuudet || []}
          projektiHenkilot={projektiHenkilot}
          onSubmit={paivitaVuorovaikutustilaisuuksia}
          mostlyDisabled={true}
        />
      </Section>
    </>
  );
}
