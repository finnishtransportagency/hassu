import Button from "@components/button/Button";
import { H3, H4 } from "@components/Headings";
import {
  adaptAineistotNewToInput,
  adaptKunnallinenLadattuTiedostoToInput,
  adaptLadatutTiedostotNewToInput,
  adaptSuunnitelmaAineistot,
  FormMuistutukset,
} from "@components/HyvaksymisEsitys/hyvaksymisEsitysFormUtil";
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
import { FormAineistoNew } from "@components/projekti/common/Aineistot/util";
import { OhjelistaNotification } from "@components/projekti/common/OhjelistaNotification";
import ProjektiPageLayout, { ProjektiPageLayoutContext } from "@components/projekti/ProjektiPageLayout";
import { yupResolver } from "@hookform/resolvers/yup";
import { Stack } from "@mui/system";
import {
  AineistoInputNew,
  EnnakkoNeuvottelu,
  EnnakkoNeuvotteluInput,
  Projekti,
  ProjektiTyyppi,
  TallennaEnnakkoNeuvotteluInput,
} from "@services/api";
import { AineistoKategoriat, getAineistoKategoriat, kategorisoimattomatId } from "common/aineistoKategoriat";
import { ProjektiLisatiedolla, ValidationModeState } from "common/ProjektiValidationContext";
import {
  getAineistotNewSchema,
  getLadatutTiedostotNewSchema,
  isTestTypeBackend,
  isValidationModePublish,
  TestType,
} from "common/schema/common";
import { notInPastCheck, paivamaara } from "common/schema/paivamaaraSchema";
import { mapValues } from "lodash";
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
import * as Yup from "yup";
import { ObjectShape, OptionalObjectSchema, AnyObject, TypeOfShape } from "yup/lib/object";

export type EnnakkoneuvotteluForm = {
  oid: string;
  versio: number;
  ennakkoNeuvottelu: Omit<EnnakkoNeuvotteluInput, "muistutukset" | "suunnitelma"> & {
    muistutukset: FormMuistutukset;
    suunnitelma: { [key: string]: FormAineistoNew[] };
  };
};

export type EnnakkoneuvotteluValidationContext = {
  validationMode: ValidationModeState;
  testType: TestType;
};

const getKunnallinenLadattuTiedostoSchema = () =>
  Yup.object().shape({
    tiedosto: Yup.string().nullable(),
    nimi: Yup.string().required(),
    uuid: Yup.string().required(),
    kunta: Yup.number().integer().required(),
  });

const getKunnallinenLadatutTiedostotSchema = () => Yup.array().of(getKunnallinenLadattuTiedostoSchema()).nullable();

export const ennakkoNeuvotteluSchema = Yup.object().shape({
  oid: Yup.string().required(),
  versio: Yup.number().integer().required(),
  ennakkoNeuvottelu: Yup.object()
    .shape({
      poistumisPaiva: paivamaara()
        .defined()
        .when("$validationMode", {
          is: isValidationModePublish,
          then: (schema) =>
            schema.required("Päivämäärä on pakollinen").test("not-in-past", "Päivämäärää ei voi asettaa menneisyyteen", notInPastCheck),
        }),
      lisatiedot: Yup.string().defined(),
      kuulutuksetJaKutsu: getLadatutTiedostotNewSchema().defined(),
      lausunnot: getLadatutTiedostotNewSchema().defined(),
      maanomistajaluettelo: getLadatutTiedostotNewSchema().defined(),
      muuAineistoKoneelta: getLadatutTiedostotNewSchema().defined(),
      muuAineistoVelhosta: getAineistotNewSchema(false).defined(),
      vastaanottajat: Yup.array()
        .of(
          Yup.object()
            .shape({
              sahkoposti: Yup.string()
                .defined("Sähköposti on annettava")
                .when("$validationMode", {
                  is: isValidationModePublish,
                  then: (schema) => schema.email("Virheellinen sähköpostiosoite").required("Sähköposti on pakollinen"),
                }),
            })
            .required()
        )
        .min(1)
        .defined(),
    })
    .when(
      ["$testType", "$projekti"],
      (
        [testType, projekti]: [testType: TestType, projekti: ProjektiLisatiedolla],
        schema: OptionalObjectSchema<ObjectShape, AnyObject, TypeOfShape<ObjectShape>>
      ) =>
        testType === TestType.FRONTEND
          ? Yup.object().shape({
              muistutukset: Yup.lazy((obj) => Yup.object(mapValues(obj, () => getKunnallinenLadatutTiedostotSchema().defined()))),
              suunnitelma: suunnitelmaFrontendSchema(projekti.velho.tyyppi),
            })
          : schema
    )
    .when("$testType", {
      is: isTestTypeBackend,
      then: Yup.object().shape({
        muistutukset: getKunnallinenLadatutTiedostotSchema().defined(),
        suunnitelma: getAineistotNewSchema(true).defined(),
      }),
    }),
});

