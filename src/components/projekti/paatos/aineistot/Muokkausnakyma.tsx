import { yupResolver } from "@hookform/resolvers/yup";
import { AineistoInput, MuokkausTila, TallennaProjektiInput } from "@services/api";
import React, { ReactElement, useEffect, useMemo } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import { nahtavillaoloAineistotSchema } from "src/schemas/nahtavillaoloAineistot";
import AineistoSivunPainikkeet from "../../AineistoSivunPainikkeet";
import SuunnitelmatJaAineistot, { SuunnitelmatJaAineistotProps } from "../../common/SuunnitelmatJaAineistot";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { paatosSpecificTilasiirtymaTyyppiMap } from "src/util/getPaatosSpecificData";
import { PaatosSpecificData, PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import useIsAllowedOnCurrentProjektiRoute from "src/hooks/useIsOnAllowedProjektiRoute";
import { handleAineistoArrayForDefaultValues } from "src/util/handleAineistoArrayForDefaultValues";
import { getDefaultValueForAineistoNahtavilla } from "src/util/getDefaultValueForAineistoNahtavilla";
import useValidationMode from "src/hooks/useValidationMode";

interface AineistoNahtavilla {
  [kategoriaId: string]: AineistoInput[];
}

type FormData = {
  aineistoNahtavilla: AineistoNahtavilla;
  poistetutAineistoNahtavilla: AineistoInput[];
  poistetutHyvaksymisPaatos?: AineistoInput[];
  hyvaksymisPaatos?: AineistoInput[];
};

export type HyvaksymisPaatosVaiheAineistotFormValues = Pick<TallennaProjektiInput, "oid" | "versio"> & FormData;

export default function Muokkausnakyma({
  julkaisematonPaatos,
  paatosTyyppi,
  julkaisu,
}: Pick<PaatosSpecificData, "julkaisematonPaatos" | "julkaisu"> & { paatosTyyppi: PaatosTyyppi }): ReactElement {
  const { data: projekti } = useProjekti();

  return (
    <>
      {projekti && (
        <MuokkausnakymaForm projekti={projekti} julkaisematonPaatos={julkaisematonPaatos} paatosTyyppi={paatosTyyppi} julkaisu={julkaisu} />
      )}
    </>
  );
}

interface MuokkausnakymaFormProps {
  projekti: ProjektiLisatiedolla;
  paatosTyyppi: PaatosTyyppi;
}

const hyvaksymisPaatosSuunnitelmatJaAineistotProps: Omit<SuunnitelmatJaAineistotProps, "vaihe"> = {
  sectionTitle: "Päätös ja päätöksen liitteenä oleva aineisto",
  sectionInfoText:
    "Liitä Liikenne- ja viestintävirasto Traficomin tekemä hyväksymispäätös. Jos päätöksestä on toimitettu kaksi versiota, lisää ei-henkilötietoja sisältävä kuulutusversio. Liitettävä päätös haetaan Projektivelhosta. Päätös ja sen liitteenä oleva aineisto julkaistaan palvelun julkisella puolella kuulutuksen julkaisupäivänä.",
  dialogInfoText: "Valitse tiedostot, jotka haluat tuoda päätöksen liitteeksi.",
  sectionSubtitle: "Päätöksen liitteenä oleva aineisto",
  paatos: {
    paatosInfoText:
      "Liitä Liikenne- ja viestintäviraston päätös. Päätöksen päivämäärä sekä asiatunnus löytyvät Kuulutuksen tiedot -välilehdellä, jos ne on lisätty Käsittelyn tila -sivulle.",
    paatosSubtitle: "Päätös *",
  },
};

const jatkopaatosPaatosSuunnitelmatProps: Omit<SuunnitelmatJaAineistotProps, "vaihe"> = {
  ...hyvaksymisPaatosSuunnitelmatJaAineistotProps,
  sectionInfoText:
    "Liitä kuulutukselle Liikenne- ja viestintäviraston päätös sekä jatkopäätös. Liitettävät päätökset sekä päätösten liitteenä olevat aineistot haetaan Projektivelhosta. Päätökset ja sen liitteenä oleva aineisto julkaistaan palvelun julkisella puolella kuulutuksen julkaisupäivänä.",
  paatos: {
    paatosSubtitle: "Päätös ja jatkopäätös *",
    paatosInfoText:
      "Liitä Liikenne- ja viestintäviraston päätökset suunnitelman hyväksymisestä sekä päätös suunnitelman voimassaoloajan pidentämisestä. Jatkopäätöksen päivämäärä sekä asiatunnus löytyvät automaattisesti Kuulutuksen tiedot -välilehdeltä.",
  },
};

const paatosTyyppiToSuunnitelmatJaAineistotPropsMap: Record<PaatosTyyppi, Omit<SuunnitelmatJaAineistotProps, "vaihe">> = {
  HYVAKSYMISPAATOS: hyvaksymisPaatosSuunnitelmatJaAineistotProps,
  JATKOPAATOS1: jatkopaatosPaatosSuunnitelmatProps,
  JATKOPAATOS2: jatkopaatosPaatosSuunnitelmatProps,
};

function MuokkausnakymaForm({
  projekti,
  julkaisematonPaatos,
  paatosTyyppi,
  julkaisu,
}: MuokkausnakymaFormProps & Pick<PaatosSpecificData, "julkaisematonPaatos" | "julkaisu">) {
  const defaultValues: HyvaksymisPaatosVaiheAineistotFormValues = useMemo(() => {
    const { lisatty: hyvaksymisPaatos, poistettu: poistetutHyvaksymisPaatos } = handleAineistoArrayForDefaultValues(
      julkaisematonPaatos?.hyvaksymisPaatos,
      true
    );
    const { lisatty: aineistoNahtavilla, poistettu: poistetutAineistoNahtavilla } = handleAineistoArrayForDefaultValues(
      julkaisematonPaatos?.aineistoNahtavilla,
      false
    );

    const defaultFormValues: HyvaksymisPaatosVaiheAineistotFormValues = {
      oid: projekti.oid,
      versio: projekti.versio,
      aineistoNahtavilla: getDefaultValueForAineistoNahtavilla(aineistoNahtavilla),
      poistetutAineistoNahtavilla,
    };

    if (julkaisematonPaatos?.muokkausTila !== MuokkausTila.AINEISTO_MUOKKAUS) {
      defaultFormValues.poistetutHyvaksymisPaatos = poistetutHyvaksymisPaatos;
      defaultFormValues.hyvaksymisPaatos = hyvaksymisPaatos;
    }

    return defaultFormValues;
  }, [julkaisematonPaatos, projekti.oid, projekti.versio]);

  const validationMode = useValidationMode();

  const formOptions: UseFormProps<HyvaksymisPaatosVaiheAineistotFormValues, ProjektiValidationContext> = {
    resolver: yupResolver(nahtavillaoloAineistotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
    context: { projekti, validationMode },
  };

  const useFormReturn = useForm<HyvaksymisPaatosVaiheAineistotFormValues, ProjektiValidationContext>(formOptions);
  const {
    formState: { isDirty },
  } = useFormReturn;

  const { isAllowedOnRoute } = useIsAllowedOnCurrentProjektiRoute();

  useLeaveConfirm(isDirty);

  const { reset } = useFormReturn;
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <FormProvider {...useFormReturn}>
      <form>
        <fieldset disabled={!isAllowedOnRoute || !projekti.nykyinenKayttaja.omaaMuokkausOikeuden}>
          <SuunnitelmatJaAineistot {...paatosTyyppiToSuunnitelmatJaAineistotPropsMap[paatosTyyppi]} vaihe={julkaisematonPaatos} />
          <AineistoSivunPainikkeet
            siirtymaTyyppi={paatosSpecificTilasiirtymaTyyppiMap[paatosTyyppi]}
            muokkausTila={julkaisematonPaatos?.muokkausTila}
            projekti={projekti}
            julkaisu={julkaisu}
          />
        </fieldset>
      </form>
    </FormProvider>
  );
}
