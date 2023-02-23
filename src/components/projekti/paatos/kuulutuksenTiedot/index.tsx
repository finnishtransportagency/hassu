import { yupResolver } from "@hookform/resolvers/yup";
import { HyvaksymisPaatosVaiheInput, KirjaamoOsoite, MuokkausTila, TallennaProjektiInput } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import React, { ReactElement, useEffect, useMemo } from "react";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { hyvaksymispaatosKuulutusSchema } from "src/schemas/hyvaksymispaatosKuulutus";
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
import useIsAllowedOnCurrentProjektiRoute from "src/hooks/useIsOnAllowedProjektiRoute";
import PaatoksenPaiva from "@components/projekti/paatos/kuulutuksenTiedot/PaatoksenPaiva";
import { getPaatosSpecificData, paatosIsJatkopaatos, PaatosTyyppi } from "src/util/getPaatosSpecificData";
import Voimassaolovuosi from "./Voimassaolovuosi";
import { getDefaultValuesForUudelleenKuulutus } from "src/util/getDefaultValuesForLokalisoituText";
import SelitteetUudelleenkuulutukselle from "@components/projekti/SelitteetUudelleenkuulutukselle";
import defaultEsitettavatYhteystiedot from "src/util/defaultEsitettavatYhteystiedot";

type paatosInputValues = Omit<HyvaksymisPaatosVaiheInput, "hallintoOikeus"> & {
  hallintoOikeus: HyvaksymisPaatosVaiheInput["hallintoOikeus"] | "";
};

export type KuulutuksenTiedotFormValues = Pick<TallennaProjektiInput, "oid" | "versio"> & {
  paatos: paatosInputValues;
};

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
    };

    if (julkaisematonPaatos?.uudelleenKuulutus) {
      formValues.paatos.uudelleenKuulutus = getDefaultValuesForUudelleenKuulutus(
        projekti.kielitiedot,
        julkaisematonPaatos.uudelleenKuulutus
      );
    }

    return formValues;
  }, [projekti, julkaisematonPaatos, kirjaamoOsoitteet]);

  const formOptions: UseFormProps<KuulutuksenTiedotFormValues> = {
    resolver: yupResolver(hyvaksymispaatosKuulutusSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
    context: { projekti, paatos: julkaisematonPaatos },
  };

  const useFormReturn = useForm<KuulutuksenTiedotFormValues>(formOptions);
  const { isAllowedOnRoute } = useIsAllowedOnCurrentProjektiRoute();

  const {
    formState: { isDirty },
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  const { reset } = useFormReturn;
  useEffect(() => {
    console.log("Reset", defaultValues);
    reset(defaultValues);
  }, [defaultValues, reset]);

  const voiMuokata = !julkaisematonPaatos?.muokkausTila || julkaisematonPaatos?.muokkausTila === MuokkausTila.MUOKKAUS;

  return (
    <>
      {julkaisematonPaatos?.palautusSyy && (
        <Notification type={NotificationType.WARN}>
          {"Hyväksymisvaihejulkaisu on palautettu korjattavaksi. Palautuksen syy: " + julkaisematonPaatos.palautusSyy}
        </Notification>
      )}

      {voiMuokata && (
        <>
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
                {paatosIsJatkopaatos(paatosTyyppi) && <Voimassaolovuosi />}
                <MuutoksenHaku />
                <KuulutuksessaEsitettavatYhteystiedot projekti={projekti} julkaisematonPaatos={julkaisematonPaatos} />
                <IlmoituksenVastaanottajatKomponentti paatosVaihe={julkaisematonPaatos} />

                {pdfFormRef.current?.esikatselePdf && (
                  <KuulutuksenJaIlmoituksenEsikatselu paatosTyyppi={paatosTyyppi} esikatselePdf={pdfFormRef.current?.esikatselePdf} />
                )}
                <Painikkeet paatosTyyppi={paatosTyyppi} projekti={projekti} julkaisu={julkaisu} julkaisematonPaatos={julkaisematonPaatos} />
              </fieldset>
            </form>
          </FormProvider>
        </>
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
