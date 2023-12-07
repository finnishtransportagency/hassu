import React, { ReactElement, useEffect, useMemo } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import ProjektiConsumerComponent from "@components/projekti/ProjektiConsumer";
import LausuntopyynnotPageLayout from "@components/projekti/lausuntopyynnot/LausuntoPyynnotPageLayout";
import Section from "@components/layout/Section2";
import { LausuntoPyynto } from "@services/api";
import { uuid } from "common/util/uuid";
import { FormProvider, UseFormProps, useFieldArray, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { lausuntopyynnotSchema } from "src/schemas/lausuntoPyynnot";
import SectionContent from "@components/layout/SectionContent";
import LausuntoPyyntoForm from "@components/projekti/lausuntopyynnot/LausuntoPyyntoForm";
import LausuntoPyynnotPainikkeet from "@components/projekti/lausuntopyynnot/LausuntoPyyntoForm/LausuntoPyynnotPainikkeet";
import Button from "@components/button/Button";
import { LausuntoPyynnotFormValues, LausuntoPyyntoLisakentilla } from "@components/projekti/lausuntopyynnot/types";
import { handleLadattuTiedostoArrayForDefaultValues } from "@components/projekti/lausuntopyynnot/util";
import { reduceToLisatytJaPoistetut } from "src/util/reduceToLisatytJaPoistetut";
import dayjs from "dayjs";
import DownloadButtonLink from "@components/button/DownloadButtonLink";

export default function LausuntoPyynnotWrapper() {
  useProjekti({ revalidateOnMount: true });
  return (
    <ProjektiConsumerComponent useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <LausuntoPyynnot projekti={projekti} />}
    </ProjektiConsumerComponent>
  );
}

const defaultLausuntoPyynto: LausuntoPyyntoLisakentilla = {
  uuid: uuid.v4(),
  poistumisPaiva: dayjs(new Date()).add(180, "day").format("YYYY-MM-DD"),
  lisaAineistot: [],
  poistetutLisaAineistot: [],
  muistiinpano: "",
  tallennettu: false,
};

function adaptLausuntoPyyntoToLausuntoPyyntoLisakentilla(lausuntoPyynto: LausuntoPyynto) {
  const { lisatty: lisaAineistot, poistettu: poistetutLisaAineistot } = handleLadattuTiedostoArrayForDefaultValues(
    lausuntoPyynto.lisaAineistot,
    true
  );
  return {
    uuid: lausuntoPyynto.uuid,
    poistumisPaiva: lausuntoPyynto.poistumisPaiva,
    lisaAineistot: lisaAineistot,
    poistetutLisaAineistot,
    muistiinpano: lausuntoPyynto.muistiinpano,
    tallennettu: true,
  };
}

const LausuntoPyynnot = ({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement => {
  const defaultValues: LausuntoPyynnotFormValues = useMemo(() => {
    const { lisatty, poistettu } = (projekti.lausuntoPyynnot || []).reduce(
      reduceToLisatytJaPoistetut<LausuntoPyynto>({ onPoistettu: (lp: LausuntoPyynto) => !!lp.poistetaan }),
      { lisatty: [] as LausuntoPyynto[], poistettu: [] as LausuntoPyynto[] }
    );
    const lausuntoPyynnot = lisatty.length ? lisatty.map(adaptLausuntoPyyntoToLausuntoPyyntoLisakentilla) : [defaultLausuntoPyynto];
    return {
      oid: projekti.oid,
      versio: projekti.versio,
      lausuntoPyynnot,
      poistetutLausuntoPyynnot: poistettu.map(adaptLausuntoPyyntoToLausuntoPyyntoLisakentilla) || [],
    };
  }, [projekti]);

  const formOptions: UseFormProps<LausuntoPyynnotFormValues, ProjektiValidationContext> = {
    resolver: yupResolver(lausuntopyynnotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
    context: { projekti },
  };

  const useFormReturn = useForm<LausuntoPyynnotFormValues, ProjektiValidationContext>(formOptions);
  const {
    control,
    reset,
    formState: { isDirty },
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: `lausuntoPyynnot`,
  });

  return (
    <LausuntopyynnotPageLayout>
      <FormProvider {...useFormReturn}>
        {fields.map((field, index) => (
          <SectionContent key={field.id}>
            <LausuntoPyyntoForm index={index} projekti={projekti} remove={remove} />
          </SectionContent>
        ))}
        <Section>
          <h2 className="vayla-subtitle">Luo uusi aineistolinkki</h2>
          <Button
            id="add_new_lausuntopyynto"
            type="button"
            onClick={() => {
              append(defaultLausuntoPyynto);
            }}
          >
            Lisää uusi +
          </Button>
        </Section>

        <Section noDivider>
          <h2 className="vayla-subtitle">Lausuntopyynnon mallipohjat</h2>
          <p>
            Alla löydät linkit viimeisimpiin lausuntopyyntöjen mallipohjiin. Lataa lausuntopyynnön mallipohja tietokoneellesi ja täytä sen
            sisältö. Vie valmislausuntopyyntö asianhallintaan allekirjoitettavaksi.
          </p>
          <div>
            <DownloadButtonLink
              id={"mallipohja-kunnalle-32T"}
              href={
                "https://extranet.vayla.fi/share/proxy/alfresco/slingshot/node/content/workspace/SpacesStore/36e9a27e-46ea-42c0-812f-6de80d723274/32T_YSTS_Kunnan_l%c3%a4hetekirje_n%c3%a4ht%c3%a4ville_asettamisen_ilmoittamisesta_ja_lausuntopyynt%c3%b6.docx?a=true"
              }
            >
              Mallipohja kunnalle 32T
            </DownloadButtonLink>
            <DownloadButtonLink
              id={"mallipohja-elylle-41R"}
              href={
                "https://extranet.vayla.fi/share/proxy/alfresco/slingshot/node/content/workspace/SpacesStore/caf740ad-86e6-4a22-b575-c86ce6ffd1c2/41R%20Lausuntopyynt%c3%b6%20ELYlle%20xx%20xxS.docx?a=true"
              }
            >
              Mallipohja ELY:le 41R
            </DownloadButtonLink>
            <DownloadButtonLink
              id={"mallipohja-muille-lausunnonantajille-42T"}
              href={
                "https://extranet.vayla.fi/share/proxy/alfresco/slingshot/node/content/workspace/SpacesStore/0b4643d2-824e-41ed-9c6d-744f9e97d100/42T_YSTS_lausuntopyynto_muut_osapuolet.docx?a=true"
              }
            >
              Mallipohja muille lausunnonantajille 42T
            </DownloadButtonLink>
          </div>
        </Section>
        <LausuntoPyynnotPainikkeet projekti={projekti} />
      </FormProvider>
    </LausuntopyynnotPageLayout>
  );
};
