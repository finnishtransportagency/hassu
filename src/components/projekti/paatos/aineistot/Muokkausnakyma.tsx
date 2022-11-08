import { yupResolver } from "@hookform/resolvers/yup";
import { Aineisto, AineistoInput, TallennaProjektiInput } from "@services/api";
import React, { ReactElement, useMemo } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import { nahtavillaoloAineistotSchema } from "src/schemas/nahtavillaoloAineistot";
import HyvaksymisPaatosVaihePainikkeet from "./HyvaksymisPaatosVaihePainikkeet";
import SuunnitelmatJaAineistot from "../../common/SuunnitelmatJaAineistot";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { aineistoKategoriat } from "common/aineistoKategoriat";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import useIsAllowedOnCurrentProjektiRoute from "src/hooks/useIsOnAllowedProjektiRoute";

interface AineistoNahtavilla {
  [kategoriaId: string]: AineistoInput[];
}

type FormData = {
  aineistoNahtavilla: AineistoNahtavilla;
  hyvaksymisPaatos: AineistoInput[];
};

export type HyvaksymisPaatosVaiheAineistotFormValues = Pick<TallennaProjektiInput, "oid"> & FormData;

const getDefaultValueForAineistoNahtavilla = (aineistot: Aineisto[] | undefined | null) => {
  return aineistoKategoriat.listKategoriaIds().reduce<AineistoNahtavilla>((aineistoNahtavilla, currentKategoriaId) => {
    aineistoNahtavilla[currentKategoriaId] =
      aineistot
        ?.filter((aineisto) => aineisto.kategoriaId === currentKategoriaId)
        .map<AineistoInput>((aineisto) => ({
          dokumenttiOid: aineisto.dokumenttiOid,
          nimi: aineisto.nimi,
          jarjestys: aineisto.jarjestys,
          kategoriaId: aineisto.kategoriaId,
        })) || [];
    return aineistoNahtavilla;
  }, {});
};

export default function Muokkausnakyma(): ReactElement {
  const { data: projekti } = useProjekti();

  return <>{projekti && <MuokkausnakymaForm projekti={projekti} />}</>;
}

interface MuokkausnakymaFormProps {
  projekti: ProjektiLisatiedolla;
}

function MuokkausnakymaForm({ projekti }: MuokkausnakymaFormProps) {
  const defaultValues: HyvaksymisPaatosVaiheAineistotFormValues = useMemo(() => {
    const hyvaksymisPaatos: AineistoInput[] =
      projekti.hyvaksymisPaatosVaihe?.hyvaksymisPaatos?.map(({ dokumenttiOid, nimi, jarjestys }) => ({
        dokumenttiOid,
        jarjestys,
        nimi,
      })) || [];

    return {
      oid: projekti.oid,
      aineistoNahtavilla: getDefaultValueForAineistoNahtavilla(projekti.hyvaksymisPaatosVaihe?.aineistoNahtavilla),
      hyvaksymisPaatos,
    };
  }, [projekti]);

  const formOptions: UseFormProps<HyvaksymisPaatosVaiheAineistotFormValues> = {
    resolver: yupResolver(nahtavillaoloAineistotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
  };

  const useFormReturn = useForm<HyvaksymisPaatosVaiheAineistotFormValues>(formOptions);
  const {
    formState: { isDirty },
  } = useFormReturn;

  const { isAllowedOnRoute } = useIsAllowedOnCurrentProjektiRoute();

  useLeaveConfirm(isDirty);

  return (
    <FormProvider {...useFormReturn}>
      <form>
        <fieldset disabled={!isAllowedOnRoute || !projekti.nykyinenKayttaja.omaaMuokkausOikeuden}>
          <SuunnitelmatJaAineistot
            sectionTitle="Päätös ja päätöksen liitteenä oleva aineisto"
            sectionInfoText="Liitä Liikenne- ja viestintäviraston päätös. Liitettävä päätös haetaan Projektivelhosta. Päätös ja sen liitteenä oleva aineisto julkaistaan palvelun julkisella puolella kuulutuksen julkaisupäivänä."
            dialogInfoText="Valitse tiedostot,
            jotka haluat tuoda päätöksen liitteeksi."
            sectionSubtitle="Päätöksen liitteenä oleva aineisto"
            paatos={{
              paatosInfoText:
                "Liitä Liikenne- ja viestintäviraston päätös. Päätöksen päivämäärä sekä asianumero löytyvät Kuulutuksen tiedot -välilehdellä jos ne on lisätty Käsittelyn tila -sivulle.",
              paatosSubtitle: "Päätös *",
            }}
          />
          <HyvaksymisPaatosVaihePainikkeet />
        </fieldset>
      </form>
    </FormProvider>
  );
}
