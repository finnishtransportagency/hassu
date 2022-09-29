import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FieldArrayWithId, useFieldArray, useFormContext } from "react-hook-form";
import { api, apiConfig, Kayttaja, KayttajaTyyppi, ProjektiKayttaja, ProjektiKayttajaInput, TallennaProjektiInput } from "@services/api";
import Autocomplete from "@components/form/Autocomplete";
import TextInput from "@components/form/TextInput";
import IconButton from "@components/button/IconButton";
import Button from "@components/button/Button";
import useSWR, { KeyedMutator } from "swr";
import { maxPhoneLength } from "src/schemas/puhelinNumero";
import classNames from "classnames";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuStack from "@components/layout/HassuStack";
import HassuGrid from "@components/HassuGrid";

// Extend TallennaProjektiInput by making the field nonnullable and required
type RequiredFields = Pick<TallennaProjektiInput, "kayttoOikeudet">;
type RequiredInputValues = Required<{
  [K in keyof RequiredFields]: NonNullable<RequiredFields[K]>;
}>;

interface Props {
  disableFields?: boolean;
  onKayttajatUpdate: (kayttajat: Kayttaja[]) => void;
  projektiKayttajat: ProjektiKayttaja[];
}

const getKayttajaNimi = (k: Kayttaja | null | undefined) => {
  return (k && `${k.sukuNimi}, ${k.etuNimi}`) || "";
};

export const defaultKayttaja: ProjektiKayttajaInput = {
  tyyppi: undefined,
  puhelinnumero: "",
  kayttajatunnus: "",
};

function KayttoOikeusHallinta({ disableFields, onKayttajatUpdate, projektiKayttajat: projektiKayttajatFromApi }: Props) {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<RequiredInputValues>();

  // fallbackKayttajat is stored in state because
  // SWR cache can return undefined if uidList is changed
  const [fallbackKayttajat, setFallbackKayttajat] = useState<Kayttaja[]>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "kayttoOikeudet",
  });

  const { projektiPaallikot, muutHenkilot } = useMemo(
    () =>
      fields?.reduce<{
        projektiPaallikot: FieldArrayWithId<RequiredInputValues, "kayttoOikeudet", "id">[];
        muutHenkilot: FieldArrayWithId<RequiredInputValues, "kayttoOikeudet", "id">[];
      }>(
        (acc, kayttoOikeus) => {
          if (kayttoOikeus.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO) {
            acc.projektiPaallikot.push(kayttoOikeus);
          } else {
            acc.muutHenkilot.push(kayttoOikeus);
          }
          return acc;
        },
        { projektiPaallikot: [], muutHenkilot: [] }
      ) || { projektiPaallikot: [], muutHenkilot: [] },
    [fields]
  );

  const uidList = useMemo(
    () =>
      [...projektiPaallikot, ...muutHenkilot]
        .map((kayttoOikeus) => kayttoOikeus.kayttajatunnus)
        .filter((kayttajatunnus) => !!kayttajatunnus),
    [muutHenkilot, projektiPaallikot]
  );

  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const {
    data: kayttajat,
    error: kayttajatLoadError,
    mutate,
  } = useSWR([apiConfig.listaaKayttajat.graphql, uidList], kayttajatLoader, {
    fallbackData: hasMounted.current ? undefined : fallbackKayttajat,
  });

  useEffect(() => {
    setFallbackKayttajat(kayttajat || []);
    onKayttajatUpdate(kayttajat || []);
  }, [kayttajat, onKayttajatUpdate]);

  const isLoadingKayttajat = !kayttajat && !kayttajatLoadError;
  const kayttoOikeudet = watch("kayttoOikeudet");

  const watchedProjektiKayttajat: ProjektiKayttaja[] = useMemo(() => {
    const projektiKayttajat = kayttoOikeudet.map((kayttoOikeus) => {
      const kayttaja = kayttajat?.find(({ uid }) => uid === kayttoOikeus.kayttajatunnus);
      const kayttajaFromApi = projektiKayttajatFromApi.find(({ kayttajatunnus }) => kayttajatunnus === kayttoOikeus.kayttajatunnus);
      const projektiKayttaja: ProjektiKayttaja = {
        ...kayttoOikeus,
        __typename: "ProjektiKayttaja",
        email: kayttaja?.email || "",
        nimi: getKayttajaNimi(kayttaja),
        organisaatio: kayttaja?.organisaatio || "",
        muokattavissa: kayttajaFromApi?.muokattavissa === false ? false : true,
      };
      return projektiKayttaja;
    });
    return projektiKayttajat;
  }, [kayttoOikeudet, kayttajat, projektiKayttajatFromApi]);

  console.log({ watchedProjektiKayttajat });

  return (
    <Section>
      {projektiPaallikot.length > 0 && (
        <SectionContent>
          <h5 className="vayla-paragraph">Projektipäällikkö (hallinnollisen käsittelyn vastuuhenkilö)</h5>
          <p>
            Projektipäällikön lähtötietona on projekti-VELHOon tallennettu projektipäällikkö. Jos haluat vaihtaa projektipäällikön, tulee
            tieto vaihtaa projekti-VELHOssa.
          </p>
          {projektiPaallikot.map((paallikko, index) => (
            <UserFields
              disableFields={disableFields}
              index={index}
              isLoadingKayttajat={isLoadingKayttajat}
              kayttajat={kayttajat || []}
              kayttoOikeudet={watchedProjektiKayttajat}
              mutate={mutate}
              remove={remove}
              key={paallikko.id}
              removeable={false}
            />
          ))}
        </SectionContent>
      )}
      <SectionContent>
        <h5 className="vayla-paragraph">Muut henkilöt</h5>
        {muutHenkilot.map((user, i) => {
          const index = i + projektiPaallikot.length;
          return (
            <UserFields
              disableFields={disableFields}
              index={index}
              isLoadingKayttajat={isLoadingKayttajat}
              kayttajat={kayttajat || []}
              kayttoOikeudet={watchedProjektiKayttajat}
              mutate={mutate}
              remove={remove}
              key={user.id}
              removeable
            />
          );
        })}
      </SectionContent>
      <Button
        onClick={(event) => {
          event.preventDefault();
          append(defaultKayttaja);
        }}
        disabled={disableFields}
      >
        Lisää uusi +
      </Button>
      {(errors.kayttoOikeudet as any)?.message && <p className="text-red pt-3">{(errors.kayttoOikeudet as any)?.message}</p>}
    </Section>
  );
}

