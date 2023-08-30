import Textarea from "@components/form/Textarea";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { VuorovaikutusKierros } from "@services/api";
import React from "react";
import { useFormContext } from "react-hook-form";

type Props = {
  vuorovaikutuskierros: VuorovaikutusKierros | null | undefined;
};

export default function SelosteVuorovaikutuskierrokselle({ vuorovaikutuskierros }: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <>
      <Section>
        <h5 className="vayla-small-title">Uudelleenkuuluttamisen seloste</h5>

        <SectionContent>
          <h6 className="vayla-smallest-title">Seloste lähetekirjeeseen</h6>
          <p>
            Kirjoita lähetekirjettä varten seloste kutsun uudelleenjulkaisun syistä. Seloste tulee nähtäville viranomaiselle ja kunnille
            lähetettävän lähetekirjeen alkuun. Älä lisää tekstiin linkkejä.
          </p>
          <Textarea
            label={`Kutsun uudelleenlähettämisen syy *`}
            {...register(`vuorovaikutusKierros.selosteVuorovaikutKierrokselle`)}
            error={(errors as any)?.selosteVuorovaikutKierrokselle}
          />
        </SectionContent>
      </Section>
    </>
  );
}
