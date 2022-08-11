import { yupResolver } from "@hookform/resolvers/yup";
import { TallennaProjektiInput, KirjaamoOsoite, Projekti } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import React, { useEffect, useState } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import { hyvaksymispaatosKuulutusSchema } from "src/schemas/hyvaksymispaatosKuulutus";
import Painikkeet from "./Painikkeet";
import KuulutuksenJaIlmoituksenEsikatselu from "./KuulutuksenJaIlmoituksenEsikatselu";
import KuulutuksessaEsitettavatYhteystiedot from "./KuulutuksessaEsitettavatYhteystiedot";
import KuulutusJaJulkaisuPaiva from "./KuulutusJaJulkaisuPaiva";
import PaatoksenPaiva from "./PaatoksenPaiva";
import MuutoksenHaku from "./MuutoksenHaku";
import IlmoituksenVastaanottajatKomponentti from "./IlmoituksenVastaanottajat";
// import Lukunakyma from "./Lukunakyma";
import defaultVastaanottajat from "src/util/defaultVastaanottajat";
import { removeTypeName } from "src/util/removeTypeName";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import PdfPreviewForm from "@components/projekti/PdfPreviewForm";

function defaultValues(
  projekti: Projekti,
  kirjaamoOsoitteet: KirjaamoOsoite[] | undefined
): KuulutuksenTiedotFormValues {
  return {
    oid: projekti.oid,
    hyvaksymisVaihe: {
      kuulutusPaiva: projekti?.hyvaksymisVaihe?.kuulutusPaiva,
      kuulutusVaihePaattyyPaiva: projekti?.hyvaksymisVaihe?.kuulutusVaihePaattyyPaiva,
      hallintoOikeudet: projekti?.hyvaksymisVaihe?.hallintoOikeudet,
      kuulutusYhteystiedot: projekti?.hyvaksymisVaihe?.kuulutusYhteystiedot
        ? projekti.hyvaksymisVaihe.kuulutusYhteystiedot.map((yhteystieto) => removeTypeName(yhteystieto))
        : [],
      ilmoituksenVastaanottajat: defaultVastaanottajat(
        projekti,
        projekti.hyvaksymisVaihe?.ilmoituksenVastaanottajat,
        kirjaamoOsoitteet
      ),
    },
  };
}

export type KuulutuksenTiedotFormValues = Pick<TallennaProjektiInput, "oid" | "hyvaksymisVaihe">;

export default function KuulutuksenTiedot() {
  const { data: projekti } = useProjekti();
  const [formContext, setFormContext] = useState<Projekti | undefined>(undefined);
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();

  const pdfFormRef = React.useRef<React.ElementRef<typeof PdfPreviewForm>>(null);

  const formOptions: UseFormProps<KuulutuksenTiedotFormValues> = {
    resolver: yupResolver(hyvaksymispaatosKuulutusSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {},
    context: formContext,
  };

  const useFormReturn = useForm<KuulutuksenTiedotFormValues>(formOptions);
  const { reset } = useFormReturn;

  useEffect(() => {
    if (projekti?.oid) {
      const tallentamisTiedot: KuulutuksenTiedotFormValues = defaultValues(projekti, kirjaamoOsoitteet);
      setFormContext(projekti);
      reset(tallentamisTiedot);
    }
  }, [projekti, kirjaamoOsoitteet, reset]);

  const voiMuokata = !projekti?.hyvaksymisVaiheJulkaisut || projekti.hyvaksymisVaiheJulkaisut.length < 1;

  if (!projekti) {
    return null;
  }

  return (
    <>
      {projekti.hyvaksymisVaihe?.palautusSyy && (
        <Notification type={NotificationType.WARN}>
          {"Hyväksymisvaihejulkaisu on palautettu korjattavaksi. Palautuksen syy: " +
            projekti.hyvaksymisVaihe.palautusSyy}
        </Notification>
      )}
      {voiMuokata && (
        <>
          <FormProvider {...useFormReturn}>
            <form>
              <KuulutusJaJulkaisuPaiva />
              <PaatoksenPaiva />
              <MuutoksenHaku />
              <KuulutuksessaEsitettavatYhteystiedot />
              <IlmoituksenVastaanottajatKomponentti hyvaksymisVaihe={projekti?.hyvaksymisVaihe} />

              {pdfFormRef.current?.esikatselePdf && (
                <KuulutuksenJaIlmoituksenEsikatselu esikatselePdf={pdfFormRef.current?.esikatselePdf} />
              )}
              <Painikkeet projekti={projekti} />
            </form>
          </FormProvider>
          <PdfPreviewForm ref={pdfFormRef} />
        </>
      )}
      {!voiMuokata && projekti && projekti.hyvaksymisVaiheJulkaisut?.[projekti.hyvaksymisVaiheJulkaisut.length - 1] && (
        <FormProvider {...useFormReturn}>
          {/* <Lukunakyma
            projekti={projekti}
            hyvaksymisVaiheJulkaisu={projekti.hyvaksymisVaiheJulkaisut[projekti.hyvaksymisVaiheJulkaisut.length - 1]}
          />
          <Painikkeet projekti={projekti} /> */}
        </FormProvider>
      )}
    </>
  );
}
