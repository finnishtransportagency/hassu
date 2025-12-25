import Button from "@components/button/Button";
import ExtLink from "@components/ExtLink";
import HassuDialog from "@components/HassuDialog";
import { H2, H3, H4 } from "@components/Headings";
import {
  adaptAineistotNewToInput,
  adaptKunnallinenLadattuTiedostoToInput,
  adaptLadatutTiedostotNewToInput,
  adaptLinkitetynProjektinAineistot,
  adaptSuunnitelmaAineistot,
  EnnakkoneuvotteluForm,
  FormMuistutukset,
  transformToInput,
} from "@components/HyvaksymisEsitys/hyvaksymisEsitysFormUtil";
import { IlmoituksenVastaanottajatTable } from "@components/HyvaksymisEsitys/HyvaksymisEsitysLukutila";
import AineistonEsikatselu from "@components/HyvaksymisEsitys/LomakeComponents/AineistonEsikatselu";
import HyvaksymisEsitysTiedosto from "@components/HyvaksymisEsitys/LomakeComponents/HyvaksymisEsitysTiedosto";
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
import { DialogActions, DialogContent } from "@mui/material";
import { Stack } from "@mui/system";
import { AineistoInputNew, EnnakkoNeuvottelu, Projekti } from "@services/api";
import { AineistoKategoriat, getAineistoKategoriat, kategorisoimattomatId } from "common/aineistoKategoriat";
import { TestType } from "common/schema/common";
import { ennakkoNeuvotteluSchema, EnnakkoneuvotteluValidationContext } from "common/schema/ennakkoNeuvotteluSchema";
import { formatDate } from "common/util/dateUtils";
import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { FormProvider, SubmitHandler, useForm, useFormContext, UseFormProps } from "react-hook-form";
import useApi from "src/hooks/useApi";
import { useCheckAineistoValmiit } from "src/hooks/useCheckAineistoValmiit";
import { useHandleSubmitContext } from "src/hooks/useHandleSubmit";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import useValidationMode from "src/hooks/useValidationMode";
import EnnakkoneuvotteluLukutila from "@components/projekti/ennakkoneuvottelu/EnnakkoneuvotteluLukutila";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import LinkitetynProjektinAineisto from "@components/HyvaksymisEsitys/LomakeComponents/LinkitetynProjektinAineisto";

export function getDefaultValuesForForm(projekti: Projekti | null | undefined): EnnakkoneuvotteluForm {
  if (!projekti) {
    return {
      ennakkoNeuvottelu: { muistutukset: {}, suunnitelma: {}, linkitetynProjektinAineisto: {} },
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
    poisValitutKuulutuksetJaKutsu,
    poisValitutMaanomistajaluettelot,
    muuAineistoVelhosta,
    muuAineistoKoneelta,
    linkitetynProjektinAineisto,
    maanomistajaluettelo,
    vastaanottajat,
    hyvaksymisEsitys,
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
      hyvaksymisEsitys: adaptLadatutTiedostotNewToInput(hyvaksymisEsitys),
      suunnitelma: adaptSuunnitelmaAineistot(suunnitelma, velho.tyyppi),
      muistutukset: muistutuksetSorted,
      lausunnot: adaptLadatutTiedostotNewToInput(lausunnot),
      kuulutuksetJaKutsu: adaptLadatutTiedostotNewToInput(kuulutuksetJaKutsu),
      poisValitutKuulutuksetJaKutsu: poisValitutKuulutuksetJaKutsu,
      poisValitutMaanomistajaluettelot: poisValitutMaanomistajaluettelot,
      muuAineistoVelhosta: adaptAineistotNewToInput(muuAineistoVelhosta),
      muuAineistoKoneelta: adaptLadatutTiedostotNewToInput(muuAineistoKoneelta),
      linkitetynProjektinAineisto: adaptLinkitetynProjektinAineistot(linkitetynProjektinAineisto, velho.tyyppi),
      maanomistajaluettelo: adaptLadatutTiedostotNewToInput(maanomistajaluettelo),
      vastaanottajat: vastaanottajat?.length ? vastaanottajat.map(({ sahkoposti }) => ({ sahkoposti })) : [{ sahkoposti: "" }],
    },
  };
}

