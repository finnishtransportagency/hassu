import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { VuorovaikutusTilaisuusPaivitysInput, Yhteystieto } from "@services/api";
import React, { useCallback, useMemo, useState } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import useProjektiHenkilot from "src/hooks/useProjektiHenkilot";
import useSnackbars from "src/hooks/useSnackbars";
import IlmoituksenVastaanottajatLukutila from "../komponentit/IlmoituksenVastaanottajatLukutila";
import VuorovaikutusPaivamaaraJaTiedotLukutila from "../komponentit/VuorovaikutusPaivamaaraJaTiedotLukutila";
import VuorovaikutustilaisuusDialog, { VuorovaikutustilaisuusFormValues } from "../komponentit/VuorovaikutustilaisuusDialog";
import LukutilaLinkkiJaKutsut from "./LukutilaLinkkiJaKutsut";
import VuorovaikutusMahdollisuudet from "./VuorovaikutusMahdollisuudet";
import log from "loglevel";
import useApi from "src/hooks/useApi";
import { VuorovaikuttamisenYhteysHenkilot } from "./VuorovaikuttamisenYhteysHenkilot";
import { isAjansiirtoSallittu } from "src/util/isAjansiirtoSallittu";
import { LiittyvatSuunnitelmat } from "@components/projekti/LiittyvatSuunnitelmat";

type Props = {
  vuorovaikutusnro: number;
  projekti: ProjektiLisatiedolla;
  showMuokkaaTilaisuuksia?: boolean;
};

export default function VuorovaikutusKierrosLukutila({ vuorovaikutusnro, projekti, showMuokkaaTilaisuuksia }: Readonly<Props>) {
  const { mutate: reloadProjekti } = useProjekti();
  const [muokkausAuki, setMuokkausAuki] = useState(false);
  const { showSuccessMessage } = useSnackbars();

  const projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[] = useProjektiHenkilot(projekti);

  const vuorovaikutusKierrosjulkaisu = useMemo(
    () => projekti?.vuorovaikutusKierrosJulkaisut?.find((julkaisu) => julkaisu.id === vuorovaikutusnro),
    [projekti, vuorovaikutusnro]
  );
  const aloituskuulutusjulkaisu = useMemo(() => {
    // aloituskuulutusjulkaisusta katsotaan projektin sisällönkuvaus
    return projekti?.aloitusKuulutusJulkaisu;
  }, [projekti]);

  const api = useApi();

  const ajansiirtoSallittu = isAjansiirtoSallittu();

  const showAjansiirtopainikkeet = useMemo(
    () => ajansiirtoSallittu && vuorovaikutusnro === projekti.vuorovaikutusKierros?.vuorovaikutusNumero,
    [projekti.vuorovaikutusKierros?.vuorovaikutusNumero, vuorovaikutusnro]
  );

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
            ({ esitettavatYhteystiedot, kaytettavaPalvelu, lisatiedot, linkki, nimi, peruttu }) => {
              const paivitysInput: VuorovaikutusTilaisuusPaivitysInput = {
                esitettavatYhteystiedot,
                kaytettavaPalvelu,
                lisatiedot,
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
      showSuccessMessage,
      vuorovaikutusKierrosjulkaisu,
      vuorovaikutusnro,
    ]
  );

  if (!(aloituskuulutusjulkaisu && vuorovaikutusKierrosjulkaisu)) {
    return <></>;
  }

  let setOpenVuorovaikutustilaisuus;
  if (projekti.nykyinenKayttaja.omaaMuokkausOikeuden && showMuokkaaTilaisuuksia) {
    setOpenVuorovaikutustilaisuus = () => setMuokkausAuki(true);
  }

  return (
    <Section className="mb-4" noDivider>
      <SectionContent>
        <h3 className="vayla-title">Kutsu vuorovaikutukseen</h3>
      </SectionContent>
      <VuorovaikutusPaivamaaraJaTiedotLukutila kielitiedot={projekti.kielitiedot} vuorovaikutus={vuorovaikutusKierrosjulkaisu} />
      <LiittyvatSuunnitelmat jakotieto={vuorovaikutusKierrosjulkaisu.suunnitelmaJaettu} />
      <VuorovaikutusMahdollisuudet
        showAjansiirtopainikkeet={showAjansiirtopainikkeet}
        projekti={projekti}
        vuorovaikutusKierrosJulkaisu={vuorovaikutusKierrosjulkaisu}
        setOpenVuorovaikutustilaisuus={setOpenVuorovaikutustilaisuus}
      />
      <VuorovaikuttamisenYhteysHenkilot julkaisu={vuorovaikutusKierrosjulkaisu} />
      <IlmoituksenVastaanottajatLukutila vuorovaikutus={vuorovaikutusKierrosjulkaisu} />
      <LukutilaLinkkiJaKutsut vuorovaikutus={vuorovaikutusKierrosjulkaisu} projekti={projekti} />
      <VuorovaikutustilaisuusDialog
        open={muokkausAuki}
        windowHandler={(isOpen: boolean) => setMuokkausAuki(isOpen)}
        tilaisuudet={projekti.vuorovaikutusKierros?.vuorovaikutusTilaisuudet || []}
        projektiHenkilot={projektiHenkilot}
        onSubmit={paivitaVuorovaikutustilaisuuksia}
        mostlyDisabled={true}
        projekti={projekti}
      />
    </Section>
  );
}
