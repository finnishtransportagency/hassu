import ProjektiPerustiedot from "@components/projekti/ProjektiPerustiedot";
import React, { ReactElement, useEffect, useState } from "react";
import { FieldArrayWithId, useFieldArray, useForm, UseFormProps } from "react-hook-form";
import * as Yup from "yup";
import { SchemaOf } from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import InfoBox from "@components/InfoBox";
import Link from "next/link";
import { useRouter } from "next/router";
import useSWR from "swr";
import Textarea from "@components/form/Textarea";
import TextInput from "@components/form/TextInput";
import Select from "@components/form/Select";
import Autocomplete from "@components/form/Autocomplete";
import {
  api,
  apiConfig,
  Kayttaja,
  Projekti,
  ProjektiKayttajaInput,
  ProjektiRooli,
  TallennaProjektiInput,
} from "@services/api";
import useTranslation from "next-translate/useTranslation";

import log from "loglevel";

// Extend TallennaProjektiInput by making fields other than muistiinpano nonnullable and required
type RequiredFields = Omit<
  TallennaProjektiInput,
  "muistiinpano" | "suunnittelustaVastaavaViranomainen" | "aloitusKuulutus" | "suunnitteluSopimus"
>;
type RequiredInputValues = Required<
  {
    [K in keyof RequiredFields]: NonNullable<RequiredFields[K]>;
  }
>;

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

const maxNoteLength = 2000;

interface Props {
  projekti: Projekti;
  reloadProject: () => void;
}