function suunnitelmaFrontendSchema(projektiTyyppi: ProjektiTyyppi | null | undefined) {
  const kategorioittenSchema = getAineistoKategoriat({ projektiTyyppi, showKategorisoimattomat: true })
    .listKategoriaIds()
    .reduce<ObjectShape>((obj, id) => {
      obj[id] = getAineistotNewSchema(true).defined();
      return obj;
    }, {});
  return Yup.object().shape(kategorioittenSchema);
}

export function getDefaultValuesForForm(projekti: Projekti): EnnakkoneuvotteluForm {
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
  const ennakkoNeuvottelu: EnnakkoNeuvottelu = {
    __typename: "EnnakkoNeuvottelu",
    tuodutTiedostot: { __typename: "HyvaksymisEsityksenTuodutTiedostot" },
    hash: "",
    suunnitelma: [],
  };
  const projekti: Projekti = {
    __typename: "Projekti",
    asianhallinta: { __typename: "Asianhallinta", aktivoitavissa: true, inaktiivinen: false },
    oid: "1.2.3",
    velho: {
      __typename: "Velho",
      tyyppi: ProjektiTyyppi.TIE,
      kunnat: [91],
    },
    versio: 1,
    ennakkoNeuvottelu,
  };
  const defaultValues: EnnakkoneuvotteluForm = useMemo(() => getDefaultValuesForForm(projekti), []);

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
        projektiTyyppi: projekti.velho.tyyppi,
        showKategorisoimattomat: true,
        hideDeprecated: true,
      }),
    [projekti.velho.tyyppi]
  );

  if (!ennakkoNeuvottelu) {
    return <></>;
  }

  return (
    <ProjektiPageLayout title="Ennakkoneuvottelu" showInfo>
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
                <Muistutukset kunnat={projekti.velho.kunnat} tiedostot={ennakkoNeuvottelu.muistutukset} ennakkoneuvottelu={true} />
                <Lausunnot tiedostot={ennakkoNeuvottelu.lausunnot} ennakkoneuvottelu={true} />
                <Maanomistajaluettelo
                  tuodut={ennakkoNeuvottelu.tuodutTiedostot.maanomistajaluettelo}
                  tiedostot={ennakkoNeuvottelu.maanomistajaluettelo}
                  ennakkoneuvottelu={true}
                />
                <KuulutuksetJaKutsu
                  tiedostot={ennakkoNeuvottelu.kuulutuksetJaKutsu}
                  tuodut={ennakkoNeuvottelu.tuodutTiedostot.kuulutuksetJaKutsu}
                  ennakkoneuvottelu={true}
                />
                <H4 variant="h3">Muu tekninen aineisto</H4>
                <p>
                  Voit halutessasi liittää ennakkoneuvotteluun muuta täydentävää teknistä aineistoa Projektivelhosta tai omalta koneelta.
                </p>
                <MuuAineistoVelhosta aineisto={ennakkoNeuvottelu.muuAineistoVelhosta} ennakkoneuvottelu={true} />
                <MuuAineistoKoneelta tiedostot={ennakkoNeuvottelu.muuAineistoKoneelta} ennakkoneuvottelu={true} />
              </Section>
              <Section>
                <Vastaanottajat ennakkoneuvottelu={true} />
              </Section>
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

function transformToInput(formData: EnnakkoneuvotteluForm): TallennaEnnakkoNeuvotteluInput {
  const muistutukset = Object.values(formData.ennakkoNeuvottelu.muistutukset).flat();
  const suunnitelma = Object.values(formData.ennakkoNeuvottelu.suunnitelma)
    .flat()
    .map<AineistoInputNew>(({ dokumenttiOid, nimi, uuid, kategoriaId }) => ({ dokumenttiOid, nimi, uuid, kategoriaId }));
  const muuAineistoVelhosta = formData.ennakkoNeuvottelu.muuAineistoVelhosta?.map<AineistoInputNew>(
    ({ dokumenttiOid, nimi, uuid, kategoriaId }) => ({ dokumenttiOid, nimi, uuid, kategoriaId })
  );
  return {
    ...formData,
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
            const convertedFormData = transformToInput(formData);
            //await api.tallennaHyvaksymisEsitys(convertedFormData);
            //await checkAineistoValmiit({ retries: 5 });
            //await reloadProjekti();
            console.log(convertedFormData);
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
            const convertedFormData = transformToInput(formData);
            //await api.tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi(convertedFormData);
            showSuccessMessage("Tallennus ja hyväksyttäväksi lähettäminen onnistui");
            //reloadProjekti();
            console.log(convertedFormData);
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
          Lähetä
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
