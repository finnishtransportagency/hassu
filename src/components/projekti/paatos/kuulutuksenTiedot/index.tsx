import { yupResolver } from "@hookform/resolvers/yup";
import { HyvaksymisPaatosVaiheInput, KirjaamoOsoite, TallennaProjektiInput, YhteystietoInput } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import React, { ReactElement, useMemo } from "react";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { hyvaksymispaatosKuulutusSchema } from "src/schemas/hyvaksymispaatosKuulutus";
import Painikkeet from "./Painikkeet";
import KuulutuksenJaIlmoituksenEsikatselu from "./KuulutuksenJaIlmoituksenEsikatselu";
import KuulutuksessaEsitettavatYhteystiedot from "./KuulutuksessaEsitettavatYhteystiedot";
import KuulutusJaJulkaisuPaiva from "./KuulutusJaJulkaisuPaiva";
import MuutoksenHaku from "./MuutoksenHaku";
import IlmoituksenVastaanottajatKomponentti from "./IlmoituksenVastaanottajat";
import Lukunakyma from "./Lukunakyma";
import defaultVastaanottajat from "src/util/defaultVastaanottajat";
import { removeTypeName } from "src/util/removeTypeName";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import PdfPreviewForm from "@components/projekti/PdfPreviewForm";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import useIsAllowedOnCurrentProjektiRoute from "src/hooks/useIsOnAllowedProjektiRoute";
import PaatoksenPaiva from "@components/projekti/paatos/kuulutuksenTiedot/PaatoksenPaiva";

export type KuulutuksenTiedotFormValues = Pick<TallennaProjektiInput, "oid"> & {
  hyvaksymisPaatosVaihe: Omit<HyvaksymisPaatosVaiheInput, "hallintoOikeus"> & {
    hallintoOikeus: HyvaksymisPaatosVaiheInput["hallintoOikeus"] | "";
  };
};

export default function KuulutuksenTiedot(): ReactElement {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();
  return <>{projekti && kirjaamoOsoitteet && <KuulutuksenTiedotForm kirjaamoOsoitteet={kirjaamoOsoitteet} projekti={projekti} />}</>;
}

interface KuulutuksenTiedotFormProps {
  projekti: ProjektiLisatiedolla;
  kirjaamoOsoitteet: KirjaamoOsoite[];
}

function KuulutuksenTiedotForm({ projekti, kirjaamoOsoitteet }: KuulutuksenTiedotFormProps) {
  const pdfFormRef = React.useRef<React.ElementRef<typeof PdfPreviewForm>>(null);

  const defaultValues: KuulutuksenTiedotFormValues = useMemo(() => {
    const yhteysTiedot: YhteystietoInput[] =
      projekti?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot?.map((yt) => removeTypeName(yt)) || [];

    const yhteysHenkilot: string[] = projekti?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysHenkilot || [];

    const formValues: KuulutuksenTiedotFormValues = {
      oid: projekti.oid,
      hyvaksymisPaatosVaihe: {
        kuulutusPaiva: projekti?.hyvaksymisPaatosVaihe?.kuulutusPaiva || null,
        kuulutusVaihePaattyyPaiva: projekti?.hyvaksymisPaatosVaihe?.kuulutusVaihePaattyyPaiva || null,
        hallintoOikeus: projekti?.hyvaksymisPaatosVaihe?.hallintoOikeus || "",
        kuulutusYhteystiedot: {
          yhteysTiedot,
          yhteysHenkilot,
        },
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
  const { isAllowedOnRoute } = useIsAllowedOnCurrentProjektiRoute();

  const {
    formState: { isDirty },
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  const voiMuokata = !projekti?.hyvaksymisPaatosVaiheJulkaisut || projekti.hyvaksymisPaatosVaiheJulkaisut.length < 1;

  return (
    <>
      {projekti.hyvaksymisPaatosVaihe?.palautusSyy && (
        <Notification type={NotificationType.WARN}>
          {"Hyväksymisvaihejulkaisu on palautettu korjattavaksi. Palautuksen syy: " + projekti.hyvaksymisPaatosVaihe.palautusSyy}
        </Notification>
      )}

      {voiMuokata && (
        <>
          <FormProvider {...useFormReturn}>
            <form>
              <fieldset disabled={!isAllowedOnRoute || !projekti.nykyinenKayttaja.omaaMuokkausOikeuden}>
                <KuulutusJaJulkaisuPaiva />
                <PaatoksenPaiva paatos={projekti.kasittelynTila?.hyvaksymispaatos} projektiOid={projekti.oid} />
                <MuutoksenHaku />
                <KuulutuksessaEsitettavatYhteystiedot />
                <IlmoituksenVastaanottajatKomponentti hyvaksymisPaatosVaihe={projekti?.hyvaksymisPaatosVaihe} />

                {pdfFormRef.current?.esikatselePdf && (
                  <KuulutuksenJaIlmoituksenEsikatselu esikatselePdf={pdfFormRef.current?.esikatselePdf} />
                )}
                <Painikkeet projekti={projekti} />
              </fieldset>
            </form>
          </FormProvider>
        </>
      )}
      {!voiMuokata && projekti && projekti.hyvaksymisPaatosVaiheJulkaisut?.[projekti.hyvaksymisPaatosVaiheJulkaisut.length - 1] && (
        <>
          <FormProvider {...useFormReturn}>
            <form>
              <Lukunakyma
                projekti={projekti}
                hyvaksymisPaatosVaiheJulkaisu={projekti.hyvaksymisPaatosVaiheJulkaisut[projekti.hyvaksymisPaatosVaiheJulkaisut.length - 1]}
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
