import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { AsiakirjaTyyppi, VuorovaikutusKierrosTila, VuorovaikutusTilaisuusPaivitysInput, Yhteystieto } from "@services/api";
import React, { useCallback, useMemo, useState } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
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
import useCurrentUser from "../../../../hooks/useCurrentUser";
import KaynnistaAsianhallinnanSynkronointiNappi from "@components/projekti/common/KaynnistaAsianhallinnanSynkronointi";

type Props = {
  vuorovaikutusnro: number;
  projekti: ProjektiLisatiedolla;
};

export default function VuorovaikutusKierrosLukutila({ vuorovaikutusnro, projekti }: Props) {
  const { mutate: reloadProjekti } = useProjekti();
  const [muokkausAuki, setMuokkausAuki] = useState(false);
  const { showSuccessMessage } = useSnackbars();
  const { data: kayttaja } = useCurrentUser();

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

  const showAjansiirtopainikkeet = useMemo(
    () => isAjansiirtoSallittu() && vuorovaikutusnro === projekti.vuorovaikutusKierros?.vuorovaikutusNumero,
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
  if (projekti.nykyinenKayttaja.omaaMuokkausOikeuden) {
    setOpenVuorovaikutustilaisuus = () => setMuokkausAuki(true);
  }

  return (
    <>
      <Section className="mb-4" noDivider>
        <SectionContent>
          <h3 className="vayla-title">Kutsu vuorovaikutukseen</h3>
        </SectionContent>
        {kayttaja?.features?.asianhallintaIntegraatio && vuorovaikutusKierrosjulkaisu.tila == VuorovaikutusKierrosTila.JULKINEN && (
          <KaynnistaAsianhallinnanSynkronointiNappi
            oid={projekti.oid}
            asiakirjaTyyppi={AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU}
            asianhallintaSynkronointiTila={vuorovaikutusKierrosjulkaisu.asianhallintaSynkronointiTila}
            className={"md:col-span-2 mb-0"}
          />
        )}
        <VuorovaikutusPaivamaaraJaTiedotLukutila kielitiedot={projekti.kielitiedot} vuorovaikutus={vuorovaikutusKierrosjulkaisu} />
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
        />
      </Section>
    </>
  );
}
