import React from "react";
import { FieldArrayWithId, useFieldArray, UseFormReturn } from "react-hook-form";
import { api, apiConfig, Kayttaja, ProjektiKayttajaInput, ProjektiRooli, TallennaProjektiInput } from "@services/api";
import Autocomplete from "@components/form/Autocomplete";
import TextInput from "@components/form/TextInput";
import Select from "@components/form/Select";
import IconButton from "@components/button/IconButton";
import Button from "@components/button/Button";
import useSWR from "swr";
import { agencyPhoneNumberRegex, maxPhoneLength } from "src/schemas/puhelinNumero";

// Extend TallennaProjektiInput by making the field nonnullable and required
type RequiredFields = Pick<TallennaProjektiInput, "kayttoOikeudet">;
type RequiredInputValues = Required<{
  [K in keyof RequiredFields]: NonNullable<RequiredFields[K]>;
}>;

interface Props<T> {
  useFormReturn: UseFormReturn<T>;
  disableFields?: boolean;
}

export const defaultKayttaja: ProjektiKayttajaInput = {
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

function KayttoOikeusHallinta<T extends RequiredInputValues>({ useFormReturn, disableFields }: Props<T>) {
  const {
    control,
    register,
    watch,
    formState: { errors },
    setValue,
  } = useFormReturn as unknown as UseFormReturn<RequiredInputValues>;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "kayttoOikeudet",
  });

  const kayttajaNimi = (kayttaja: Kayttaja | null | undefined) =>
    (kayttaja && `${kayttaja.sukuNimi}, ${kayttaja.etuNimi}`) || "";

  const { projektiPaallikot, muutHenkilot } = fields?.reduce<{
    projektiPaallikot: FieldArrayWithId<RequiredInputValues, "kayttoOikeudet", "id">[];
    muutHenkilot: FieldArrayWithId<RequiredInputValues, "kayttoOikeudet", "id">[];
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

  const uidList = [...projektiPaallikot, ...muutHenkilot]
    .map((kayttoOikeus) => kayttoOikeus.kayttajatunnus)
    .filter((kayttajatunnus) => !!kayttajatunnus)
    .sort();

  const { data: kayttajat, error: kayttajatLoadError } = useSWR(
    [apiConfig.listaaKayttajat.graphql, uidList],
    kayttajatLoader
  );

  // TODO: vaihda koko listaus nimellä hakuun
  const { data: kaikkiKayttajat, error: kaikkiKayttajatLoadError } = useSWR(
    apiConfig.listaaKayttajat.graphql,
    kaikkiKayttajatLoader
  );

  const isLoadingKayttajat = !kayttajat && !kayttajatLoadError && !kaikkiKayttajatLoadError;

  const haeKayttaja = (uid: string) => kayttajat?.find((kayttaja: Kayttaja) => kayttaja.uid === uid);

  const kayttoOikeudet = watch("kayttoOikeudet");

  return (
    <>
      <h4 className="vayla-small-title">Projektin henkilöiden ja käyttöoikeuksien hallinta</h4>
      <p>
        Lisää projektin hallinnolliseen käsittelyyn kuuluvat henkilöt lisäämällä uusia henkilörivejä. Henkilöiden
        oikeudet projektin tietoihin ja toimintoihin määräytyvät valitun roolin mukaan. Voit tehdä muutoksia henkilöihin
        ja heidän oikeuksiin hallinnollisen käsittelyn eri vaiheissa.
      </p>
      {projektiPaallikot.length > 0 && (
        <div>
          <h5 className="vayla-paragraph">Projektipäällikkö (hallinnollisen käsittelyn vastuuhenkilö)</h5>
          <p>
            Projektipäällikön lähtötietona on projekti-VELHOon tallennettu projektipäällikkö. Jos haluat vaihtaa
            projektipäällikön, tulee tieto vaihtaa projekti-VELHOssa.
          </p>
          {projektiPaallikot.map((paallikko, index) => (
            <div key={index} className="flex flex-col lg:flex-row mb-10 lg:mb-3">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 lg:pr-1 relative even:bg-gray-lightest">
                <div className="lg:col-span-4 max-w-md">
                  <TextInput label="Nimi" value={kayttajaNimi(haeKayttaja(paallikko.kayttajatunnus)) || ""} disabled />
                </div>
                <div className="lg:col-span-4 max-w-md">
                  <TextInput
                    label="Organisaatio"
                    value={haeKayttaja(paallikko.kayttajatunnus)?.organisaatio || ""}
                    disabled
                  />
                </div>
                <div className="lg:col-span-4 max-w-md">
                  <Select label="Rooli" value={paallikko.rooli || ""} options={rooliOptions} disabled />
                </div>
                <div className="lg:col-span-4 max-w-md">
                  <TextInput
                    label="Puhelinnumero"
                    {...register(`kayttoOikeudet.${index}.puhelinnumero`)}
                    error={errors.kayttoOikeudet?.[index]?.puhelinnumero}
                    pattern={agencyPhoneNumberRegex}
                    maxLength={maxPhoneLength}
                    disabled={disableFields}
                  />
                </div>
                <div className="lg:col-span-4 flex flex-row items-end max-w-md">
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
      <h5 className="vayla-paragraph">Muut henkilöt</h5>
      {muutHenkilot.map((user, i) => {
        const index = i + projektiPaallikot.length;
        return (
          <div key={user.id} className="flex flex-col lg:flex-row mb-10 lg:mb-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 lg:pr-1 relative even:bg-gray-lightest">
              <div className="lg:col-span-4 max-w-md">
                <Autocomplete
                  label="Nimi"
                  loading={isLoadingKayttajat}
                  options={kaikkiKayttajat || []}
                  initialOption={kayttajat?.find(({ uid }) => uid === kayttoOikeudet[index].kayttajatunnus)}
                  getOptionLabel={kayttajaNimi}
                  error={errors.kayttoOikeudet?.[index]?.kayttajatunnus}
                  onSelect={(henkilo) => {
                    setValue(`kayttoOikeudet.${index}.kayttajatunnus`, henkilo?.uid || "", {
                      shouldValidate: true,
                    });
                  }}
                  disabled={disableFields}
                />
              </div>
              <div className="lg:col-span-4 max-w-md">
                <TextInput
                  label="Organisaatio"
                  value={kayttajat?.find(({ uid }) => uid === kayttoOikeudet[index].kayttajatunnus)?.organisaatio || ""}
                  disabled
                />
              </div>
              <div className="lg:col-span-4 max-w-md">
                <Select
                  label="Rooli"
                  {...register(`kayttoOikeudet.${index}.rooli`)}
                  error={errors.kayttoOikeudet?.[index]?.rooli}
                  options={rooliOptions.filter((rooli) => rooli.value !== ProjektiRooli.PROJEKTIPAALLIKKO)}
                  disabled={disableFields}
                />
              </div>
              <div className="lg:col-span-4 max-w-md">
                <TextInput
                  label="Puhelinnumero"
                  {...register(`kayttoOikeudet.${index}.puhelinnumero`)}
                  error={errors.kayttoOikeudet?.[index]?.puhelinnumero}
                  maxLength={maxPhoneLength}
                  pattern={agencyPhoneNumberRegex}
                  disabled={disableFields}
                />
              </div>
              <div className="lg:col-span-4 flex flex-row items-end max-w-md">
                <TextInput
                  label="Sähköposti"
                  value={
                    kayttajat?.find(({ uid }) => uid === kayttoOikeudet[index].kayttajatunnus)?.email?.split("@")[0] ||
                    ""
                  }
                  disabled
                />
                <span className="py-2.5 my-4 mr-2 ml-3">@</span>
                <TextInput
                  value={
                    kayttajat?.find(({ uid }) => uid === kayttoOikeudet[index].kayttajatunnus)?.email?.split("@")[1] ||
                    ""
                  }
                  disabled
                />
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
                  disabled={disableFields}
                />
              </div>
              <div className="block lg:hidden">
                <Button
                  onClick={(event) => {
                    event.preventDefault();
                    remove(index);
                  }}
                  endIcon="trash"
                  disabled={disableFields}
                >
                  Poista
                </Button>
              </div>
            </div>
          </div>
        );
      })}
      <Button
        onClick={(event) => {
          event.preventDefault();
          append(defaultKayttaja);
        }}
        disabled={disableFields}
      >
        Lisää Henkilö
      </Button>
      {(errors.kayttoOikeudet as any)?.message && (
        <p className="text-red pt-3">{(errors.kayttoOikeudet as any)?.message}</p>
      )}
    </>
  );
}

async function kayttajatLoader(_: string, kayttajat: any[]): Promise<Kayttaja[]> {
  if (kayttajat.length === 0) {
    return [];
  }
  // tslint:disable-next-line:no-console
  console.log("kayttajat", kayttajat);
  return await api.listUsers({
    kayttajatunnus: kayttajat,
  });
}

async function kaikkiKayttajatLoader(_: string): Promise<Kayttaja[]> {
  return await api.listUsers({});
}

export default KayttoOikeusHallinta;
