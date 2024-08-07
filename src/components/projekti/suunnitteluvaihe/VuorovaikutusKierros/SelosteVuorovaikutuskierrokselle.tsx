import Textarea from "@components/form/Textarea";
import ContentSpacer from "@components/layout/ContentSpacer";
import Section from "@components/layout/Section2";
import React from "react";
import { useFormContext } from "react-hook-form";
import { H2 } from "../../../Headings";

export default function SelosteVuorovaikutuskierrokselle() {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <Section>
      <H2>Seloste lähetekirjeeseen</H2>
      <ContentSpacer>
        <p>
          Kirjoita lähetekirjettä varten seloste kutsun uudelleenjulkaisun syistä. Seloste tulee nähtäville viranomaiselle ja kunnille
          lähetettävän lähetekirjeen alkuun. Älä lisää tekstiin linkkejä.
        </p>
        <Textarea
          label={`Kutsun uudelleenlähettämisen syy *`}
          {...register(`vuorovaikutusKierros.selosteVuorovaikutuskierrokselle`)}
          error={(errors as any)?.vuorovaikutusKierros?.selosteVuorovaikutuskierrokselle}
        />
      </ContentSpacer>
    </Section>
  );
}