export default function EnnakkoNeuvotteluPage(): ReactElement {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  if (!projekti) {
    return <></>;
  }

  if (projektiOnEpaaktiivinen(projekti)) {
    return <EnnakkoneuvotteluLukutila projekti={projekti} />;
  }

  return <EnnakkoNeuvotteluLomake projekti={projekti} />;
}

function EnnakkoNeuvotteluLomake({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement {
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
  const url = `${window?.location?.protocol}//${window?.location?.host}/suunnitelma/${projekti.oid}/ennakkoneuvotteluaineistot?hash=${projekti.ennakkoNeuvotteluJulkaisu?.hash}`;

  return (
    <ProjektiPageLayout title="Ennakkotarkastus/ennakkoneuvottelu" showInfo>
      {projekti.ennakkoNeuvotteluJulkaisu && (
        <Section noDivider className="mb-2">
          <Notification type={NotificationType.INFO_GREEN}>
            Aineistolinkki on lähetetty vastaanottajalle {formatDate(projekti.ennakkoNeuvotteluJulkaisu.lahetetty)}:{" "}
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
                    Tällä sivulla luodaan ennakkoneuvotteluun/ennakkotarkastukseen lähetettävän suunnitelman aineiston sisältö ja
                    määritellään sen vastaanottajat. Vaihetta voi tarvittaessa käyttää myös suunnitelma-aineiston jakoon hyväksymisesityksen
                    allekirjoittajalle.
                  </li>
                  <li>
                    Järjestelmä luo ja lähettää vastaanottajille automaattisesti sähköpostiviestin, jonka linkkistä pääsee tarkastelemaan
                    suunnitelman sisällön.
                  </li>
                  <li>
                    Anna luotavalle linkille voimassaoloaika. Voimassaoloaika tarkoittaa sitä, että vastaanottajan on mahdollista
                    tarkastella toimitettavan linkin sisältöä kyseiseen päivämäärään saakka. Linkin voimassaoloaikaa on mahdollista muuttaa
                    jälkikäteen.
                  </li>
                  <li>Halutessasi voit kirjata lisätietoa vastaanottajalle.</li>
                  <li>
                    Tuo suunnitelma Projektivelhosta ja vuorovaikutusaineistot omalta koneelta. Järjestelmä listaa automaattisesti
                    kuulutukset ja kutsun vuorovaikutukseen sekä maanomistajaluettelon. Voit haluessasi tuoda myös muuta aineistoa.
                  </li>
                  <li>Lisää lähetettävälle aineistolle vastaanottajat.</li>
                  <li>Aineiston sisältöä on mahdollista päivittää lähettämisen jälkeen.</li>
                </OhjelistaNotification>
                <H3 variant="h2">Aineistolinkin sisältö</H3>
                <LinkinVoimassaoloaika ennakkoneuvottelu={true} />
              </Section>
              <Section>
                <ViestiVastaanottajalle ennakkoneuvottelu={true} />
              </Section>
              <Section>
                <H3 variant="h2">Aineistolinkkiin liitettävä aineisto</H3>
                <HyvaksymisEsitysTiedosto tiedostot={projekti.ennakkoNeuvottelu?.hyvaksymisEsitys} ennakkoneuvottelu={true} />
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
                  poisValitutTiedostot={projekti.ennakkoNeuvottelu?.poisValitutMaanomistajaluettelot}
                  ennakkoneuvottelu={true}
                />
                <KuulutuksetJaKutsu
                  tiedostot={projekti.ennakkoNeuvottelu?.kuulutuksetJaKutsu}
                  tuodut={projekti.ennakkoNeuvottelu?.tuodutTiedostot.kuulutuksetJaKutsu}
                  poisValitutTiedostot={projekti.ennakkoNeuvottelu?.poisValitutKuulutuksetJaKutsu}
                  ennakkoneuvottelu={true}
                />
                <H4 variant="h3">Muu tekninen aineisto</H4>
                <p>Voit halutessasi tuoda muuta täydentävää teknistä aineistoa Projektivelhosta tai omalta koneelta.</p>
                <MuuAineistoVelhosta aineisto={projekti.ennakkoNeuvottelu?.muuAineistoVelhosta} ennakkoneuvottelu={true} />
                <MuuAineistoKoneelta tiedostot={projekti.ennakkoNeuvottelu?.muuAineistoKoneelta} ennakkoneuvottelu={true} />
                <LinkitetynProjektinAineisto aineistoKategoriat={aineistoKategoriat} ennakkoneuvottelu={true} />
              </Section>
              <Section>
                <Vastaanottajat ennakkoneuvottelu={true} />
              </Section>
              {projekti.ennakkoNeuvotteluJulkaisu && (
                <Section>
                  <H2>Vastaanottajat</H2>
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
  const [isOpen, setIsOpen] = useState(false);
  const laheta: SubmitHandler<EnnakkoneuvotteluForm> = useCallback(
    (formData) =>
      withLoadingSpinner(
        (async () => {
          try {
            setIsOpen(false);
            const convertedFormData = transformToInput(formData, true);
            await api.tallennaEnnakkoNeuvottelu(convertedFormData);
            await checkAineistoValmiit({ retries: 5 });
            reloadProjekti();
            showSuccessMessage("Tallennus ja lähettäminen onnistui");
          } catch (error) {}
        })()
      ),
    [withLoadingSpinner, api, checkAineistoValmiit, reloadProjekti, showSuccessMessage]
  );
  return (
    <>
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
            onClick={handleSubmit(
              () => {
                setIsOpen(true);
              },
              () => {
                setIsOpen(false);
              }
            )}
          >
            {projekti.ennakkoNeuvotteluJulkaisu ? "Lähetä päivitys" : "Lähetä"}
          </Button>
        </Stack>
      </Section>
      <LahetaDialog open={isOpen} onClose={() => setIsOpen(false)} laheta={laheta} />
    </>
  );
}

type DialogProps = {
  open: boolean;
  onClose: () => void;
  laheta: SubmitHandler<EnnakkoneuvotteluForm>;
};

function LahetaDialog({ open, onClose, laheta }: Readonly<DialogProps>) {
  const { watch } = useFormContext<EnnakkoneuvotteluForm>();
  const { handleSubmit } = useHandleSubmitContext<EnnakkoneuvotteluForm>();
  const vastaanottajat = watch("ennakkoNeuvottelu.vastaanottajat");
  return (
    <HassuDialog
      title={"Ennakkoneuvotteluun lähetettävän suunnitelman hyväksyminen"}
      hideCloseButton
      open={open}
      onClose={onClose}
      maxWidth={"md"}
    >
      <form style={{ display: "contents" }}>
        <DialogContent>
          <p>Olet hyväksymässä ennakkoneuvotteluun lähetettävän suunnitelman lähettämisen seuraaville tahoille:</p>
          <ul className="vayla-dialog-list">
            {vastaanottajat?.map(({ sahkoposti }) => (
              <li key={sahkoposti}>{sahkoposti}</li>
            ))}
          </ul>
          <p>Ennakkoneuvotteluun lähetettävän aineiston sisältöä pystyy vapaasti päivittämään lähetyksen jälkeen.</p>
          <p>
            Klikkaamalla Hyväksy ja lähetä -painiketta vahvistat ennakkotarkastuksen aineiston tarkastetuksi ja hyväksyt lähettämisen
            vastaanottajille.
          </p>
        </DialogContent>

        <DialogActions>
          <Button id="accept_kuulutus" primary type="button" onClick={handleSubmit(laheta, onClose)}>
            Hyväksy ja lähetä
          </Button>
          <Button type="button" onClick={onClose}>
            Peruuta
          </Button>
        </DialogActions>
      </form>
    </HassuDialog>
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
