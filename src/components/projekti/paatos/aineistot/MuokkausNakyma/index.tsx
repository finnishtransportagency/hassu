import { yupResolver } from "@hookform/resolvers/yup";
import { AineistoInput, MuokkausTila, TallennaProjektiInput } from "@services/api";
import React, { ReactElement, useEffect, useMemo } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import { nahtavillaoloAineistotSchema } from "src/schemas/nahtavillaoloAineistot";
import AineistoSivunPainikkeet from "../../../AineistoSivunPainikkeet";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { paatosSpecificTilasiirtymaTyyppiMap } from "src/util/getPaatosSpecificData";
import { PaatosSpecificData, PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import useIsAllowedOnCurrentProjektiRoute from "src/hooks/useIsOnAllowedProjektiRoute";
import { handleAineistoArrayForDefaultValues } from "src/util/handleAineistoArrayForDefaultValues";
import { getDefaultValueForAineistoNahtavilla } from "src/util/getDefaultValueForAineistoNahtavilla";
import useValidationMode from "src/hooks/useValidationMode";
import AineistoLomake from "./AineistoLomake";
import TiedostoLomake from "./TiedostoLomake";
import { getDialogInfoText, getSectionInfoText, getSectionTitle } from "./textsForDifferentPaatos";
import Section from "@components/layout/Section2";
import { AineistotSaavutettavuusOhje } from "@components/projekti/common/AineistotSaavutettavuusOhje";
import { getAineistoKategoriat } from "common/aineistoKategoriat";

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

function MuokkausnakymaForm({
  projekti,
  julkaisematonPaatos,
  paatosTyyppi,
  julkaisu,
}: MuokkausnakymaFormProps & Pick<PaatosSpecificData, "julkaisematonPaatos" | "julkaisu">) {
  const { aineistoKategoriat, kategoriaIds } = useMemo(() => {
    const aineistoKategoriat = getAineistoKategoriat(projekti.velho.tyyppi);
    return {
      aineistoKategoriat,
      kategoriaIds: aineistoKategoriat.listKategoriaIds(),
    };
  }, [projekti.velho.tyyppi]);

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
      aineistoNahtavilla: getDefaultValueForAineistoNahtavilla(aineistoNahtavilla, kategoriaIds),
      poistetutAineistoNahtavilla,
    };

    if (julkaisematonPaatos?.muokkausTila !== MuokkausTila.AINEISTO_MUOKKAUS) {
      defaultFormValues.poistetutHyvaksymisPaatos = poistetutHyvaksymisPaatos;
      defaultFormValues.hyvaksymisPaatos = hyvaksymisPaatos;
    }

    return defaultFormValues;
  }, [julkaisematonPaatos, projekti.oid, projekti.versio, kategoriaIds]);

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
          <Section>
            <h2 className="vayla-title">{getSectionTitle(paatosTyyppi)}</h2>
            <p>{getSectionInfoText(paatosTyyppi)}</p>
            <AineistotSaavutettavuusOhje />
            <TiedostoLomake vaihe={julkaisematonPaatos} paatosTyyppi={paatosTyyppi} />
            <AineistoLomake
              dialogInfoText={getDialogInfoText(paatosTyyppi)}
              vaihe={julkaisematonPaatos}
              sectionSubtitle="Päätöksen liitteenä oleva aineisto"
              aineistoKategoriat={aineistoKategoriat}
            />
          </Section>
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
