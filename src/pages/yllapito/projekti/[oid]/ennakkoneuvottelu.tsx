import Button from "@components/button/Button";
import ExtLink from "@components/ExtLink";
import { H2, H3, H4 } from "@components/Headings";
import {
  adaptAineistotNewToInput,
  adaptKunnallinenLadattuTiedostoToInput,
  adaptLadatutTiedostotNewToInput,
  adaptSuunnitelmaAineistot,
  FormMuistutukset,
} from "@components/HyvaksymisEsitys/hyvaksymisEsitysFormUtil";
import { IlmoituksenVastaanottajatTable } from "@components/HyvaksymisEsitys/HyvaksymisEsitysLukutila";
import AineistonEsikatselu from "@components/HyvaksymisEsitys/LomakeComponents/AineistonEsikatselu";
import KuulutuksetJaKutsu from "@components/HyvaksymisEsitys/LomakeComponents/KuulutuksetJaKutsu";
import Lausunnot from "@components/HyvaksymisEsitys/LomakeComponents/Lausunnot";
import LinkinVoimassaoloaika from "@components/HyvaksymisEsitys/LomakeComponents/LinkinVoimassaoloaika";
import Maanomistajaluettelo from "@components/HyvaksymisEsitys/LomakeComponents/MaanomistajaLuettelo";
import Muistutukset from "@components/HyvaksymisEsitys/LomakeComponents/Muistutukset";
import MuuAineistoKoneelta from "@components/HyvaksymisEsitys/LomakeComponents/MuuAineistoKoneelta";
import MuuAineistoVelhosta from "@components/HyvaksymisEsitys/LomakeComponents/MuuAineistoVelhosta";
import Suunnitelma from "@components/HyvaksymisEsitys/LomakeComponents/Suunnitelma";
import Vastaanottajat from "@components/HyvaksymisEsitys/LomakeComponents/Vastaanottajat";
import ViestiVastaanottajalle from "@components/HyvaksymisEsitys/LomakeComponents/ViestiVastaanottajalle";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import Notification, { NotificationType } from "@components/notification/Notification";
import { FormAineistoNew } from "@components/projekti/common/Aineistot/util";
import { OhjelistaNotification } from "@components/projekti/common/OhjelistaNotification";
import ProjektiPageLayout, { ProjektiPageLayoutContext } from "@components/projekti/ProjektiPageLayout";
import { yupResolver } from "@hookform/resolvers/yup";
import { Stack } from "@mui/system";
import { AineistoInputNew, EnnakkoNeuvottelu, EnnakkoNeuvotteluInput, Projekti, TallennaEnnakkoNeuvotteluInput } from "@services/api";
import { AineistoKategoriat, getAineistoKategoriat, kategorisoimattomatId } from "common/aineistoKategoriat";
import { TestType } from "common/schema/common";
import { ennakkoNeuvotteluSchema, EnnakkoneuvotteluValidationContext } from "common/schema/ennakkoNeuvotteluSchema";
import { formatDate } from "common/util/dateUtils";
import { ReactElement, useCallback, useEffect, useMemo } from "react";
import { FormProvider, SubmitHandler, useForm, useFormContext, UseFormProps } from "react-hook-form";
import useApi from "src/hooks/useApi";
import { useCheckAineistoValmiit } from "src/hooks/useCheckAineistoValmiit";
import { useHandleSubmitContext } from "src/hooks/useHandleSubmit";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import useValidationMode from "src/hooks/useValidationMode";

export type EnnakkoneuvotteluForm = {
  oid: string;
  versio: number;
  ennakkoNeuvottelu: Omit<EnnakkoNeuvotteluInput, "muistutukset" | "suunnitelma"> & {
    muistutukset: FormMuistutukset;
    suunnitelma: { [key: string]: FormAineistoNew[] };
  };
};

