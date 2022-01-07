import React, { useEffect } from "react";
import { FieldArrayWithId, useFieldArray, useFormContext } from "react-hook-form";
import { api, apiConfig, Kayttaja, ProjektiKayttajaInput, ProjektiRooli, TallennaProjektiInput } from "@services/api";
import Autocomplete from "@components/form/Autocomplete";
import TextInput from "@components/form/TextInput";
import Select from "@components/form/Select";
import IconButton from "@components/button/IconButton";
import Button from "@components/button/Button";
import useSWR, { KeyedMutator } from "swr";
import { agencyPhoneNumberRegex, maxPhoneLength } from "src/schemas/puhelinNumero";
import { useState } from "react";
import classNames from "classnames";

// Extend TallennaProjektiInput by making the field nonnullable and required
type RequiredFields = Pick<TallennaProjektiInput, "kayttoOikeudet">;
type RequiredInputValues = Required<{
  [K in keyof RequiredFields]: NonNullable<RequiredFields[K]>;
}>;

interface Props {
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

function KayttoOikeusHallinta({ disableFields }: Props) {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<RequiredInputValues>();

  // fallbackKayttajat is stored in state because
  // SWR cache can return undefined if uidList is changed
  const [fallbackKayttajat, setFallbackKayttajat] = useState<Kayttaja[]>([]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "kayttoOikeudet",
  });

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
    .filter((kayttajatunnus) => !!kayttajatunnus);

  const {
    data: kayttajat,
    error: kayttajatLoadError,
    mutate,
  } = useSWR([apiConfig.listaaKayttajat.graphql, uidList], kayttajatLoader, { fallbackData: fallbackKayttajat });

  useEffect(() => {
    setFallbackKayttajat(kayttajat || []);
  }, [kayttajat]);

  const isLoadingKayttajat = !kayttajat && !kayttajatLoadError;
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
            <UserFields
              disableFields={disableFields}
              index={index}
              isLoadingKayttajat={isLoadingKayttajat}
              kayttajat={kayttajat || []}
              kayttoOikeudet={kayttoOikeudet}
              mutate={mutate}
              remove={remove}
              key={paallikko.id}
              removeable={false}
            />
          ))}
        </div>
      )}
      <h5 className="vayla-paragraph">Muut henkilöt</h5>
      {muutHenkilot.map((user, i) => {
        const index = i + projektiPaallikot.length;
        return (
          <UserFields
            disableFields={disableFields}
            index={index}
            isLoadingKayttajat={isLoadingKayttajat}
            kayttajat={kayttajat || []}
            kayttoOikeudet={kayttoOikeudet}
            mutate={mutate}
            remove={remove}
            key={user.id}
            removeable
          />
        );
      })}
      <Button
        onClick={(event) => {
          event.preventDefault();
          append(defaultKayttaja);
        }}
        disabled={disableFields}
      >
        Lisää uusi +
      </Button>
      {(errors.kayttoOikeudet as any)?.message && (
        <p className="text-red pt-3">{(errors.kayttoOikeudet as any)?.message}</p>
      )}
    </>
  );
}

interface UserFieldProps {
  isLoadingKayttajat: boolean;
  disableFields?: boolean;
  kayttajat: Kayttaja[];
  index: number;
  remove: (index?: number | number[] | undefined) => void;
  mutate: KeyedMutator<Kayttaja[]>;
  kayttoOikeudet: ProjektiKayttajaInput[];
  removeable?: boolean;
}

const UserFields = ({
  isLoadingKayttajat,
  kayttajat,
  index,
  disableFields,
  remove,
  mutate,
  kayttoOikeudet,
  removeable,
}: UserFieldProps) => {
  const kayttoOikeus = kayttoOikeudet[index];
  const isProjektiPaallikko = kayttoOikeus.rooli === ProjektiRooli.PROJEKTIPAALLIKKO;
  const kayttaja = kayttajat?.find(({ uid }) => uid === kayttoOikeus.kayttajatunnus);
  const getKayttajaNimi = (k: Kayttaja | null | undefined) => (k && `${k.sukuNimi}, ${k.etuNimi}`) || "";
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<RequiredInputValues>();

  return (
    <div className="flex flex-col lg:flex-row mb-10 lg:mb-3">
      <div className="grid w-full grid-cols-1 lg:grid-cols-12 gap-x-6 lg:pr-1">
        <div className="lg:col-span-4">
          {isProjektiPaallikko ? (
            <TextInput label="Nimi *" value={getKayttajaNimi(kayttaja) || ""} disabled />
          ) : (
            <Autocomplete
              label="Nimi *"
              loading={isLoadingKayttajat}
              options={async (hakusana) => await api.listUsers({ hakusana })}
              initialOption={kayttaja}
              getOptionLabel={getKayttajaNimi}
              error={errors.kayttoOikeudet?.[index]?.kayttajatunnus}
              onSelect={(henkilo) => {
                if (henkilo && kayttajat) {
                  kayttajat[index] = henkilo;
                  mutate(kayttajat);
                }
                setValue(`kayttoOikeudet.${index}.kayttajatunnus`, henkilo?.uid || "", {
                  shouldValidate: true,
                });
              }}
              disabled={disableFields || isProjektiPaallikko}
            />
          )}
        </div>
        <div className="lg:col-span-4">
          <TextInput label="Organisaatio" value={kayttaja?.organisaatio || ""} disabled />
        </div>
        <div className="lg:col-span-4 max-w-md">
          {isProjektiPaallikko ? (
            <Select label="Rooli *" value={kayttoOikeus.rooli || ""} options={rooliOptions} disabled />
          ) : (
            <Select
              label="Rooli *"
              {...register(`kayttoOikeudet.${index}.rooli`)}
              error={errors.kayttoOikeudet?.[index]?.rooli}
              options={rooliOptions.filter((rooli) => rooli.value !== ProjektiRooli.PROJEKTIPAALLIKKO)}
              disabled={disableFields || isProjektiPaallikko}
            />
          )}
        </div>
        <div className="lg:col-span-4">
          <TextInput
            label="Puhelinnumero *"
            {...register(`kayttoOikeudet.${index}.puhelinnumero`)}
            error={errors.kayttoOikeudet?.[index]?.puhelinnumero}
            maxLength={maxPhoneLength}
            pattern={agencyPhoneNumberRegex}
            disabled={disableFields}
          />
        </div>
        <div className="lg:col-span-4">
          <TextInput label="Sähköpostiosoite *" value={kayttaja?.email || ""} disabled />
        </div>
      </div>
      <div className="lg:mt-6">
        <div className={classNames(removeable ? "hidden lg:block" : "invisible")}>
          <IconButton
            icon="trash"
            onClick={(event) => {
              event.preventDefault();
              if (removeable) {
                remove(index);
              }
            }}
            disabled={disableFields}
          />
        </div>
        {removeable && (
          <div className="block lg:hidden">
            <Button
              onClick={(event) => {
                event.preventDefault();
                if (removeable) {
                  remove(index);
                }
              }}
              endIcon="trash"
              disabled={disableFields}
            >
              Poista
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

async function kayttajatLoader(_: string, kayttajat: string[]): Promise<Kayttaja[]> {
  if (kayttajat.length === 0) {
    return [];
  }
  return await api.listUsers({
    kayttajatunnus: kayttajat,
  });
}

export default KayttoOikeusHallinta;
