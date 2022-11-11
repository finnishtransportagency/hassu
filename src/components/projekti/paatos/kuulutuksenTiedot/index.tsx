import { yupResolver } from "@hookform/resolvers/yup";
import { HyvaksymisPaatosVaiheInput, KirjaamoOsoite, TallennaProjektiInput, YhteystietoInput } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import React, { ReactElement, useMemo } from "react";
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
import { removeTypeName } from "src/util/removeTypeName";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import PdfPreviewForm from "@components/projekti/PdfPreviewForm";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import useIsAllowedOnCurrentProjektiRoute from "src/hooks/useIsOnAllowedProjektiRoute";
import PaatoksenPaiva from "@components/projekti/paatos/kuulutuksenTiedot/PaatoksenPaiva";
import { getPaatosSpecificData, paatosIsJatkopaatos, PaatosTyyppi } from "src/util/getPaatosSpecificData";
import Voimassaolovuosi from "./Voimassaolovuosi";

type paatosInputValues = Omit<HyvaksymisPaatosVaiheInput, "hallintoOikeus"> & {
  hallintoOikeus: HyvaksymisPaatosVaiheInput["hallintoOikeus"] | "";
};

export type KuulutuksenTiedotFormValues = Pick<TallennaProjektiInput, "oid"> & {
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

  const { julkaisematonPaatos, viimeisinJulkaisu, kasittelyntilaData, julkaisut } = useMemo(
    () => getPaatosSpecificData(projekti, paatosTyyppi),
    [paatosTyyppi, projekti]
  );

  const defaultValues: KuulutuksenTiedotFormValues = useMemo(() => {
    const yhteysTiedot: YhteystietoInput[] =
      projekti?.hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.yhteysTiedot?.map((yt) => removeTypeName(yt)) || [];

    const yhteysHenkilot: string[] = projekti?.hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.yhteysHenkilot || [];

    const formValues: KuulutuksenTiedotFormValues = {
      oid: projekti.oid,
      paatos: {
        kuulutusPaiva: julkaisematonPaatos?.kuulutusPaiva || null,
        kuulutusVaihePaattyyPaiva: julkaisematonPaatos?.kuulutusVaihePaattyyPaiva || null,
        hallintoOikeus: julkaisematonPaatos?.hallintoOikeus || "",
        kuulutusYhteystiedot: {
          yhteysTiedot,
          yhteysHenkilot,
        },
        ilmoituksenVastaanottajat: defaultVastaanottajat(projekti, julkaisematonPaatos?.ilmoituksenVastaanottajat, kirjaamoOsoitteet),
      },
    };
    return formValues;
  }, [projekti, julkaisematonPaatos, kirjaamoOsoitteet]);

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

  const voiMuokata = !julkaisut?.length;

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
                <PaatoksenPaiva paatosTyyppi={paatosTyyppi} paatos={kasittelyntilaData} projektiOid={projekti.oid} />
                {paatosIsJatkopaatos(paatosTyyppi) && <Voimassaolovuosi />}
                <MuutoksenHaku />
                <KuulutuksessaEsitettavatYhteystiedot
                  projekti={projekti}
                  julkaisut={julkaisut}
                  paatosTyyppi={paatosTyyppi}
                  julkaisematonPaatos={julkaisematonPaatos}
                />
                <IlmoituksenVastaanottajatKomponentti paatosVaihe={julkaisematonPaatos} />

                {pdfFormRef.current?.esikatselePdf && (
                  <KuulutuksenJaIlmoituksenEsikatselu paatosTyyppi={paatosTyyppi} esikatselePdf={pdfFormRef.current?.esikatselePdf} />
                )}
                <Painikkeet paatosTyyppi={paatosTyyppi} projekti={projekti} julkaisut={julkaisut} />
              </fieldset>
            </form>
          </FormProvider>
        </>
      )}
      {!voiMuokata && projekti && viimeisinJulkaisu && (
        <>
          <FormProvider {...useFormReturn}>
            <form>
              <Lukunakyma projekti={projekti} paatosTyyppi={paatosTyyppi} julkaisu={viimeisinJulkaisu} />
              <Painikkeet paatosTyyppi={paatosTyyppi} projekti={projekti} julkaisut={julkaisut} />
            </form>
          </FormProvider>
        </>
      )}
      <PdfPreviewForm ref={pdfFormRef} />
    </>
  );
}