export function getDefaultValuesForForm(projekti: Projekti | null | undefined): EnnakkoneuvotteluForm {
  if (!projekti) {
    return {
      ennakkoNeuvottelu: { muistutukset: {}, suunnitelma: {} },
      oid: "",
      versio: 1,
    };
  }
  const { oid, versio, ennakkoNeuvottelu, velho } = projekti;
  const {
    poistumisPaiva,
    lisatiedot,
    suunnitelma,
    muistutukset,
    lausunnot,
    kuulutuksetJaKutsu,
    muuAineistoVelhosta,
    muuAineistoKoneelta,
    maanomistajaluettelo,
    vastaanottajat,
  } = ennakkoNeuvottelu ?? {};
  const muistutuksetSorted =
    velho.kunnat?.reduce((acc, kunta) => {
      acc[kunta] = [];
      return acc;
    }, {} as FormMuistutukset) ?? {};
  muistutukset?.forEach((muistutus) => {
    muistutuksetSorted[muistutus.kunta]?.push(adaptKunnallinenLadattuTiedostoToInput(muistutus));
  });
  return {
    oid,
    versio,
    ennakkoNeuvottelu: {
      poistumisPaiva: poistumisPaiva ?? null,
      lisatiedot: lisatiedot ?? "",
      suunnitelma: adaptSuunnitelmaAineistot(suunnitelma, velho.tyyppi),
      muistutukset: muistutuksetSorted,
      lausunnot: adaptLadatutTiedostotNewToInput(lausunnot),
      kuulutuksetJaKutsu: adaptLadatutTiedostotNewToInput(kuulutuksetJaKutsu),
      muuAineistoVelhosta: adaptAineistotNewToInput(muuAineistoVelhosta),
      muuAineistoKoneelta: adaptLadatutTiedostotNewToInput(muuAineistoKoneelta),
      maanomistajaluettelo: adaptLadatutTiedostotNewToInput(maanomistajaluettelo),
      vastaanottajat: vastaanottajat?.length
        ? vastaanottajat.map(({ sahkoposti }) => ({ sahkoposti }))
        : [{ sahkoposti: "kirjaamo@traficom.fi" }],
    },
  };
}

