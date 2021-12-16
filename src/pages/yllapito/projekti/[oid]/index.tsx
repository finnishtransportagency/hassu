import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import * as Yup from "yup";
import log from "loglevel";
import { PageProps } from "@pages/_app";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import useProjekti from "src/hooks/useProjekti";
import { api, apiConfig, Kayttaja, ProjektiKayttajaInput, ProjektiRooli, TallennaProjektiInput } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import useSWR from "swr";
import { SchemaOf } from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { FieldArrayWithId, useFieldArray, useForm, UseFormProps } from "react-hook-form";
import Autocomplete from "@components/form/Autocomplete";
import TextInput from "@components/form/TextInput";
import Select from "@components/form/Select";
import IconButton from "@components/button/IconButton";
import Button from "@components/button/Button";
import Textarea from "@components/form/Textarea";
import ButtonLink from "@components/button/ButtonLink";
import Notification, { NotificationType } from "@components/notification/Notification";
import ProjektiPerustiedot from "@components/projekti/ProjektiPerustiedot";
import ExtLink from "@components/ExtLink";
import Checkbox from "@components/form/CheckBox";
import RadioButton from "@components/form/RadioButton";

// Extend TallennaProjektiInput by making fields other than muistiinpano nonnullable and required
type RequiredFields = Omit<
  TallennaProjektiInput,
  "muistiinpano" | "suunnittelustaVastaavaViranomainen" | "aloitusKuulutus" | "suunnitteluSopimus"
>;
type RequiredInputValues = Required<{
  [K in keyof RequiredFields]: NonNullable<RequiredFields[K]>;
}>;

type OptionalInputValues = Partial<Pick<TallennaProjektiInput, "muistiinpano">>;
type FormValues = RequiredInputValues & OptionalInputValues;

const defaultKayttaja: ProjektiKayttajaInput = {
  // @ts-ignore By default rooli should be 'undefined'
  rooli: "",
  puhelinnumero: "",
  kayttajatunnus: "",
};

const rooliOptions = [
  { label: "", value: "" },
  { label: "Projektipäällikkö", value: "PROJEKTIPAALLIKKO", disabled: true },
  { label: "Omistaja", value: "OMISTAJA" },
  { label: "Muokkaaja", value: "MUOKKAAJA" },
];

const kuntaOptions = [
  { label: "", value: ""},
  { label: "Helsinki", value: "HELSINKI"}
]

const maxNoteLength = 2000;
const minPhoneLength = 10;
const maxPhoneLength = 10;
const agencyPhoneNumberRegex = `^029\\d*$`;
const intendedStyle = {
  paddingLeft: "20px"
}

