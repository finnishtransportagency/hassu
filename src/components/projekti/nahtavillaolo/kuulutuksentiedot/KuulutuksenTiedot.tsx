import { yupResolver } from "@hookform/resolvers/yup";
import {
  TallennaProjektiInput,
  IlmoitettavaViranomainen,
  KuntaVastaanottajaInput,
  ViranomaisVastaanottajaInput,
  Projekti,
  IlmoituksenVastaanottajatInput,
  IlmoituksenVastaanottajat,
} from "@services/api";
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
import getIlmoitettavaViranomainen from "src/util/getIlmoitettavaViranomainen";
import { removeTypeName } from "src/util/removeTypeName";

export const defaultVastaanottajat = (
  projekti: Projekti | null | undefined,
  ilmoituksenVastaanottajat: IlmoituksenVastaanottajat | null | undefined,
  kirjaamoOsoitteet: ViranomaisVastaanottajaInput[] | null
): IlmoituksenVastaanottajatInput => {
  let kunnat: KuntaVastaanottajaInput[];
  let viranomaiset: ViranomaisVastaanottajaInput[];
  if (ilmoituksenVastaanottajat?.kunnat) {
    kunnat = ilmoituksenVastaanottajat?.kunnat.map((kunta) => {
      kunta = removeTypeName(kunta);
      delete kunta.lahetetty;
      return kunta;
    });
  } else {
    kunnat =
      projekti?.velho?.kunnat?.map((s) => {
        return {
          nimi: s,
          sahkoposti: "",
        } as KuntaVastaanottajaInput;
      }) || [];
  }
  if (ilmoituksenVastaanottajat?.viranomaiset) {
    viranomaiset = ilmoituksenVastaanottajat?.viranomaiset.map((kunta) => {
      kunta = removeTypeName(kunta);
      delete kunta.lahetetty;
      return kunta;
    });
  } else {
    viranomaiset =
      projekti?.velho?.suunnittelustaVastaavaViranomainen === "VAYLAVIRASTO"
        ? projekti?.velho?.maakunnat?.map((maakunta) => {
            const ely: IlmoitettavaViranomainen = getIlmoitettavaViranomainen(maakunta);
            return (
              kirjaamoOsoitteet?.find((osoite) => osoite.nimi == ely) ||
              ({ nimi: maakunta, sahkoposti: "" } as ViranomaisVastaanottajaInput)
            );
          }) || []
        : [
            kirjaamoOsoitteet?.find((osoite) => osoite.nimi == "VAYLAVIRASTO") ||
              ({ nimi: "VAYLAVIRASTO" as IlmoitettavaViranomainen, sahkoposti: "" } as ViranomaisVastaanottajaInput),
          ];
  }
  return {
    kunnat,
    viranomaiset,
  };
};

function defaultValues(projekti: Projekti, kirjaamoOsoitteet: ViranomaisVastaanottajaInput[] | null) {
  return {
    oid: projekti.oid,
    nahtavillaoloVaihe: {
      kuulutusPaiva: projekti?.nahtavillaoloVaihe?.kuulutusPaiva,
      kuulutusVaihePaattyyPaiva: projekti?.nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva,
      muistutusoikeusPaattyyPaiva: projekti?.nahtavillaoloVaihe?.muistutusoikeusPaattyyPaiva,
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
