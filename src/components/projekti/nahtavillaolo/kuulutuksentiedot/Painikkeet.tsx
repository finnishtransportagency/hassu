import { KuulutusJulkaisuTila, MuokkausTila, TilasiirtymaTyyppi } from "@services/api";
import React, { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { KuulutuksenTiedotFormValues } from "./KuulutuksenTiedot";
import useApi from "src/hooks/useApi";
import { lataaTiedosto } from "../../../../util/fileUtil";
import HyvaksyJaPalautaPainikkeet from "../../HyvaksyJaPalautaPainikkeet";
import TallennaLunnosJaVieHyvaksyttavaksiPainikkeet from "@components/projekti/TallennaLunnosJaVieHyvaksyttavaksiPainikkeet";

interface Props {
  projekti: ProjektiLisatiedolla;
}

export default function Painikkeet({ projekti }: Props) {
  const { mutate: reloadProjekti } = useProjekti();

  const { watch } = useFormContext<KuulutuksenTiedotFormValues>();

  const api = useApi();

  const talletaTiedosto = useCallback(async (tiedosto: File) => lataaTiedosto(api, tiedosto), [api]);

  const saveNahtavillaolo = useCallback(
    async (formData: KuulutuksenTiedotFormValues) => {
      const pohjoisSaameIlmoitusPdf = formData.nahtavillaoloVaihe.nahtavillaoloSaamePDFt?.POHJOISSAAME
        ?.kuulutusIlmoitusPDFPath as unknown as File | undefined | string;
      if (
        formData.nahtavillaoloVaihe.nahtavillaoloSaamePDFt?.POHJOISSAAME?.kuulutusIlmoitusPDFPath &&
        pohjoisSaameIlmoitusPdf instanceof File
      ) {
        formData.nahtavillaoloVaihe.nahtavillaoloSaamePDFt.POHJOISSAAME.kuulutusIlmoitusPDFPath = await talletaTiedosto(
          pohjoisSaameIlmoitusPdf
        );
      }
      const pohjoisSaameKuulutusPdf = formData.nahtavillaoloVaihe.nahtavillaoloSaamePDFt?.POHJOISSAAME?.kuulutusPDFPath as unknown as
        | File
        | undefined
        | string;
      if (formData.nahtavillaoloVaihe.nahtavillaoloSaamePDFt?.POHJOISSAAME?.kuulutusPDFPath && pohjoisSaameKuulutusPdf instanceof File) {
        formData.nahtavillaoloVaihe.nahtavillaoloSaamePDFt.POHJOISSAAME.kuulutusPDFPath = await talletaTiedosto(pohjoisSaameKuulutusPdf);
      }
      await api.tallennaProjekti(formData);
      if (reloadProjekti) {
        await reloadProjekti();
      }
    },
    [api, reloadProjekti, talletaTiedosto]
  );

  const voiMuokata = !projekti?.nahtavillaoloVaihe?.muokkausTila || projekti?.nahtavillaoloVaihe?.muokkausTila === MuokkausTila.MUOKKAUS;

  const voiHyvaksya =
    projekti.nahtavillaoloVaiheJulkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA &&
    projekti?.nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo;

  const kuntavastaanottajat = watch("nahtavillaoloVaihe.ilmoituksenVastaanottajat.kunnat");

  return (
    <>
      {!!voiHyvaksya && projekti.nahtavillaoloVaiheJulkaisu && (
        <HyvaksyJaPalautaPainikkeet
          julkaisu={projekti.nahtavillaoloVaiheJulkaisu}
          tilasiirtymaTyyppi={TilasiirtymaTyyppi.NAHTAVILLAOLO}
          projekti={projekti}
        />
      )}
      {!!voiMuokata && (
        <TallennaLunnosJaVieHyvaksyttavaksiPainikkeet
          kuntavastaanottajat={kuntavastaanottajat}
          projekti={projekti}
          saveVaihe={saveNahtavillaolo}
          tilasiirtymaTyyppi={TilasiirtymaTyyppi.NAHTAVILLAOLO}
        />
      )}
    </>
  );
}
