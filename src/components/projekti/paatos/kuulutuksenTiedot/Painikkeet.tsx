import { HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu, KuulutusJulkaisuTila, MuokkausTila } from "@services/api";
import log from "loglevel";
import React, { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { KuulutuksenTiedotFormValues } from "./index";
import { paatosSpecificTilasiirtymaTyyppiMap } from "src/util/getPaatosSpecificData";
import { paatosSpecificRoutesMap, PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { convertFormDataToTallennaProjektiInput } from "./KuulutuksenJaIlmoituksenEsikatselu";
import useApi from "src/hooks/useApi";
import { lataaTiedosto } from "../../../../util/fileUtil";
import HyvaksyJaPalautaPainikkeet from "@components/projekti/HyvaksyJaPalautaPainikkeet";
import TallennaLuonnosJaVieHyvaksyttavaksiPainikkeet from "@components/projekti/TallennaLuonnosJaVieHyvaksyttavaksiPainikkeet";

interface Props {
  projekti: ProjektiLisatiedolla;
  julkaisu: HyvaksymisPaatosVaiheJulkaisu | null | undefined;
  paatosTyyppi: PaatosTyyppi;
  julkaisematonPaatos: HyvaksymisPaatosVaihe | null | undefined;
}

export default function Painikkeet({ projekti, julkaisu, paatosTyyppi, julkaisematonPaatos }: Props) {
  const { watch } = useFormContext<KuulutuksenTiedotFormValues>();

  const api = useApi();

  const preSubmitFunction = useCallback(
    async (formData: KuulutuksenTiedotFormValues) => {
      const { paatosVaiheAvain } = paatosSpecificRoutesMap[paatosTyyppi];
      const paatosVaihe = formData[paatosVaiheAvain];

      const pohjoisSaameIlmoitusPdf = paatosVaihe.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusIlmoitusPDFPath as unknown as
        | File
        | undefined
        | string;
      if (paatosVaihe?.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusIlmoitusPDFPath && pohjoisSaameIlmoitusPdf instanceof File) {
        paatosVaihe.hyvaksymisPaatosVaiheSaamePDFt.POHJOISSAAME.kuulutusIlmoitusPDFPath = await lataaTiedosto(api, pohjoisSaameIlmoitusPdf);
      }
      const pohjoisSaameKuulutusPdf = paatosVaihe.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusPDFPath as unknown as
        | File
        | undefined
        | string;

      if (paatosVaihe?.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusPDFPath && pohjoisSaameKuulutusPdf instanceof File) {
        paatosVaihe.hyvaksymisPaatosVaiheSaamePDFt.POHJOISSAAME.kuulutusPDFPath = await lataaTiedosto(api, pohjoisSaameKuulutusPdf);
      }

      const pohjoisSaameKirjeTiedotettavillePdf = paatosVaihe.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME
        ?.kirjeTiedotettavillePDFPath as unknown as File | undefined | string;

      if (
        paatosVaihe?.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kirjeTiedotettavillePDFPath &&
        pohjoisSaameKirjeTiedotettavillePdf instanceof File
      ) {
        paatosVaihe.hyvaksymisPaatosVaiheSaamePDFt.POHJOISSAAME.kirjeTiedotettavillePDFPath = await lataaTiedosto(
          api,
          pohjoisSaameKirjeTiedotettavillePdf
        );
      }
      const convertedFormData = convertFormDataToTallennaProjektiInput(formData, paatosTyyppi);
      const convertedPaatosVaihe = convertedFormData[paatosVaiheAvain];
      if (convertedPaatosVaihe) {
        convertedPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt = paatosVaihe.hyvaksymisPaatosVaiheSaamePDFt;
      } else {
        log.error("Puuttuu hyvaksymispaatosvaiheen tallennuksessa: " + paatosVaiheAvain);
      }
      return convertedFormData;
    },
    [api, paatosTyyppi]
  );

  const voiMuokata = !julkaisematonPaatos?.muokkausTila || julkaisematonPaatos?.muokkausTila === MuokkausTila.MUOKKAUS;

  const voiHyvaksya =
    julkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA && projekti?.nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo;

  const kuntavastaanottajat = watch("paatos.ilmoituksenVastaanottajat.kunnat");
  return (
    <>
      {!!voiHyvaksya && (
        <HyvaksyJaPalautaPainikkeet
          julkaisu={julkaisu}
          projekti={projekti}
          tilasiirtymaTyyppi={paatosSpecificTilasiirtymaTyyppiMap[paatosTyyppi]}
        />
      )}
      {!!voiMuokata && (
        <TallennaLuonnosJaVieHyvaksyttavaksiPainikkeet
          kuntavastaanottajat={kuntavastaanottajat}
          projekti={projekti}
          preSubmitFunction={preSubmitFunction}
          tilasiirtymaTyyppi={paatosSpecificTilasiirtymaTyyppiMap[paatosTyyppi]}
        />
      )}
    </>
  );
}
