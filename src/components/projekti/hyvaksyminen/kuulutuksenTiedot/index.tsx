import { yupResolver } from "@hookform/resolvers/yup";
import { TallennaProjektiInput, KirjaamoOsoite } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import React, { ReactElement, useEffect, useMemo } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { hyvaksymispaatosKuulutusSchema } from "src/schemas/hyvaksymispaatosKuulutus";
import Painikkeet from "./Painikkeet";
import KuulutuksenJaIlmoituksenEsikatselu from "./KuulutuksenJaIlmoituksenEsikatselu";
import KuulutuksessaEsitettavatYhteystiedot from "./KuulutuksessaEsitettavatYhteystiedot";
import KuulutusJaJulkaisuPaiva from "./KuulutusJaJulkaisuPaiva";
import PaatoksenPaiva from "./PaatoksenPaiva";
import MuutoksenHaku from "./MuutoksenHaku";
import IlmoituksenVastaanottajatKomponentti from "./IlmoituksenVastaanottajat";
import Lukunakyma from "./Lukunakyma";
import defaultVastaanottajat from "src/util/defaultVastaanottajat";
import { removeTypeName } from "src/util/removeTypeName";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import PdfPreviewForm from "@components/projekti/PdfPreviewForm";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";

export type KuulutuksenTiedotFormValues = Pick<TallennaProjektiInput, "oid" | "hyvaksymisPaatosVaihe">;

export default function KuulutuksenTiedot(): ReactElement {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();
  return <>{projekti && kirjaamoOsoitteet && <KuulutuksenTiedotForm {...{ kirjaamoOsoitteet, projekti }} />}</>;
}

interface KuulutuksenTiedotFormProps {
  projekti: ProjektiLisatiedolla;
  kirjaamoOsoitteet: KirjaamoOsoite[];
}

function KuulutuksenTiedotForm({ projekti, kirjaamoOsoitteet }: KuulutuksenTiedotFormProps) {
  const pdfFormRef = React.useRef<React.ElementRef<typeof PdfPreviewForm>>(null);

  const defaultValues: KuulutuksenTiedotFormValues = useMemo(() => {
    const formValues = {
      oid: projekti.oid,
      hyvaksymisPaatosVaihe: {
        kuulutusPaiva: projekti?.hyvaksymisPaatosVaihe?.kuulutusPaiva || "",
        kuulutusVaihePaattyyPaiva: projekti?.hyvaksymisPaatosVaihe?.kuulutusVaihePaattyyPaiva || "",
        hallintoOikeus: projekti?.hyvaksymisPaatosVaihe?.hallintoOikeus,
        kuulutusYhteystiedot: projekti?.hyvaksymisPaatosVaihe?.kuulutusYhteystiedot
          ? projekti.hyvaksymisPaatosVaihe.kuulutusYhteystiedot.map((yhteystieto) => removeTypeName(yhteystieto))
          : [],
        kuulutusYhteysHenkilot:
          projekti?.kayttoOikeudet
            ?.filter(({ kayttajatunnus }) =>
              projekti?.hyvaksymisPaatosVaihe?.kuulutusYhteysHenkilot?.includes(kayttajatunnus)
            )
            .map(({ kayttajatunnus }) => kayttajatunnus) || [],
        ilmoituksenVastaanottajat: defaultVastaanottajat(
          projekti,
          projekti.hyvaksymisPaatosVaihe?.ilmoituksenVastaanottajat,
          kirjaamoOsoitteet
        ),
      },
    };
    return formValues;
  }, [projekti, kirjaamoOsoitteet]);

  const formOptions: UseFormProps<KuulutuksenTiedotFormValues> = {
    resolver: yupResolver(hyvaksymispaatosKuulutusSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
    context: projekti,
  };

  const useFormReturn = useForm<KuulutuksenTiedotFormValues>(formOptions);

  const {
    formState: { isDirty },
    watch,
  } = useFormReturn;

  const formData = watch();
  useEffect(() => {
    console.log({ formData, defaultValues });
  }, [defaultValues, formData]);

  useLeaveConfirm(isDirty);

  const voiMuokata = !projekti?.hyvaksymisPaatosVaiheJulkaisut || projekti.hyvaksymisPaatosVaiheJulkaisut.length < 1;

  return (
    <>
      {projekti.hyvaksymisPaatosVaihe?.palautusSyy && (
        <Notification type={NotificationType.WARN}>
          {"Hyväksymisvaihejulkaisu on palautettu korjattavaksi. Palautuksen syy: " +
            projekti.hyvaksymisPaatosVaihe.palautusSyy}
        </Notification>
      )}

      {voiMuokata && (
        <>
          <FormProvider {...useFormReturn}>
            <form>
              <KuulutusJaJulkaisuPaiva />
              <PaatoksenPaiva projekti={projekti} />
              <MuutoksenHaku />
              <KuulutuksessaEsitettavatYhteystiedot />
              <IlmoituksenVastaanottajatKomponentti hyvaksymisPaatosVaihe={projekti?.hyvaksymisPaatosVaihe} />

              {pdfFormRef.current?.esikatselePdf && (
                <KuulutuksenJaIlmoituksenEsikatselu esikatselePdf={pdfFormRef.current?.esikatselePdf} />
              )}
              <Painikkeet projekti={projekti} />
            </form>
          </FormProvider>
        </>
      )}
      {!voiMuokata &&
        projekti &&
        projekti.hyvaksymisPaatosVaiheJulkaisut?.[projekti.hyvaksymisPaatosVaiheJulkaisut.length - 1] && (
          <>
            <FormProvider {...useFormReturn}>
              <form>
                <Lukunakyma
                  projekti={projekti}
                  hyvaksymisPaatosVaiheJulkaisu={
                    projekti.hyvaksymisPaatosVaiheJulkaisut[projekti.hyvaksymisPaatosVaiheJulkaisut.length - 1]
                  }
                />
                <Painikkeet projekti={projekti} />
              </form>
            </FormProvider>
          </>
        )}
      <PdfPreviewForm ref={pdfFormRef} />
    </>
  );
}
