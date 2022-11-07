import { yupResolver } from "@hookform/resolvers/yup";
import { HyvaksymisPaatosVaiheInput, KirjaamoOsoite, TallennaProjektiInput, YhteystietoInput } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import React, { ReactElement, useEffect, useMemo } from "react";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import JatkoPaatos1KuulutusPainikkeet from "./JatkoPaatos1KuulutusPainikkeet";
import KuulutuksenJaIlmoituksenEsikatselu from "./KuulutuksenJaIlmoituksenEsikatselu";
import KuulutuksessaEsitettavatYhteystiedot from "./KuulutuksessaEsitettavatYhteystiedot";
import KuulutusJaJulkaisuPaiva from "./KuulutusJaJulkaisuPaiva";
import PaatoksenPaiva from "../../paatos/kuulutuksenTiedot/PaatoksenPaiva";
import MuutoksenHaku from "./MuutoksenHaku";
import IlmoituksenVastaanottajatKomponentti from "./IlmoituksenVastaanottajat";
import Lukunakyma from "./Lukunakyma";
import defaultVastaanottajat from "src/util/defaultVastaanottajat";
import { removeTypeName } from "src/util/removeTypeName";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import PdfPreviewForm from "@components/projekti/PdfPreviewForm";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import useIsAllowedOnCurrentProjektiRoute from "src/hooks/useIsOnAllowedProjektiRoute";
import { jatkopaatos1KuulutusSchema } from "src/schemas/jatkopaatos1Kuulutus";
import Voimassaolovuosi from "./Voimassaolovuosi";

export type KuulutuksenTiedotFormValues = Pick<TallennaProjektiInput, "oid"> & {
  jatkoPaatos1Vaihe: Omit<HyvaksymisPaatosVaiheInput, "hallintoOikeus"> & {
    hallintoOikeus: HyvaksymisPaatosVaiheInput["hallintoOikeus"] | "";
  };
};

interface Props {
  setIsDirty: (value: React.SetStateAction<boolean>) => void;
}

export default function KuulutuksenTiedot({ setIsDirty }: Props): ReactElement {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();
  return <>{projekti && kirjaamoOsoitteet && <JatkoKuulutuksetTiedotForm {...{ kirjaamoOsoitteet, projekti, setIsDirty }} />}</>;
}

interface KuulutuksenTiedotFormProps {
  projekti: ProjektiLisatiedolla;
  kirjaamoOsoitteet: KirjaamoOsoite[];
}

function JatkoKuulutuksetTiedotForm({ projekti, kirjaamoOsoitteet, setIsDirty }: KuulutuksenTiedotFormProps & Props) {
  const pdfFormRef = React.useRef<React.ElementRef<typeof PdfPreviewForm>>(null);

  const defaultValues: KuulutuksenTiedotFormValues = useMemo(() => {
    const yhteysTiedot: YhteystietoInput[] =
      projekti?.jatkoPaatos1Vaihe?.kuulutusYhteystiedot?.yhteysTiedot?.map((yt) => removeTypeName(yt)) || [];

    const yhteysHenkilot: string[] = projekti?.jatkoPaatos1Vaihe?.kuulutusYhteystiedot?.yhteysHenkilot || [];

    const formValues: KuulutuksenTiedotFormValues = {
      oid: projekti.oid,
      jatkoPaatos1Vaihe: {
        kuulutusPaiva: projekti?.jatkoPaatos1Vaihe?.kuulutusPaiva || null,
        kuulutusVaihePaattyyPaiva: projekti?.jatkoPaatos1Vaihe?.kuulutusVaihePaattyyPaiva || null,
        hallintoOikeus: projekti?.jatkoPaatos1Vaihe?.hallintoOikeus || "",
        kuulutusYhteystiedot: {
          yhteysTiedot,
          yhteysHenkilot,
        },
        ilmoituksenVastaanottajat: defaultVastaanottajat(
          projekti,
          projekti.jatkoPaatos1Vaihe?.ilmoituksenVastaanottajat,
          kirjaamoOsoitteet
        ),
        viimeinenVoimassaolovuosi: projekti?.jatkoPaatos1Vaihe?.viimeinenVoimassaolovuosi || "",
      },
    };
    return formValues;
  }, [projekti, kirjaamoOsoitteet]);

  const formOptions: UseFormProps<KuulutuksenTiedotFormValues> = {
    resolver: yupResolver(jatkopaatos1KuulutusSchema, { abortEarly: false, recursive: true }),
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

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  useLeaveConfirm(isDirty);

  const voiMuokata = !projekti?.jatkoPaatos1VaiheJulkaisut || projekti.jatkoPaatos1VaiheJulkaisut.length < 1;

  return (
    <>
      {projekti.jatkoPaatos1Vaihe?.palautusSyy && (
        <Notification type={NotificationType.WARN}>
          {"Hyväksymisvaihejulkaisu on palautettu korjattavaksi. Palautuksen syy: " + projekti.jatkoPaatos1Vaihe.palautusSyy}
        </Notification>
      )}

      {voiMuokata && (
        <>
          <FormProvider {...useFormReturn}>
            <form>
              <fieldset disabled={!isAllowedOnRoute || !projekti.nykyinenKayttaja.omaaMuokkausOikeuden}>
                <KuulutusJaJulkaisuPaiva />
                <PaatoksenPaiva paatos={projekti.kasittelynTila?.ensimmainenJatkopaatos} projektiOid={projekti.oid} />
                <Voimassaolovuosi />
                <MuutoksenHaku />
                <KuulutuksessaEsitettavatYhteystiedot />
                <IlmoituksenVastaanottajatKomponentti projekti={projekti} />

                {pdfFormRef.current?.esikatselePdf && (
                  <KuulutuksenJaIlmoituksenEsikatselu esikatselePdf={pdfFormRef.current?.esikatselePdf} />
                )}
                <JatkoPaatos1KuulutusPainikkeet projekti={projekti} />
              </fieldset>
            </form>
          </FormProvider>
        </>
      )}
      {!voiMuokata && projekti && projekti.jatkoPaatos1VaiheJulkaisut?.[projekti.jatkoPaatos1VaiheJulkaisut.length - 1] && (
        <>
          <FormProvider {...useFormReturn}>
            <form>
              <Lukunakyma
                projekti={projekti}
                jatkoPaatos1VaiheJulkaisu={projekti.jatkoPaatos1VaiheJulkaisut[projekti.jatkoPaatos1VaiheJulkaisut.length - 1]}
              />
              <JatkoPaatos1KuulutusPainikkeet projekti={projekti} />
            </form>
          </FormProvider>
        </>
      )}
      <PdfPreviewForm ref={pdfFormRef} />
    </>
  );
}
