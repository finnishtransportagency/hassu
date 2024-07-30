import { yupResolver } from "@hookform/resolvers/yup";
import { HyvaksymisPaatosVaiheInput, KirjaamoOsoite, MuokkausTila, TallennaProjektiInput } from "@services/api";
import React, { ReactElement, useEffect, useMemo } from "react";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import Painikkeet from "./Painikkeet";
import KuulutuksenJaIlmoituksenEsikatselu from "./KuulutuksenJaIlmoituksenEsikatselu";
import KuulutuksessaEsitettavatYhteystiedot from "./KuulutuksessaEsitettavatYhteystiedot";
import KuulutusJaJulkaisuPaiva from "./KuulutusJaJulkaisuPaiva";
import MuutoksenHaku from "./MuutoksenHaku";
import IlmoituksenVastaanottajatKomponentti from "./IlmoituksenVastaanottajat";
import Lukunakyma from "./Lukunakyma";
import defaultVastaanottajat from "src/util/defaultVastaanottajat";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import PdfPreviewForm from "@components/projekti/PdfPreviewForm";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import PaatoksenPaiva from "@components/projekti/paatos/kuulutuksenTiedot/PaatoksenPaiva";
import { paatosIsJatkopaatos } from "src/util/getPaatosSpecificData";
import Voimassaolovuosi from "./Voimassaolovuosi";
import { getDefaultValuesForUudelleenKuulutus } from "src/util/getDefaultValuesForLokalisoituText";
import SelitteetUudelleenkuulutukselle from "@components/projekti/SelitteetUudelleenkuulutukselle";
import defaultEsitettavatYhteystiedot from "src/util/defaultEsitettavatYhteystiedot";
import { isPohjoissaameSuunnitelma } from "../../../../util/isPohjoissaamiSuunnitelma";
import PohjoissaamenkielinenKuulutusJaIlmoitusInput from "@components/projekti/common/PohjoissaamenkielinenKuulutusJaIlmoitusInput";
import { createPaatosKuulutusSchema } from "src/schemas/paatosKuulutus";
import { SaameKuulutusTiedostotMetodi } from "@components/projekti/common/SaameTiedostoValitsin";
import useIsAllowedOnCurrentProjektiRoute from "src/hooks/useIsOnAllowedProjektiRoute";
import useValidationMode from "src/hooks/useValidationMode";
import { getPaatosSpecificData, paatosSpecificRoutesMap, PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";

type paatosInputValues = Omit<HyvaksymisPaatosVaiheInput, "hallintoOikeus"> & {
  hallintoOikeus: HyvaksymisPaatosVaiheInput["hallintoOikeus"] | "";
};

type PickedTallennaProjektiInput = Pick<
  TallennaProjektiInput,
  "oid" | "versio" | "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe"
> & {
  paatos: paatosInputValues;
};

export type KuulutuksenTiedotFormValues = Required<{
  [K in keyof PickedTallennaProjektiInput]: NonNullable<PickedTallennaProjektiInput[K]>;
}>;

interface Props {
  paatosTyyppi: PaatosTyyppi;
  projekti: ProjektiLisatiedolla;
}

export default function KuulutuksenTiedot(props: Props): ReactElement {
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();
  return <>{props.projekti && kirjaamoOsoitteet && <KuulutuksenTiedotForm kirjaamoOsoitteet={kirjaamoOsoitteet} {...props} />}</>;
}

type KuulutuksenTiedotFormProps = {
  projekti: ProjektiLisatiedolla;
  kirjaamoOsoitteet: KirjaamoOsoite[];
} & Props;

function KuulutuksenTiedotForm({ kirjaamoOsoitteet, paatosTyyppi, projekti }: KuulutuksenTiedotFormProps) {
  const pdfFormRef = React.useRef<React.ElementRef<typeof PdfPreviewForm>>(null);

  const { julkaisematonPaatos, kasittelyntilaData, julkaisu } = useMemo(
    () => getPaatosSpecificData(projekti, paatosTyyppi),
    [paatosTyyppi, projekti]
  );

  const defaultValues: KuulutuksenTiedotFormValues = useMemo(() => {
    const formValues: KuulutuksenTiedotFormValues = {
      oid: projekti.oid,
      versio: projekti.versio,
      paatos: {
        kuulutusPaiva: julkaisematonPaatos?.kuulutusPaiva || null,
        kuulutusVaihePaattyyPaiva: julkaisematonPaatos?.kuulutusVaihePaattyyPaiva || null,
        hallintoOikeus: julkaisematonPaatos?.hallintoOikeus || "",
        kuulutusYhteystiedot: defaultEsitettavatYhteystiedot(julkaisematonPaatos?.kuulutusYhteystiedot),
        ilmoituksenVastaanottajat: defaultVastaanottajat(projekti, julkaisematonPaatos?.ilmoituksenVastaanottajat, kirjaamoOsoitteet),
      },
      hyvaksymisPaatosVaihe: {},
      jatkoPaatos1Vaihe: { viimeinenVoimassaolovuosi: julkaisematonPaatos?.viimeinenVoimassaolovuosi },
      jatkoPaatos2Vaihe: { viimeinenVoimassaolovuosi: julkaisematonPaatos?.viimeinenVoimassaolovuosi },
    };

    if (isPohjoissaameSuunnitelma(projekti.kielitiedot)) {
      const { kuulutusIlmoitusPDF, kuulutusPDF } = julkaisematonPaatos?.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME || {};

      const { paatosVaiheAvain } = paatosSpecificRoutesMap[paatosTyyppi];
      const formValuePaatosVaihe = formValues[paatosVaiheAvain];
      formValuePaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt = {
        POHJOISSAAME: {
          kuulutusIlmoitusPDFPath: kuulutusIlmoitusPDF?.tiedosto || null!,
          kuulutusPDFPath: kuulutusPDF?.tiedosto || null!,
        },
      };
    }

    if (julkaisematonPaatos?.uudelleenKuulutus) {
      formValues.paatos.uudelleenKuulutus = getDefaultValuesForUudelleenKuulutus(
        projekti.kielitiedot,
        julkaisematonPaatos.uudelleenKuulutus
      );
    }

    return formValues;
  }, [projekti, julkaisematonPaatos, kirjaamoOsoitteet, paatosTyyppi]);

  const validationMode = useValidationMode();

  const formOptions: UseFormProps<KuulutuksenTiedotFormValues, ProjektiValidationContext> = {
    resolver: yupResolver(createPaatosKuulutusSchema(paatosTyyppi), { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
    context: { projekti, paatos: julkaisematonPaatos, validationMode },
  };

  const useFormReturn = useForm<KuulutuksenTiedotFormValues, ProjektiValidationContext>(formOptions);
  const { isAllowedOnRoute } = useIsAllowedOnCurrentProjektiRoute();

  const {
    formState: { isDirty, isSubmitting },
  } = useFormReturn;

  useLeaveConfirm(!isSubmitting && isDirty);

  const { reset } = useFormReturn;
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const voiMuokata = !julkaisematonPaatos?.muokkausTila || julkaisematonPaatos?.muokkausTila === MuokkausTila.MUOKKAUS;

  function saamePdfAvain(paatosTyyppi: PaatosTyyppi): SaameKuulutusTiedostotMetodi {
    switch (paatosTyyppi) {
      case PaatosTyyppi.HYVAKSYMISPAATOS:
        return "hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt";
      case PaatosTyyppi.JATKOPAATOS1:
        return "jatkoPaatos1Vaihe.hyvaksymisPaatosVaiheSaamePDFt";
      case PaatosTyyppi.JATKOPAATOS2:
        return "jatkoPaatos2Vaihe.hyvaksymisPaatosVaiheSaamePDFt";
    }
  }

  return (
    <>
      {voiMuokata && (
        <FormProvider {...useFormReturn}>
          <form>
            <fieldset disabled={!isAllowedOnRoute || !projekti.nykyinenKayttaja.omaaMuokkausOikeuden}>
              <KuulutusJaJulkaisuPaiva />
              <SelitteetUudelleenkuulutukselle
                disabled={!voiMuokata}
                kielitiedot={projekti.kielitiedot}
                uudelleenKuulutus={julkaisematonPaatos?.uudelleenKuulutus}
                vaiheenAvain="paatos"
              />
              <PaatoksenPaiva paatosTyyppi={paatosTyyppi} paatos={kasittelyntilaData} projektiOid={projekti.oid} />
              {paatosIsJatkopaatos(paatosTyyppi) && <Voimassaolovuosi paatosTyyppi={paatosTyyppi} />}
              <MuutoksenHaku />
              <KuulutuksessaEsitettavatYhteystiedot projekti={projekti} julkaisematonPaatos={julkaisematonPaatos} />
              <IlmoituksenVastaanottajatKomponentti
                paatosVaihe={julkaisematonPaatos}
                paatosTyyppi={paatosTyyppi}
                oid={projekti.oid}
                omistajahakuStatus={projekti.omistajahaku?.status}
              />
              {pdfFormRef.current?.esikatselePdf && (
                <KuulutuksenJaIlmoituksenEsikatselu paatosTyyppi={paatosTyyppi} esikatselePdf={pdfFormRef.current?.esikatselePdf} />
              )}
              {isPohjoissaameSuunnitelma(projekti.kielitiedot) && (
                <PohjoissaamenkielinenKuulutusJaIlmoitusInput
                  saamePdfAvain={saamePdfAvain(paatosTyyppi)}
                  ilmoitusTiedot={julkaisematonPaatos?.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusIlmoitusPDF}
                  kuulutusTiedot={julkaisematonPaatos?.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusPDF}
                />
              )}
              <Painikkeet paatosTyyppi={paatosTyyppi} projekti={projekti} julkaisu={julkaisu} julkaisematonPaatos={julkaisematonPaatos} />
            </fieldset>
          </form>
        </FormProvider>
      )}
      {!voiMuokata && projekti && julkaisu && (
        <>
          <FormProvider {...useFormReturn}>
            <form>
              <Lukunakyma projekti={projekti} paatosTyyppi={paatosTyyppi} julkaisu={julkaisu} />
              <Painikkeet paatosTyyppi={paatosTyyppi} projekti={projekti} julkaisu={julkaisu} julkaisematonPaatos={julkaisematonPaatos} />
            </form>
          </FormProvider>
        </>
      )}
      <PdfPreviewForm ref={pdfFormRef} />
    </>
  );
}