export default function ProjektiSivu({ setRouteLabels }: PageProps) {
  const velhobaseurl = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-";

  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti, error: projektiLoadError, mutate: reloadProject } = useProjekti(oid);
  const isLoadingProjekti = !projekti && !projektiLoadError;

  const { t } = useTranslation("projekti");
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);
  const [selectLanguageDisabled, setLanguageChoices] = useState(true);

  const { data: kayttajat, error: kayttajatLoadError } = useSWR(apiConfig.listaaKayttajat.graphql, kayttajatLoader);
  const isLoadingKayttajat = !kayttajat && !kayttajatLoadError;

  const projektiHasPaallikko = projekti?.kayttoOikeudet?.some(({ rooli }) => rooli === ProjektiRooli.PROJEKTIPAALLIKKO);
  const projektiError = !projektiHasPaallikko && !isLoadingProjekti;
  const disableFormEdit = projektiError || isLoadingProjekti || formIsSubmitting || isLoadingKayttajat;

  const validationSchema: SchemaOf<FormValues> = Yup.object().shape({
    oid: Yup.string().required(),
    muistiinpano: Yup.string().max(
      maxNoteLength,
      `Muistiinpanoon voidaan kirjoittaa maksimissaan ${maxNoteLength} merkkiä.`
    ),
    kuulutuksetRuotsiksi: Yup.boolean().required(),
    kuulutuksetSaameksi: Yup.boolean().required(),
    kayttoOikeudet: Yup.array()
      .of(
        Yup.object()
          .shape({
            rooli: Yup.mixed().oneOf(Object.values(ProjektiRooli)),
            puhelinnumero: Yup.string()
              .matches(
                new RegExp(agencyPhoneNumberRegex),
                "Puhelinnumeron on oltava 029-alkuinen ja sen tulee sisältää vain numeroita"
              )
              .required("Käyttäjälle on määritettävä puhelinnumero")
              .min(
                minPhoneLength,
                `Puhelinnumeron on oltava ${minPhoneLength}${minPhoneLength === maxPhoneLength ? "" : "-" + maxPhoneLength
                } merkkiä pitkä`
              )
              .max(
                maxPhoneLength,
                `Puhelinnumeron on oltava ${minPhoneLength}${minPhoneLength === maxPhoneLength ? "" : "-" + maxPhoneLength
                } merkkiä pitkä`
              ),
            kayttajatunnus: Yup.string().required("Aseta käyttäjä"),
          })
          .test(
            "uniikki-kayttajatunnus",
            "Käyttäjä voi olla vain yhteen kertaan käyttöoikeuslistalla",
            function (current) {
              const currentKayttaja = current as ProjektiKayttajaInput;
              const kayttajaList = this.parent as ProjektiKayttajaInput[];
              const muutKayttajat = kayttajaList.filter((kayttaja) => kayttaja !== currentKayttaja);

              const isDuplicate = muutKayttajat.some(
                (kayttaja) => kayttaja.kayttajatunnus === currentKayttaja.kayttajatunnus
              );
              return isDuplicate ? this.createError({ path: `${this.path}.kayttajatunnus` }) : true;
            }
          )
      )
      .test("must-contain-projektipaallikko", "Projektille täytyy määrittää projektipäällikkö", (list) => {
        const listContainsProjektiPaallikko =
          !!list && (list as ProjektiKayttajaInput[]).some(({ rooli }) => rooli === ProjektiRooli.PROJEKTIPAALLIKKO);
        return listContainsProjektiPaallikko;
      })
      .test("singular-projektipaallikko", "Projektilla voi olla vain yksi projektipäällikkö", (list) => {
        const listContainsProjektiPaallikko =
          !!list &&
          (list as ProjektiKayttajaInput[]).filter(({ rooli }) => rooli === ProjektiRooli.PROJEKTIPAALLIKKO).length < 2;
        return listContainsProjektiPaallikko;
      })
      .test("must-contain-omistaja", "Projektille täytyy määrittää omistaja", (list) => {
        const listContainsOmistaja =
          !!list && (list as ProjektiKayttajaInput[]).some(({ rooli }) => rooli === ProjektiRooli.OMISTAJA);
        return listContainsOmistaja;
      }),
  });

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(validationSchema, { abortEarly: false, recursive: true }),
    defaultValues: { muistiinpano: "", kayttoOikeudet: [defaultKayttaja] },
    mode: "onChange",
    reValidateMode: "onChange",
  };

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    reset,
  } = useForm<FormValues>(formOptions);
  const kayttoOikeudet = watch("kayttoOikeudet");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "kayttoOikeudet",
  });

  const onSubmit = async (formData: FormValues) => {
    setFormIsSubmitting(true);
    try {
      await api.tallennaProjekti(formData);
      reloadProject();
    } catch (e) {
      log.log("OnSubmit Error", e);
    }
    setFormIsSubmitting(false);
  };

  useEffect(() => {
    if (projekti && projekti.oid) {
      const tallentamisTiedot: FormValues = {
        oid: projekti.oid,
        muistiinpano: projekti.muistiinpano || "",
        kuulutuksetRuotsiksi: projekti.kuulutuksetRuotsiksi || false,
        kuulutuksetSaameksi: projekti.kuulutuksetSaameksi || false,
        kayttoOikeudet:
          projekti.kayttoOikeudet?.map(({ kayttajatunnus, puhelinnumero, rooli }) => ({
            kayttajatunnus,
            puhelinnumero: puhelinnumero || "",
            rooli,
          })) || [],
      };
      reset(tallentamisTiedot);
    }
  }, [projekti, reset]);

  const kayttajaNimi = (kayttaja: Kayttaja | null | undefined) =>
    (kayttaja && `${kayttaja.sukuNimi}, ${kayttaja.etuNimi}`) || "";

  const { projektiPaallikot, muutHenkilot } = fields?.reduce<{
    projektiPaallikot: FieldArrayWithId<FormValues, "kayttoOikeudet", "id">[];
    muutHenkilot: FieldArrayWithId<FormValues, "kayttoOikeudet", "id">[];
  }>(
    (acc, kayttoOikeus) => {
      if (kayttoOikeus.rooli === ProjektiRooli.PROJEKTIPAALLIKKO) {
        acc.projektiPaallikot.push(kayttoOikeus);
      } else {
        acc.muutHenkilot.push(kayttoOikeus);
      }
      return acc;
    },
    { projektiPaallikot: [], muutHenkilot: [] }
  ) || { projektiPaallikot: [], muutHenkilot: [] };

  const haeKayttaja = (uid: string) => kayttajat?.find((kayttaja: Kayttaja) => kayttaja.uid === uid);

  useEffect(() => {
    if (router.isReady) {
      let routeLabel = "";
      if (projekti?.velho?.nimi) {
        routeLabel = projekti.velho?.nimi;
      } else if (typeof oid === "string") {
        routeLabel = oid;
      }
      if (routeLabel) {
        setRouteLabels({ "/yllapito/projekti/[oid]": { label: routeLabel } });
      }
    }
  }, [router.isReady, oid, projekti, setRouteLabels]);

  useEffect(() => {
    console.log("change language selections", selectLanguageDisabled);
  });

  return (
    <ProjektiPageLayout title={projekti?.tallennettu ? "Projektin perustiedot" : "Projektin perustaminen"}>
      <form onSubmit={handleSubmit(onSubmit)}>
        {projektiError && (
          <Notification type={NotificationType.ERROR}>
            {!projektiHasPaallikko ? (
              <>
                Projektilta puuttuu projektipäällikkö- / vastuuhenkilötieto projektiVELHOsta. Lisää vastuuhenkilötieto
                projekti-VELHOssa ja yritä projektin perustamista uudelleen.
              </>
            ) : (
              <>Projektin tietoja hakiessa tapahtui virhe. Tarkista tiedot velhosta ja yritä myöhemmin uudelleen.</>
            )}
          </Notification>
        )}
        <div className="content">
          <h4 className="vayla-small-title">Suunnitteluhankkeen perustiedot</h4>
          <ProjektiPerustiedot
            perustiedot={[
              { header: "Asiatunnus", data: projekti?.velho?.asiatunnusELY },
              { header: "Vastaava viranomainen", data: projekti?.velho?.tilaajaOrganisaatio },
              {
                header: "Suunnitelman tyyppi",
                data: projekti?.tyyppi && t(`projekti-tyyppi.${projekti?.tyyppi}`),
              },
              {
                header: "Väylämuoto",
                data:
                  projekti?.velho?.vaylamuoto &&
                  projekti?.velho?.vaylamuoto.map((muoto) => t(`projekti-vayla-muoto.${muoto}`)).join(", "),
              },
            ]}
          />
          <br />
          {projekti?.velho?.linkki && <ExtLink href={projekti?.velho?.linkki ? projekti?.velho?.linkki : "https://vayla.fi/vuosaaren-merivayla"}>
            Hankesivu
          </ExtLink>}
          <ExtLink href={velhobaseurl + projekti?.oid}>
            Projektin sivu Projektivelhossa
          </ExtLink>
        </div>
        <hr />
        <div className="content">
          <h4 className="vayla-small-title">Projektiin liittyvät maakunnat ja kunnat</h4>
          <ProjektiPerustiedot
            perustiedot={[
              { header: "Maakunta", data: projekti?.velho?.maakunnat ? projekti?.velho?.maakunnat.toString() : "-" },
              { header: "Kunta", data: projekti?.velho?.kunnat ? projekti?.velho?.kunnat.toString() : "-" },
            ]}
          />
        </div>
        <hr />
        <div className="content">
          <h4 className="vayla-small-title">Projetin kuulutusten kielet</h4>
          <Checkbox
            label="Projekti kuulutetaan suomenkielen lisäksi myös muilla kielillä"
            id="kuulutuskieli" onChange={() => setLanguageChoices(!selectLanguageDisabled)}></Checkbox>
          <div style={intendedStyle}>
            <RadioButton label="Suomen lisäksi ruotsi" name="kielet" value="ruotsi" id="ruotsi" disabled={selectLanguageDisabled}></RadioButton>
            <RadioButton label="Suomen lisäksi saame" name="kielet" value="saame" id="saame" disabled={selectLanguageDisabled}></RadioButton>
          </div>
        </div>
        <hr />
        <div className="content">
          <h4 className="vayla-small-title">Projektiin liittyvät suunnitelmat</h4>
          <p>Liittyykö projektiin muita voimassaolevia läkisääteisiä suunnitelmia</p>
          <div>
            <RadioButton label="Kyllä" name="liittyvia_suunnitelmia" value="true" id="liittyvia_suunnitelmia_kylla"></RadioButton>
            <RadioButton label="Ei" name="liittyvia_suunnitelmia" value="false" id="liittyvia_suunnitelmia_ei"></RadioButton>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 mb-3">
            <div className="lg:col-span-4">
              <TextInput
                label="Asiatunnus"
                value=""
                disabled
              />
            </div>
            <div className="lg:col-span-8">
              <TextInput
                label="Suunnitelman nimi"
                value=""
                disabled
              />
            </div>
          </div>
          <Button
            disabled={disableFormEdit}
            onClick={(event) => {
              event.preventDefault();
            }}
          >
            Uusi rivi +
          </Button>
        </div>
        <hr />
        <div className="content">
          <h4 className="vayla-small-title">Suunnittelusopimus</h4>
          <p>Onko kyseessä suunnittelusopimuksella toteutettava suunnitteluhanke</p>
          <div>
            <RadioButton label="Kyllä" name="suunnittelusopimushanke" value="true" id="suunnittelusopimushanke_kylla"></RadioButton>
            <RadioButton label="Ei" name="suunnittelusopimushanke" value="false" id="suunnittelusopimushanke_ei"></RadioButton>
          </div>
          <div style={intendedStyle}>
            <p>Kunnan projektipäällikön tiedot</p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 lg:pr-1 relative even:bg-gray-lightest">
              <div className="lg:col-span-4">
                <Select
                  label="Kunta"
                  options={kuntaOptions}
                  disabled={disableFormEdit}
                />
              </div>
              <div className="lg:col-span-4">
                <TextInput
                  label="Etunimi"
                  value={projekti?.suunnitteluSopimus?.etunimi || ""}
                  disabled={disableFormEdit}
                />
              </div>
              <div className="lg:col-span-4">
                <TextInput
                  label="Sukunimi"
                  value={projekti?.suunnitteluSopimus?.sukunimi || ""}
                  disabled={disableFormEdit}
                />
              </div>
              <div className="lg:col-span-4">
                <TextInput
                  label="Puhelinnumero"
                  maxLength={maxPhoneLength}
                  disabled={disableFormEdit}
                />
              </div>
              <div className="lg:col-span-4">
                <TextInput
                  label="Sähköposti"
                  value={projekti?.suunnitteluSopimus?.email?.split("@")[0] || ""}
                  disabled={disableFormEdit}
                />
              </div>
              <div className="lg:col-span-4">
                <TextInput
                  label="&nbsp;"
                  value={projekti?.suunnitteluSopimus?.email?.split("@")[1] || ""}
                  disabled={disableFormEdit}
                />
              </div>
            </div>
          </div>

        </div>
        <hr />
        <div className="content">
          <h4 className="vayla-small-title">EU-rahoitus</h4>
          <p>Rahoittaako EU suunnitteluhanketta</p>
          <div>
            <RadioButton label="Kyllä" name="eu_rahoitus" value="true" id="eu_rahoitus_kylla"></RadioButton>
            <RadioButton label="Ei" name="eu_rahoitus" value="false" id="eu_rahoitus_ei"></RadioButton>
          </div>
        </div>
        <hr />
        <div className="content">
          <h4 className="vayla-small-title">Henkilöiden hallinta</h4>
          <p>
            Lisää projektin hallinnolliseen käsittelyyn kuuluvat henkilöt lisäämällä uusia henkilörivejä. Henkilöiden
            oikeudet projektin tietoihin ja toimintoihin määräytyvät valitun roolin mukaan. Voit tehdä muutoksia
            henkilöihin ja heidän oikeuksiin hallinnollisen käsittelyn eri vaiheissa.
          </p>
          {projektiPaallikot.length > 0 && (
            <div>
              <h5 className="font-semibold">Projektipäällikkö (hallinnollisen käsittelyn vastuuhenkilö)</h5>
              <p>
                Projektipäällikön lähtötietona on projekti-VELHOon tallennettu projektipäällikkö. Jos haluat vaihtaa
                projektipäällikön, tulee tieto vaihtaa projekti-VELHOssa.
              </p>
              {projektiPaallikot.map((paallikko, index) => (
                <div key={index} className="flex">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 mb-3">
                    <div className="lg:col-span-4">
                      <TextInput
                        label="Nimi"
                        value={kayttajaNimi(haeKayttaja(paallikko.kayttajatunnus)) || ""}
                        disabled
                      />
                    </div>
                    <div className="lg:col-span-4">
                      <TextInput
                        label="Organisaatio"
                        value={haeKayttaja(paallikko.kayttajatunnus)?.organisaatio || ""}
                        disabled
                      />
                    </div>
                    <div className="lg:col-span-4">
                      <Select label="Rooli" value={paallikko.rooli || ""} options={rooliOptions} disabled />
                    </div>
                    <div className="lg:col-span-4">
                      <TextInput
                        label="Puhelinnumero"
                        {...register(`kayttoOikeudet.${index}.puhelinnumero`)}
                        error={errors.kayttoOikeudet?.[index]?.puhelinnumero}
                        pattern={agencyPhoneNumberRegex}
                        maxLength={maxPhoneLength}
                        disabled={disableFormEdit}
                      />
                    </div>
                    <div className="lg:col-span-4 flex flex-row items-end">
                      <TextInput
                        label="Sähköposti"
                        value={haeKayttaja(paallikko.kayttajatunnus)?.email?.split("@")[0] || ""}
                        disabled
                      />
                      <span className="py-2.5 my-4 mr-2 ml-3">@</span>
                      <TextInput value={haeKayttaja(paallikko.kayttajatunnus)?.email?.split("@")[1] || ""} disabled />
                    </div>
                  </div>
                  <div className="lg:mt-6">
                    <div className="hidden lg:block invisible">
                      <IconButton
                        icon="trash"
                        onClick={(event) => {
                          event.preventDefault();
                        }}
                        disabled
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <h5 className="font-semibold">Muut henkilöt</h5>
          {muutHenkilot.map((user, i) => {
            const index = i + projektiPaallikot.length;
            return (
              <div key={user.id} className="flex flex-col lg:flex-row mb-10 lg:mb-3">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 lg:pr-1 relative even:bg-gray-lightest">
                  <div className="lg:col-span-4">
                    <Autocomplete
                      label="Nimi"
                      loading={isLoadingKayttajat}
                      options={kayttajat || []}
                      initialOption={kayttajat?.find(({ uid }) => uid === kayttoOikeudet[index].kayttajatunnus)}
                      getOptionLabel={kayttajaNimi}
                      error={errors.kayttoOikeudet?.[index]?.kayttajatunnus}
                      onSelect={(henkilo) => {
                        setValue(`kayttoOikeudet.${index}.kayttajatunnus`, henkilo?.uid || "", {
                          shouldValidate: true,
                        });
                      }}
                      disabled={disableFormEdit}
                    />
                  </div>
                  <div className="lg:col-span-4">
                    <TextInput
                      label="Organisaatio"
                      value={
                        kayttajat?.find(({ uid }) => uid === kayttoOikeudet[index].kayttajatunnus)?.organisaatio || ""
                      }
                      disabled
                    />
                  </div>
                  <div className="lg:col-span-4">
                    <Select
                      label="Rooli"
                      {...register(`kayttoOikeudet.${index}.rooli`)}
                      error={errors.kayttoOikeudet?.[index]?.rooli}
                      options={rooliOptions.filter((rooli) => rooli.value !== ProjektiRooli.PROJEKTIPAALLIKKO)}
                      disabled={disableFormEdit}
                    />
                  </div>
                  <div className="lg:col-span-4">
                    <TextInput
                      label="Puhelinnumero"
                      {...register(`kayttoOikeudet.${index}.puhelinnumero`)}
                      error={errors.kayttoOikeudet?.[index]?.puhelinnumero}
                      maxLength={maxPhoneLength}
                      pattern={agencyPhoneNumberRegex}
                      disabled={disableFormEdit}
                    />
                  </div>
                  <div className="lg:col-span-4">
                    <div className="flex flex-row items-start">
                      <TextInput
                        className="self-end"
                        label="Sähköposti"
                        value={
                          kayttajat
                            ?.find(({ uid }) => uid === kayttoOikeudet[index].kayttajatunnus)
                            ?.email?.split("@")[0] || ""
                        }
                        disabled
                      />
                      <span className="py-2.5 my-4 mr-2 ml-3 self-end">@</span>
                      <TextInput
                        className="self-end"
                        value={
                          kayttajat
                            ?.find(({ uid }) => uid === kayttoOikeudet[index].kayttajatunnus)
                            ?.email?.split("@")[1] || ""
                        }
                        disabled
                      />
                    </div>
                  </div>
                </div>
                <div className="lg:mt-6">
                  <div className="hidden lg:block">
                    <IconButton
                      icon="trash"
                      onClick={(event) => {
                        event.preventDefault();
                        remove(index);
                      }}
                      disabled={disableFormEdit}
                    />
                  </div>
                  <div className="block lg:hidden">
                    <Button
                      onClick={(event) => {
                        event.preventDefault();
                        remove(index);
                      }}
                      disabled={disableFormEdit}
                      endIcon="trash"
                    >
                      Poista
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          <Button
            disabled={disableFormEdit}
            onClick={(event) => {
              event.preventDefault();
              append(defaultKayttaja);
            }}
          >
            Lisää Henkilö
          </Button>
          {(errors.kayttoOikeudet as any)?.message && (
            <p className="text-red pt-3">{(errors.kayttoOikeudet as any)?.message}</p>
          )}
          <hr />
        </div>
        <h4 className="vayla-small-title">Projektin muistiinpanot</h4>
        <p>
          Voit kirjoittaa alla olevaan kenttään sisäisiä muistiinpanoja, jotka näkyvät kaikille projektiin lisätyille
          henkilöille. Muistiinpanoa voi muokata ainoastaan henkilöt, joilla on projektiin muokkausoikeudet. Vain
          viimeisimpänä tallennettu muistiinpano jää näkyviin.
        </p>
        <div className="flex flex-col">
          <Textarea
            label="Muistiinpano"
            disabled={disableFormEdit}
            {...register("muistiinpano")}
            error={errors.muistiinpano}
            maxLength={maxNoteLength}
          />
        </div>
        <hr />
        <Notification>Tallennus ei vielä julkaise tietoja.</Notification>
        <div className="flex justify-between flex-wrap gap-4">
          <ButtonLink href={"/yllapito/perusta"}>Takaisin suunnitelman hakuun</ButtonLink>
          <Button primary={!projekti?.tallennettu} disabled={disableFormEdit}>
            Tallenna projekti
          </Button>
          {projekti?.tallennettu && projekti?.oid && (
            <ButtonLink primary href={`/yllapito/projekti/${projekti?.oid}/aloituskuulutus`}>
              Siirry Aloituskuulutukseen
            </ButtonLink>
          )}
        </div>
      </form>
    </ProjektiPageLayout>
  );
}

async function kayttajatLoader(_: string): Promise<Kayttaja[]> {
  return await api.listUsers();
}
