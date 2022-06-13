import { yupResolver } from "@hookform/resolvers/yup";
import { TallennaProjektiInput, ViranomaisVastaanottajaInput, Projekti } from "@services/api";
import React, { useEffect } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { useProjektiRoute } from "src/hooks/useProjektiRoute";
import { nahtavillaoloKuulutusSchema } from "src/schemas/nahtavillaoloKuulutus";
import NahtavillaoloPainikkeet from "../NahtavillaoloPainikkeet";
import HankkeenSisallonKuvaus from "./HankkeenSisallonKuvaus";
import KuulutuksenJaIlmoituksenEsikatselu from "./KuulutuksenJaIlmoituksenEsikatselu";
import KuulutuksessaEsitettavatYhteystiedot from "./KuulutuksessaEsitettavatYhteystiedot";
import KuulutusJaJulkaisuPaiva from "./KuulutusJaJulkaisuPaiva";
import IlmoituksenVastaanottajatKomponentti from "./IlmoituksenVastaanottajat";
import defaultVastaanottajat from "src/util/defaultVastaanottajat";
import { removeTypeName } from "src/util/removeTypeName";

function defaultValues(projekti: Projekti, kirjaamoOsoitteet: ViranomaisVastaanottajaInput[] | null) {
  return {
    oid: projekti.oid,
    nahtavillaoloVaihe: {
      kuulutusPaiva: projekti?.nahtavillaoloVaihe?.kuulutusPaiva,
      kuulutusVaihePaattyyPaiva: projekti?.nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva,
      muistutusoikeusPaattyyPaiva: projekti?.nahtavillaoloVaihe?.muistutusoikeusPaattyyPaiva,
      hankkeenKuvaus: removeTypeName(projekti?.nahtavillaoloVaihe?.hankkeenKuvaus),
      kuulutusYhteystiedot: projekti?.nahtavillaoloVaihe?.kuulutusYhteystiedot
        ? projekti.nahtavillaoloVaihe.kuulutusYhteystiedot.map((yhteystieto) => removeTypeName(yhteystieto))
        : [],
      kuulutusYhteysHenkilot:
        projekti?.kayttoOikeudet
          ?.filter(({ kayttajatunnus }) =>
            projekti?.nahtavillaoloVaihe?.kuulutusYhteysHenkilot?.includes(kayttajatunnus)
          )
          .map(({ kayttajatunnus }) => kayttajatunnus) || [],
      ilmoituksenVastaanottajat: defaultVastaanottajat(
        projekti,
        projekti.nahtavillaoloVaihe?.ilmoituksenVastaanottajat,
        kirjaamoOsoitteet
      ),
    },
  };
}

type Props = {
  kirjaamoOsoitteet: ViranomaisVastaanottajaInput[] | null;
};

export type KuulutuksenTiedotFormValues = Pick<TallennaProjektiInput, "oid" | "nahtavillaoloVaihe">;

export default function KuulutuksenTiedot({ kirjaamoOsoitteet }: Props) {
  const { data: projekti } = useProjektiRoute();

  const formOptions: UseFormProps<KuulutuksenTiedotFormValues> = {
    resolver: yupResolver(nahtavillaoloKuulutusSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {},
  };

  const useFormReturn = useForm<KuulutuksenTiedotFormValues>(formOptions);
  const { reset } = useFormReturn;

  useEffect(() => {
    if (projekti?.oid) {
      const tallentamisTiedot: KuulutuksenTiedotFormValues = defaultValues(projekti, kirjaamoOsoitteet);
      reset(tallentamisTiedot);
    }
  }, [projekti, kirjaamoOsoitteet, reset]);

  return (
    <FormProvider {...useFormReturn}>
      <form>
        <KuulutusJaJulkaisuPaiva />
        <HankkeenSisallonKuvaus kielitiedot={projekti?.kielitiedot} />
        <KuulutuksessaEsitettavatYhteystiedot />
        <IlmoituksenVastaanottajatKomponentti
          kirjaamoOsoitteet={kirjaamoOsoitteet}
          nahtavillaoloVaihe={projekti?.nahtavillaoloVaihe}
        />
        <KuulutuksenJaIlmoituksenEsikatselu />
        <NahtavillaoloPainikkeet />
      </form>
    </FormProvider>
  );
}
