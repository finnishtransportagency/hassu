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
import MuokkausLomakePainikkeet from "@components/HyvaksymisEsitys/LomakeComponents/MuokkausLomakePainikkeet";
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
import { HyvaksymisEsityksenTiedot, HyvaksymisEsitysInput, ProjektiTyyppi } from "@services/api";
import { getAineistoKategoriat } from "common/aineistoKategoriat";
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
import { ReactElement, useEffect, useMemo } from "react";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import useValidationMode from "src/hooks/useValidationMode";
import * as Yup from "yup";
import { ObjectShape, OptionalObjectSchema, AnyObject, TypeOfShape } from "yup/lib/object";

export type EnnakkoneuvotteluForm = {
  oid: string;
  versio: number;
  muokattavaHyvaksymisEsitys: Omit<HyvaksymisEsitysInput, "muistutukset" | "suunnitelma"> & {
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
  muokattavaHyvaksymisEsitys: Yup.object()
    .shape({
      poistumisPaiva: paivamaara()
        .defined()
        .when("$validationMode", {
          is: isValidationModePublish,
          then: (schema) =>
            schema.required("Päivämäärä on pakollinen").test("not-in-past", "Päivämäärää ei voi asettaa menneisyyteen", notInPastCheck),
        }),
      kiireellinen: Yup.boolean().defined(),
      lisatiedot: Yup.string().defined(),
      laskutustiedot: Yup.object().shape({
        ovtTunnus: Yup.string()
          .defined("OVT-tunnus on annettava")
          .when("$validationMode", {
            is: isValidationModePublish,
            then: (schema) => schema.required("OVT-tunnus on pakollinen"),
          }),
        verkkolaskuoperaattorinTunnus: Yup.string()
          .defined("Verkkolaskuoperaattorin välittäjätunnus on annettava")
          .when("$validationMode", {
            is: isValidationModePublish,
            then: (schema) => schema.required("Verkkolaskuoperaattorin välittäjätunnus on pakollinen"),
          }),
        viitetieto: Yup.string()
          .defined("Viitetieto on annettava")
          .when("$validationMode", {
            is: isValidationModePublish,
            then: (schema) => schema.required("Viitetieto on pakollinen"),
          }),
      }),
      kuulutuksetJaKutsu: getLadatutTiedostotNewSchema().defined(),
      hyvaksymisEsitys: getLadatutTiedostotNewSchema().defined(),
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

export function getDefaultValuesForForm(hyvaksymisEsityksenTiedot: HyvaksymisEsityksenTiedot): EnnakkoneuvotteluForm {
  const { oid, versio, hyvaksymisEsitys: muokattavaHyvaksymisEsitys, perustiedot } = hyvaksymisEsityksenTiedot;

  const {
    poistumisPaiva,
    kiireellinen,
    lisatiedot,
    laskutustiedot,
    hyvaksymisEsitys,
    suunnitelma,
    muistutukset,
    lausunnot,
    kuulutuksetJaKutsu,
    muuAineistoVelhosta,
    muuAineistoKoneelta,
    maanomistajaluettelo,
    vastaanottajat,
  } = muokattavaHyvaksymisEsitys ?? {};
  const { ovtTunnus, verkkolaskuoperaattorinTunnus, viitetieto } = laskutustiedot ?? {};
  const muistutuksetSorted =
    perustiedot.kunnat?.reduce((acc, kunta) => {
      acc[kunta] = [];
      return acc;
    }, {} as FormMuistutukset) ?? {};
  muistutukset?.forEach((muistutus) => {
    muistutuksetSorted[muistutus.kunta]?.push(adaptKunnallinenLadattuTiedostoToInput(muistutus));
  });
  return {
    oid,
    versio,
    muokattavaHyvaksymisEsitys: {
      poistumisPaiva: poistumisPaiva ?? null,
      kiireellinen: !!kiireellinen,
      lisatiedot: lisatiedot ?? "",
      laskutustiedot: {
        ovtTunnus: ovtTunnus ?? "",
        verkkolaskuoperaattorinTunnus: verkkolaskuoperaattorinTunnus ?? "",
        viitetieto: viitetieto ?? "",
      },
      hyvaksymisEsitys: adaptLadatutTiedostotNewToInput(hyvaksymisEsitys),
      suunnitelma: adaptSuunnitelmaAineistot(suunnitelma, perustiedot.projektiTyyppi),
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

export default function HyvaksymisEsitysLomake(): ReactElement {
  const hyvaksymisEsityksenTiedot: HyvaksymisEsityksenTiedot = {
    __typename: "HyvaksymisEsityksenTiedot",
    oid: "1.2.3",
    versio: 1,
    aineistotValmiit: true,
    muokkauksenVoiAvata: true,
    vaiheOnAktiivinen: true,
    asianhallinta: { __typename: "AsianhallintaNew", aktivoitavissa: true, inaktiivinen: false },
    perustiedot: { __typename: "ProjektinPerustiedot", suunnitelmanNimi: "Projekti 1.2.3", projektiTyyppi: ProjektiTyyppi.RATA },
    tuodutTiedostot: { __typename: "HyvaksymisEsityksenTuodutTiedostot" },
  };
  const defaultValues: EnnakkoneuvotteluForm = useMemo(
    () => getDefaultValuesForForm(hyvaksymisEsityksenTiedot),
    [hyvaksymisEsityksenTiedot]
  );

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
        projektiTyyppi: hyvaksymisEsityksenTiedot.perustiedot.projektiTyyppi,
        showKategorisoimattomat: true,
        hideDeprecated: true,
      }),
    [hyvaksymisEsityksenTiedot.perustiedot.projektiTyyppi]
  );

  if (!hyvaksymisEsityksenTiedot) {
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
                <Suunnitelma aineistoKategoriat={aineistoKategoriat} />
                <H4 variant="h3">Vuorovaikutus</H4>
                <p>Tuo omalta koneelta suunnitelmalle annetut muistutukset, lausunnot ja maanomistajaluettelo.</p>
                <Muistutukset
                  kunnat={hyvaksymisEsityksenTiedot.perustiedot.kunnat}
                  tiedostot={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.muistutukset}
                />
                <Lausunnot tiedostot={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.lausunnot} />
                <Maanomistajaluettelo
                  tuodut={hyvaksymisEsityksenTiedot.tuodutTiedostot.maanomistajaluettelo}
                  tiedostot={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.maanomistajaluettelo}
                />
                <KuulutuksetJaKutsu
                  tiedostot={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.kuulutuksetJaKutsu}
                  tuodut={hyvaksymisEsityksenTiedot.tuodutTiedostot.kuulutuksetJaKutsu}
                />
                <H4 variant="h3">Muu tekninen aineisto</H4>
                <p>
                  Voit halutessasi liittää ennakkoneuvotteluun muuta täydentävää teknistä aineistoa Projektivelhosta tai omalta koneelta.
                </p>
                <MuuAineistoVelhosta aineisto={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.muuAineistoVelhosta} ennakkoneuvottelu={true} />
                <MuuAineistoKoneelta tiedostot={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.muuAineistoKoneelta} ennakkoneuvottelu={true} />
              </Section>
              <Section>
                <Vastaanottajat ennakkoneuvottelu={true} />
              </Section>
              <Section>
                <AineistonEsikatselu ennakkoneuvottelu={true} />
              </Section>
              <MuokkausLomakePainikkeet aineistoKategoriat={aineistoKategoriat} hyvaksymisesitys={hyvaksymisEsityksenTiedot} />
            </form>
          </FormProvider>
        )}
      </ProjektiPageLayoutContext.Consumer>
    </ProjektiPageLayout>
  );
}
