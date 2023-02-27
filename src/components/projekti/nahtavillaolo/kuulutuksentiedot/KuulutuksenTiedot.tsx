import { yupResolver } from "@hookform/resolvers/yup";
import { KirjaamoOsoite, MuokkausTila, TallennaProjektiInput } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import React, { useEffect, useMemo } from "react";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { nahtavillaoloKuulutusSchema } from "src/schemas/nahtavillaoloKuulutus";
import Painikkeet from "./Painikkeet";
import HankkeenSisallonKuvaus from "./HankkeenSisallonKuvaus";
import KuulutuksenJaIlmoituksenEsikatselu from "./KuulutuksenJaIlmoituksenEsikatselu";
import KuulutuksessaEsitettavatYhteystiedot from "./KuulutuksessaEsitettavatYhteystiedot";
import KuulutusJaJulkaisuPaiva from "./KuulutusJaJulkaisuPaiva";
import IlmoituksenVastaanottajatKomponentti from "./IlmoituksenVastaanottajat";
import defaultVastaanottajat from "src/util/defaultVastaanottajat";
import Lukunakyma from "./Lukunakyma";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import PdfPreviewForm from "@components/projekti/PdfPreviewForm";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { getDefaultValuesForLokalisoituText, getDefaultValuesForUudelleenKuulutus } from "src/util/getDefaultValuesForLokalisoituText";
import SelitteetUudelleenkuulutukselle from "@components/projekti/SelitteetUudelleenkuulutukselle";
import defaultEsitettavatYhteystiedot from "src/util/defaultEsitettavatYhteystiedot";

type PickedTallennaProjektiInput = Pick<TallennaProjektiInput, "oid" | "versio" | "nahtavillaoloVaihe">;

export type KuulutuksenTiedotFormValues = Required<{
  [K in keyof PickedTallennaProjektiInput]: NonNullable<PickedTallennaProjektiInput[K]>;
}>;

export default function KuulutuksenTiedot() {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();

  return <>{projekti && kirjaamoOsoitteet && <KuulutuksenTiedotForm projekti={projekti} kirjaamoOsoitteet={kirjaamoOsoitteet} />}</>;
}

interface KuulutuksenTiedotFormProps {
  projekti: ProjektiLisatiedolla;
  kirjaamoOsoitteet: KirjaamoOsoite[];
}

function KuulutuksenTiedotForm({ projekti, kirjaamoOsoitteet }: KuulutuksenTiedotFormProps) {
  const pdfFormRef = React.useRef<React.ElementRef<typeof PdfPreviewForm>>(null);

  const defaultValues: KuulutuksenTiedotFormValues = useMemo(() => {
    // SUOMI hankkeen kuvaus on aina lomakkeella, RUOTSI JA SAAME vain jos kyseinen kieli on projektin kielitiedoissa.
    // Jos kieli ei ole kielitiedoissa kyseisen kielen kenttää ei tule lisätä hankkeenKuvaus olioon
    // Tästä syystä pickBy:llä poistetaan undefined hankkeenkuvaus tiedot.
    const hankkeenKuvaus = getDefaultValuesForLokalisoituText(projekti.kielitiedot, projekti.nahtavillaoloVaihe?.hankkeenKuvaus);

    const tallentamisTiedot: KuulutuksenTiedotFormValues = {
      oid: projekti.oid,
      versio: projekti.versio,
      nahtavillaoloVaihe: {
        kuulutusPaiva: projekti?.nahtavillaoloVaihe?.kuulutusPaiva || null,
        kuulutusVaihePaattyyPaiva: projekti?.nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva || null,
        muistutusoikeusPaattyyPaiva: projekti?.nahtavillaoloVaihe?.muistutusoikeusPaattyyPaiva || null,
        hankkeenKuvaus,
        kuulutusYhteystiedot: defaultEsitettavatYhteystiedot(projekti.nahtavillaoloVaihe?.kuulutusYhteystiedot),
        ilmoituksenVastaanottajat: defaultVastaanottajat(
          projekti,
          projekti.nahtavillaoloVaihe?.ilmoituksenVastaanottajat,
          kirjaamoOsoitteet
        ),
      },
    };

    if (projekti.nahtavillaoloVaihe?.uudelleenKuulutus) {
      tallentamisTiedot.nahtavillaoloVaihe.uudelleenKuulutus = getDefaultValuesForUudelleenKuulutus(
        projekti.kielitiedot,
        projekti.nahtavillaoloVaihe.uudelleenKuulutus
      );
    }

    return tallentamisTiedot;
  }, [projekti, kirjaamoOsoitteet]);

  const formOptions: UseFormProps<KuulutuksenTiedotFormValues> = {
    resolver: yupResolver(nahtavillaoloKuulutusSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
    context: { projekti },
  };

  const useFormReturn = useForm<KuulutuksenTiedotFormValues>(formOptions);
  const {
    formState: { isDirty },
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  const { reset } = useFormReturn;
  useEffect(() => {
    console.log("Reset", defaultValues);
    reset(defaultValues);
  }, [defaultValues, reset]);

  const voiMuokata = !projekti?.nahtavillaoloVaihe?.muokkausTila || projekti?.nahtavillaoloVaihe?.muokkausTila === MuokkausTila.MUOKKAUS;

  return (
    <>
      {projekti.nahtavillaoloVaihe?.palautusSyy && (
        <Notification type={NotificationType.WARN}>
          {"Nahtävilläolovaihejulkaisu on palautettu korjattavaksi. Palautuksen syy: " + projekti.nahtavillaoloVaihe.palautusSyy}
        </Notification>
      )}
      {voiMuokata && (
        <>
          <FormProvider {...useFormReturn}>
            <form>
              <KuulutusJaJulkaisuPaiva />
              <SelitteetUudelleenkuulutukselle
                disabled={!voiMuokata}
                kielitiedot={projekti.kielitiedot}
                uudelleenKuulutus={projekti.nahtavillaoloVaihe?.uudelleenKuulutus}
                vaiheenAvain="nahtavillaoloVaihe"
              />
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
      {!voiMuokata && projekti && projekti.nahtavillaoloVaiheJulkaisu && (
        <FormProvider {...useFormReturn}>
          <Lukunakyma projekti={projekti} nahtavillaoloVaiheJulkaisu={projekti.nahtavillaoloVaiheJulkaisu} />
          <Painikkeet projekti={projekti} />
        </FormProvider>
      )}
    </>
  );
}
