import { yupResolver } from "@hookform/resolvers/yup";
import { TallennaProjektiInput, KirjaamoOsoite, Projekti } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import React, { useEffect, useState } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import { nahtavillaoloKuulutusSchema } from "src/schemas/nahtavillaoloKuulutus";
import Painikkeet from "./Painikkeet";
import HankkeenSisallonKuvaus from "./HankkeenSisallonKuvaus";
import KuulutuksenJaIlmoituksenEsikatselu from "./KuulutuksenJaIlmoituksenEsikatselu";
import KuulutuksessaEsitettavatYhteystiedot from "./KuulutuksessaEsitettavatYhteystiedot";
import KuulutusJaJulkaisuPaiva from "./KuulutusJaJulkaisuPaiva";
import IlmoituksenVastaanottajatKomponentti from "./IlmoituksenVastaanottajat";
import defaultVastaanottajat from "src/util/defaultVastaanottajat";
import { removeTypeName } from "src/util/removeTypeName";
import Lukunakyma from "./Lukunakyma";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import PdfPreviewForm from "@components/projekti/PdfPreviewForm";

function defaultValues(
  projekti: Projekti,
  kirjaamoOsoitteet: KirjaamoOsoite[] | undefined
): KuulutuksenTiedotFormValues {
  return {
    oid: projekti.oid,
    nahtavillaoloVaihe: {
      kuulutusPaiva: projekti?.nahtavillaoloVaihe?.kuulutusPaiva,
      kuulutusVaihePaattyyPaiva: projekti?.nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva,
      muistutusoikeusPaattyyPaiva: projekti?.nahtavillaoloVaihe?.muistutusoikeusPaattyyPaiva,
      hankkeenKuvaus: removeTypeName(projekti?.nahtavillaoloVaihe?.hankkeenKuvaus),
      kuulutusYhteystiedot: projekti?.nahtavillaoloVaihe?.kuulutusYhteystiedot
        ? projekti.nahtavillaoloVaihe.kuulutusYhteystiedot.map((yhteystieto) => removeTypeName(yhteystieto))
        : [],
      kuulutusYhteysHenkilot:
        projekti?.kayttoOikeudet
          ?.filter(({ kayttajatunnus }) =>
            projekti?.nahtavillaoloVaihe?.kuulutusYhteysHenkilot?.includes(kayttajatunnus)
          )
          .map(({ kayttajatunnus }) => kayttajatunnus) || [],
      ilmoituksenVastaanottajat: defaultVastaanottajat(
        projekti,
        projekti.nahtavillaoloVaihe?.ilmoituksenVastaanottajat,
        kirjaamoOsoitteet
      ),
    },
  };
}

export type KuulutuksenTiedotFormValues = Pick<TallennaProjektiInput, "oid" | "nahtavillaoloVaihe">;

export default function KuulutuksenTiedot() {
  const { data: projekti } = useProjekti();
  const [formContext, setFormContext] = useState<Projekti | undefined>(undefined);
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();

  const pdfFormRef = React.useRef<React.ElementRef<typeof PdfPreviewForm>>(null);

  const formOptions: UseFormProps<KuulutuksenTiedotFormValues> = {
    resolver: yupResolver(nahtavillaoloKuulutusSchema, { abortEarly: false, recursive: true }),
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

  const voiMuokata = !projekti?.nahtavillaoloVaiheJulkaisut || projekti.nahtavillaoloVaiheJulkaisut.length < 1;

  if (!projekti) {
    return null;
  }

  return (
    <>
      {projekti.nahtavillaoloVaihe?.palautusSyy && (
        <Notification type={NotificationType.WARN}>
          {"Naht??vill??olovaihejulkaisu on palautettu korjattavaksi. Palautuksen syy: " +
            projekti.nahtavillaoloVaihe.palautusSyy}
        </Notification>
      )}
      {voiMuokata && (
        <>
          <FormProvider {...useFormReturn}>
            <form>
              <KuulutusJaJulkaisuPaiva />
              <HankkeenSisallonKuvaus kielitiedot={projekti?.kielitiedot} />
              <KuulutuksessaEsitettavatYhteystiedot />
              <IlmoituksenVastaanottajatKomponentti nahtavillaoloVaihe={projekti?.nahtavillaoloVaihe} />
              {pdfFormRef.current?.esikatselePdf && (
                <KuulutuksenJaIlmoituksenEsikatselu esikatselePdf={pdfFormRef.current?.esikatselePdf} />
              )}
              <Painikkeet projekti={projekti} />
            </form>
          </FormProvider>
          <PdfPreviewForm ref={pdfFormRef} />
        </>
      )}
      {!voiMuokata &&
        projekti &&
        projekti.nahtavillaoloVaiheJulkaisut?.[projekti.nahtavillaoloVaiheJulkaisut.length - 1] && (
          <FormProvider {...useFormReturn}>
            <Lukunakyma
              projekti={projekti}
              nahtavillaoloVaiheJulkaisu={
                projekti.nahtavillaoloVaiheJulkaisut[projekti.nahtavillaoloVaiheJulkaisut.length - 1]
              }
            />
            <Painikkeet projekti={projekti} />
          </FormProvider>
        )}
    </>
  );
}