export default function EnnakkoNeuvotteluLomake(): ReactElement {
  const { data: projekti } = useProjekti();
  const defaultValues: EnnakkoneuvotteluForm = useMemo(() => getDefaultValuesForForm(projekti), [projekti]);
  const validationMode = useValidationMode();
  const formOptions: UseFormProps<EnnakkoneuvotteluForm, EnnakkoneuvotteluValidationContext> = {
    resolver: yupResolver(ennakkoNeuvotteluSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
    context: { validationMode, testType: TestType.FRONTEND },
  };
  const useFormReturn = useForm<EnnakkoneuvotteluForm, EnnakkoneuvotteluValidationContext>(formOptions);
  useEffect(() => {
    useFormReturn.reset(defaultValues);
  }, [useFormReturn, defaultValues]);
  const aineistoKategoriat = useMemo(
    () =>
      getAineistoKategoriat({
        projektiTyyppi: projekti?.velho.tyyppi,
        showKategorisoimattomat: true,
        hideDeprecated: true,
      }),
    [projekti?.velho.tyyppi]
  );
  if (!projekti) {
    return <></>;
  }
  const url = `${window?.location?.protocol}//${window?.location?.host}/suunnitelma/${projekti.oid}/ennakkoneuvotteluaineistot?hash=${projekti.ennakkoNeuvotteluJulkaisu?.hash}`;
  return (
    <ProjektiPageLayout title="Ennakkoneuvottelu" showInfo>
      {projekti.ennakkoNeuvotteluJulkaisu && (
        <Section noDivider className="mb-2">
          <Notification type={NotificationType.INFO_GREEN}>
            Ennakkoneuvottelu on lähetetty vastaanottajalle {formatDate(projekti.ennakkoNeuvotteluJulkaisu.lahetetty)}:{" "}
            <ExtLink href={url}>{url}</ExtLink>
          </Notification>
        </Section>
      )}
      <ProjektiPageLayoutContext.Consumer>
        {({ ohjeetOnClose, ohjeetOpen }) => (
          <FormProvider {...useFormReturn}>
            <form>
              <Section>
                <OhjelistaNotification onClose={ohjeetOnClose} open={ohjeetOpen}>
                  <li>
                    Tällä sivulla luodaan ennakkoneuvotteluun lähetettävän suunnitelman aineiston sisältö ja määritellään sen
                    vastaanottajat. Järjestelmä luo ja lähettää vastaanottajille automaattisesti sähköpostiviestin, jonka linkkistä pääsee
                    tarkastelemaan ennakkoneuvotteluun lähetettävän suunnitelman sisällön.
                  </li>
                  <li>
                    Anna ennakkoneuvotteluun toimitettavalle suunnitelmalle voimassaoloaika. Voimassaoloaika tarkoittaa sitä, että
                    vastaanottajan on mahdollista tarkastella toimitettavan linkin sisältöä kyseiseen päivämäärään saakka. Linkin
                    voimassaoloaikaa on mahdollista muuttaa jälkikäteen.
                  </li>
                  <li>Halutessasi voit kirjata ennakkoneuvottelusta lisätietoa vastaanottajalle.</li>
                  <li>
                    Tuo suunnitelma Projektivelhosta ja vuorovaikutusaineistot omalta koneelta. Järjestelmä listaa automaattisesti
                    kuulutukset ja kutsun vuorovaikutukseen sekä maanomistajaluettelon ennakkoneuvotteluun. Voit haluessasi tuoda myös muuta
                    aineistoa.
                  </li>
                  <li>Lisää ennakkoneuvotteluun lähetettävälle aineistolle vastaanottajat.</li>
                  <li>Ennakkoneuvotteluun lähetettävän aineiston sisältöä on mahdollista päivittää suunnitelman lähettämisen jälkeen.</li>
                </OhjelistaNotification>
                <H3 variant="h2">Ennakkoneuvotteluun toimitettava suunnitelma</H3>
                <LinkinVoimassaoloaika ennakkoneuvottelu={true} />
              </Section>
              <Section>
                <ViestiVastaanottajalle ennakkoneuvottelu={true} />
              </Section>
              <Section>
                <H3 variant="h2">Ennakkoneuvotteluun liitettävä aineisto</H3>
                <Suunnitelma aineistoKategoriat={aineistoKategoriat} ennakkoneuvottelu={true} />
                <H4 variant="h3">Vuorovaikutus</H4>
                <p>Tuo omalta koneelta suunnitelmalle annetut muistutukset, lausunnot ja maanomistajaluettelo.</p>
                <Muistutukset
                  kunnat={projekti.velho.kunnat}
                  tiedostot={projekti.ennakkoNeuvottelu?.muistutukset}
                  ennakkoneuvottelu={true}
                />
                <Lausunnot tiedostot={projekti.ennakkoNeuvottelu?.lausunnot} ennakkoneuvottelu={true} />
                <Maanomistajaluettelo
                  tuodut={projekti.ennakkoNeuvottelu?.tuodutTiedostot.maanomistajaluettelo}
                  tiedostot={projekti.ennakkoNeuvottelu?.maanomistajaluettelo}
                  ennakkoneuvottelu={true}
                />
                <KuulutuksetJaKutsu
                  tiedostot={projekti.ennakkoNeuvottelu?.kuulutuksetJaKutsu}
                  tuodut={projekti.ennakkoNeuvottelu?.tuodutTiedostot.kuulutuksetJaKutsu}
                  ennakkoneuvottelu={true}
                />
                <H4 variant="h3">Muu tekninen aineisto</H4>
                <p>
                  Voit halutessasi liittää ennakkoneuvotteluun muuta täydentävää teknistä aineistoa Projektivelhosta tai omalta koneelta.
                </p>
                <MuuAineistoVelhosta aineisto={projekti.ennakkoNeuvottelu?.muuAineistoVelhosta} ennakkoneuvottelu={true} />
                <MuuAineistoKoneelta tiedostot={projekti.ennakkoNeuvottelu?.muuAineistoKoneelta} ennakkoneuvottelu={true} />
              </Section>
              <Section>
                <Vastaanottajat ennakkoneuvottelu={true} />
              </Section>
              {projekti.ennakkoNeuvotteluJulkaisu && (
                <Section>
                  <H2>Ennakkoneuvottelun vastaanottajat</H2>
                  {projekti.ennakkoNeuvotteluJulkaisu.vastaanottajat && (
                    <SectionContent>
                      <IlmoituksenVastaanottajatTable vastaanottajat={projekti.ennakkoNeuvotteluJulkaisu.vastaanottajat} />
                    </SectionContent>
                  )}
                </Section>
              )}
              <Section>
                <AineistonEsikatselu ennakkoneuvottelu={true} />
              </Section>
              <MuokkausLomakePainikkeet kategoriat={aineistoKategoriat} projekti={projekti} />
            </form>
          </FormProvider>
        )}
      </ProjektiPageLayoutContext.Consumer>
    </ProjektiPageLayout>
  );
}

export function transformToInput(formData: EnnakkoneuvotteluForm, laheta: boolean): TallennaEnnakkoNeuvotteluInput {
  const muistutukset = Object.values(formData.ennakkoNeuvottelu.muistutukset).flat();
  const suunnitelma = Object.values(formData.ennakkoNeuvottelu.suunnitelma)
    .flat()
    .map<AineistoInputNew>(({ dokumenttiOid, nimi, uuid, kategoriaId }) => ({ dokumenttiOid, nimi, uuid, kategoriaId }));
  const muuAineistoVelhosta = formData.ennakkoNeuvottelu.muuAineistoVelhosta?.map<AineistoInputNew>(
    ({ dokumenttiOid, nimi, uuid, kategoriaId }) => ({ dokumenttiOid, nimi, uuid, kategoriaId })
  );
  return {
    ...formData,
    laheta,
    ennakkoNeuvottelu: {
      ...formData.ennakkoNeuvottelu,
      suunnitelma,
      muistutukset,
      muuAineistoVelhosta,
    },
  };
}

type PainikkeetProps = {
  projekti: Projekti;
  kategoriat: AineistoKategoriat;
};

function MuokkausLomakePainikkeet({ projekti, kategoriat }: Readonly<PainikkeetProps>) {
  const { showSuccessMessage } = useSnackbars();
  const {
    formState: { isDirty, isSubmitting },
    watch,
  } = useFormContext<EnnakkoneuvotteluForm>();

  const suunnitelma = watch("ennakkoNeuvottelu.suunnitelma");
  const muuAineistoVelhosta = watch("ennakkoNeuvottelu.muuAineistoVelhosta");

  const { mutate: reloadProjekti } = useProjekti();

  const { withLoadingSpinner } = useLoadingSpinner();
  const { handleDraftSubmit, handleSubmit } = useHandleSubmitContext<EnnakkoneuvotteluForm>();
  const checkAineistoValmiit = useCheckAineistoValmiit(projekti.oid);

  const api = useApi();

  const saveDraft: SubmitHandler<EnnakkoneuvotteluForm> = useCallback(
    (formData) =>
      withLoadingSpinner(
        (async () => {
          try {
            const convertedFormData = transformToInput(formData, false);
            console.log(convertedFormData);
            await api.tallennaEnnakkoNeuvottelu(convertedFormData);
            await checkAineistoValmiit({ retries: 5 });
            await reloadProjekti();
            showSuccessMessage("Tallennus onnistui");
          } catch (e) {}
        })()
      ),
    [api, checkAineistoValmiit, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

  useLeaveConfirm(!isSubmitting && isDirty);

  const laheta: SubmitHandler<EnnakkoneuvotteluForm> = useCallback(
    (formData) =>
      withLoadingSpinner(
        (async () => {
          try {
            const convertedFormData = transformToInput(formData, true);
            console.log(convertedFormData);
            await api.tallennaEnnakkoNeuvottelu(convertedFormData);
            showSuccessMessage("Tallennus ja lähettäminen onnistui");
            reloadProjekti();
          } catch (error) {}
        })()
      ),
    [api, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

  return (
    <Section noDivider>
      <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
        <Button id="save_draft" type="button" onClick={handleDraftSubmit(saveDraft)}>
          Tallenna Luonnos
        </Button>
        <Button
          type="button"
          disabled={lomakkeenAineistotEiKunnossa(suunnitelma, projekti.ennakkoNeuvottelu, muuAineistoVelhosta, kategoriat)}
          id="save_and_send_for_acceptance"
          primary
          onClick={handleSubmit(laheta)}
        >
          {projekti.ennakkoNeuvotteluJulkaisu ? "Lähetä päivitys" : "Lähetä"}
        </Button>
      </Stack>
    </Section>
  );
}

function lomakkeenAineistotEiKunnossa(
  suunnitelma: { [key: string]: FormAineistoNew[] },
  ennakkoneuvottelu: EnnakkoNeuvottelu | undefined | null,
  muuAineistoVelhosta: AineistoInputNew[] | null | undefined,
  aineistoKategoriat: AineistoKategoriat
): boolean {
  const lomakkeenSuunnitelmaAineistoFlat = Object.values(suunnitelma).flat();
  const uusiSuunnitelmaAineisto = lomakkeenSuunnitelmaAineistoFlat?.some(
    (aineisto) => !ennakkoneuvottelu?.suunnitelma?.some((a) => a.uuid === aineisto.uuid)
  );
  const uusiMuuAineistoVelhosta = !!muuAineistoVelhosta?.some(
    (aineisto) => !ennakkoneuvottelu?.muuAineistoVelhosta?.some((a) => a.uuid === aineisto.uuid)
  );
  const suunnitelmaAineistojaTuomatta = !!ennakkoneuvottelu?.suunnitelma?.some((aineisto) => !aineisto.tuotu);
  const suunnitelmaAineistoKategorisoimatta = lomakkeenSuunnitelmaAineistoFlat?.some(
    (aineisto) =>
      !aineisto.kategoriaId ||
      aineisto.kategoriaId === kategorisoimattomatId ||
      !aineistoKategoriat.listKategoriaIds().includes(aineisto.kategoriaId)
  );
  const velhoAineistojaTuomatta = !!ennakkoneuvottelu?.muuAineistoVelhosta?.some((aineisto) => !aineisto.tuotu);
  return (
    uusiSuunnitelmaAineisto ||
    uusiMuuAineistoVelhosta ||
    suunnitelmaAineistojaTuomatta ||
    velhoAineistojaTuomatta ||
    suunnitelmaAineistoKategorisoimatta
  );
}