interface UserFieldProps {
  isLoadingKayttajat: boolean;
  disableFields?: boolean;
  kayttajat: Kayttaja[];
  index: number;
  remove: (index?: number | number[] | undefined) => void;
  mutate: KeyedMutator<Kayttaja[]>;
  kayttoOikeudet: ProjektiKayttaja[];
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
  const kayttoOikeus = useMemo(() => kayttoOikeudet[index], [kayttoOikeudet, index]);
  const isProjektiPaallikko = kayttoOikeus.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO;
  const muokattavissa = kayttoOikeus.muokattavissa;
  const kayttaja = kayttajat?.find(({ uid }) => uid === kayttoOikeus.kayttajatunnus);

  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<RequiredInputValues>();

  const minSearchLength = 3;
  const listUserOptions = useCallback(
    async (hakusana: string): Promise<Kayttaja[]> => {
      if (getKayttajaNimi(kayttaja) !== hakusana && !disableFields && hakusana.length >= minSearchLength) {
        return await api.listUsers({ hakusana });
      } else if (kayttaja) {
        return Promise.resolve([kayttaja]);
      }
      return Promise.resolve([]);
    },
    [disableFields, minSearchLength, kayttaja]
  );

  return (
    <HassuStack direction={["column", "column", "row"]}>
      <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 3]}>
        {isProjektiPaallikko ? (
          <TextInput label="Nimi *" value={getKayttajaNimi(kayttaja) || ""} disabled />
        ) : (
          <Autocomplete
            label="Nimi *"
            loading={isLoadingKayttajat}
            options={listUserOptions}
            initialOption={kayttaja}
            minSearchLength={minSearchLength}
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
            disabled={disableFields || !muokattavissa}
          />
        )}
        <TextInput label="Organisaatio" value={kayttaja?.organisaatio || ""} disabled />
        <TextInput
          label="Puhelinnumero *"
          {...register(`kayttoOikeudet.${index}.puhelinnumero`)}
          error={errors.kayttoOikeudet?.[index]?.puhelinnumero}
          maxLength={maxPhoneLength}
          disabled={disableFields}
        />
        <TextInput label="Sähköpostiosoite *" value={kayttaja?.email || ""} disabled />
      </HassuGrid>
      <div className={classNames(removeable ? "hidden md:block mt-8" : "invisible")}>
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
        <div className="block md:hidden">
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
    </HassuStack>
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