export default function PerustaProjekti({ projekti, reloadProject }: Props): ReactElement {
  const { t } = useTranslation("projekti");
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);

  const router = useRouter();
  const oid = router.query.oid;
  const { data: kayttajat, error: kayttajatLoadError } = useSWR(apiConfig.listaaKayttajat.graphql, kayttajatLoader);

  const projektiHasPaallikko = projekti?.kayttoOikeudet?.some(({ rooli }) => rooli === ProjektiRooli.PROJEKTIPAALLIKKO);
  const projektiError = !projektiHasPaallikko || projekti?.tallennettu;
  const disableFormEdit = projektiError;

  const isLoadingKayttajat = !kayttajat && !kayttajatLoadError;

  const validationSchema: SchemaOf<FormValues> = Yup.object().shape({
    oid: Yup.string().required(),
    muistiinpano: Yup.string().max(
      maxNoteLength,
      `Muistiinpanoon voidaan kirjoittaa maksimissaan ${maxNoteLength} merkkiä.`
    ),
    kayttoOikeudet: Yup.array()
      .of(
        Yup.object()
          .shape({
            rooli: Yup.mixed().oneOf(Object.values(ProjektiRooli)),
            puhelinnumero: Yup.string().required(),
            kayttajatunnus: Yup.string().required(),
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
    const tallentamisTiedot: FormValues = {
      oid: projekti?.oid || "",
      muistiinpano: projekti?.muistiinpano || "",
      kayttoOikeudet:
        projekti?.kayttoOikeudet?.map(({ kayttajatunnus, puhelinnumero, rooli }) => ({
          kayttajatunnus,
          puhelinnumero: puhelinnumero || "",
          rooli,
        })) || [],
    };
    reset(tallentamisTiedot);
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

  return (
    <>
      <section>
        <h1>Projektin tallennus</h1>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-3">
          <div className="md:col-span-6 lg:col-span-4 xl:col-span-3">
            <InfoBox title="Suunnitteluhankkeen hallinnollinen vastuu">
              {projektiPaallikot.length > 0 ? (
                projektiPaallikot.map((paallikko, index) => (
                  <ol key={index} className="space-y-2">
                    <li className="uppercase">
                      {rooliOptions.find((option) => option.value === paallikko?.rooli)?.label}
                    </li>
                    <li>{kayttajaNimi(haeKayttaja(paallikko.kayttajatunnus))}</li>
                    <li>{paallikko?.puhelinnumero}</li>
                  </ol>
                ))
              ) : (
                <ol className="space-y-2">
                  <li>Projekti päällikköä ei ole määritetty</li>
                </ol>
              )}
            </InfoBox>
          </div>
          <div className="md:col-span-6 lg:col-span-8 xl:col-span-9">
            <form onSubmit={handleSubmit(onSubmit)}>
              <h2>{projekti?.velho?.nimi || "-"}</h2>
              {projektiError && (
                <div className="alert-error">
                  {projekti?.tallennettu ? (
                    <>Tunnukselle {`'${oid}'`} on jo perustettu projekti HASSUun.</>
                  ) : !projektiHasPaallikko ? (
                    <>
                      Projektilta puuttuu projektipäällikkö- / vastuuhenkilötieto projektiVELHOsta. Lisää
                      vastuuhenkilötieto projekti-VELHOssa ja yritä projektin perustamista uudelleen.
                    </>
                  ) : (
                    <>
                      Projektin tietoja hakiessa tapahtui virhe. Tarkista tiedot velhosta ja yritä myöhemmin uudelleen.
                    </>
                  )}
                </div>
              )}
              <div>
                <h4>Suunnitteluhankkeen perustiedot</h4>
                <ProjektiPerustiedot
                  perustiedot={[
                    { header: "Asiatunnus", data: projekti?.velho?.asiatunnusELY },
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
              </div>
              <hr />
              <h4>Henkilöiden hallinta</h4>
              <p>
                Lisää projektin hallinnolliseen käsittelyyn kuuluvat henkilöt lisäämällä uusia henkilörivejä.
                Henkilöiden oikeudet projektin tietoihin ja toimintoihin määräytyvät valitun roolin mukaan. Voit tehdä
                muutoksia henkilöihin ja heidän oikeuksiin hallinnollisen käsittelyn eri vaiheissa.
              </p>
              {projektiPaallikot.length > 0 && (
                <div>
                  <h5>Projektipäällikkö (hallinnollisen käsittelyn vastuuhenkilö)</h5>
                  <p>
                    Projektipäällikön lähtötietona on projekti-VELHOon tallennettu projektipäällikkö. Jos haluat vaihtaa
                    projektipäällikön, tulee tieto vaihtaa projekti-VELHOssa.
                  </p>
                  {projektiPaallikot.map((paallikko, index) => (
                    <div key={index} className="flex">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-3 even:bg-gray-lightest">
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
                          <Select
                            label="Rooli"
                            registrationValues={{ value: paallikko.rooli || "" }}
                            options={rooliOptions}
                            disabled
                          />
                        </div>
                        <div className="lg:col-span-4">
                          <TextInput
                            label="Puhelinnumero"
                            {...register(`kayttoOikeudet.${index}.puhelinnumero`)}
                            error={errors.kayttoOikeudet?.[index]?.puhelinnumero}
                            hideErrorMessage
                            disabled={disableFormEdit || formIsSubmitting}
                          />
                        </div>
                        <div className="lg:col-span-4">
                          <TextInput
                            label="Sähköposti"
                            value={haeKayttaja(paallikko.kayttajatunnus)?.email || ""}
                            disabled
                          />
                        </div>
                      </div>
                      <div className="mt-6">
                        <button
                          className="btn"
                          onClick={(event) => {
                            event.preventDefault();
                          }}
                          disabled
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <h5>Muut henkilöt</h5>
                {muutHenkilot.map((user, i) => {
                  const index = i + projektiPaallikot.length;
                  return (
                    <div key={user.id} className="flex">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-3 even:bg-gray-lightest">
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
                            disabled={disableFormEdit || formIsSubmitting}
                          />
                        </div>
                        <div className="lg:col-span-4">
                          <TextInput
                            label="Organisaatio"
                            value={
                              kayttajat?.find(({ uid }) => uid === kayttoOikeudet[index].kayttajatunnus)
                                ?.organisaatio || ""
                            }
                            disabled
                          />
                        </div>
                        <div className="lg:col-span-4">
                          <Select
                            label="Rooli"
                            registrationValues={register(`kayttoOikeudet.${index}.rooli`)}
                            error={errors.kayttoOikeudet?.[index]?.rooli}
                            hideErrorMessage
                            options={rooliOptions.filter((rooli) => rooli.value !== ProjektiRooli.PROJEKTIPAALLIKKO)}
                            disabled={disableFormEdit || formIsSubmitting}
                          />
                        </div>
                        <div className="lg:col-span-4">
                          <TextInput
                            label="Puhelinnumero"
                            {...register(`kayttoOikeudet.${index}.puhelinnumero`)}
                            error={errors.kayttoOikeudet?.[index]?.puhelinnumero}
                            hideErrorMessage
                            disabled={disableFormEdit || formIsSubmitting}
                          />
                        </div>
                        <div className="lg:col-span-4">
                          <TextInput
                            label="Sähköposti"
                            value={
                              kayttajat?.find(({ uid }) => uid === kayttoOikeudet[index].kayttajatunnus)?.email || ""
                            }
                            disabled
                          />
                        </div>
                      </div>
                      <div className="mt-6">
                        <button
                          className="btn"
                          onClick={(event) => {
                            event.preventDefault();
                            remove(index);
                          }}
                          disabled={disableFormEdit || formIsSubmitting}
                        >
                          X
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                className="btn"
                disabled={disableFormEdit || formIsSubmitting}
                onClick={(event) => {
                  event.preventDefault();
                  append(defaultKayttaja);
                }}
              >
                Lisää Henkilö
              </button>
              {(errors.kayttoOikeudet as any)?.message && (
                <p className="text-secondary-red">{(errors.kayttoOikeudet as any)?.message}</p>
              )}
              <hr />
              <h4>Muistiinpanot</h4>
              <p>
                Voit kirjoittaa alla olevaan kenttään sisäisiä muistiinpanoja, jotka näkyvät kaikille projektiin
                lisätyille henkilöille. Muistiinpanoa voi muokata ainoastaan henkilöt, joilla on projektiin
                muokkausoikeudet. Vain viimeisimpänä tallennettu muistiinpano jää näkyviin.
              </p>
              <div className="flex flex-col">
                <Textarea
                  label="Muistiinpano"
                  disabled={disableFormEdit || formIsSubmitting}
                  registrationValues={register("muistiinpano")}
                  error={errors.muistiinpano}
                  maxLength={maxNoteLength}
                />
              </div>
              <hr />
              <div className="alert">Tallennus ei vielä julkaise tietoja.</div>
              <div className="flex justify-between flex-wrap">
                <Link href={"/yllapito/perusta"}>
                  <a className="btn mr-auto">Takaisin suunnitelman hakuun</a>
                </Link>
                <button className="btn-primary" disabled={disableFormEdit || formIsSubmitting}>
                  Tallenna projekti
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

async function kayttajatLoader(_: string): Promise<Kayttaja[]> {
  return await api.listUsers();
}
