import React, { ReactElement, useState } from "react";
import { useFormContext, UseFormWatch } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import SectionContent from "@components/layout/SectionContent";
import Button from "@components/button/Button";
import ContentSpacer from "@components/layout/ContentSpacer";
import OsapuolenYhteyshenkilot from "./SuunnittelusopimusOsapuoliHenkilo";
import { H4 } from "@components/Headings";
import { Checkbox } from "@mui/material";

interface HenkiloListaProps {
  osapuoliNumero: number;
  osapuoliTyyppi: string;
  projekti?: any | null;
  formDisabled?: boolean;
  kuntaOptions: { label: string; value: string }[];
  watch: UseFormWatch<FormValues>;
}

export default function HenkiloLista({
  osapuoliNumero,
  osapuoliTyyppi,
  projekti,
  formDisabled,
  kuntaOptions,
  watch,
}: HenkiloListaProps): ReactElement {
  const { setValue, getValues, register } = useFormContext<FormValues>();

  const [lisatytHenkilot, setLisatytHenkilot] = useState<any[]>([]);

  const toggleHenkiloSelection = (index: number) => {
    const updatedHenkilot = [...lisatytHenkilot];
    updatedHenkilot[index] = {
      ...updatedHenkilot[index],
      selected: !updatedHenkilot[index].selected,
    };
    setLisatytHenkilot(updatedHenkilot);
    setValue(`suunnitteluSopimus.lisatytHenkilot` as any, updatedHenkilot);
  };

  const formatHenkilo = (henkilo: any) => {
    const etunimi = henkilo.etunimi || "";
    const sukunimi = henkilo.sukunimi || "";
    const email = henkilo.email || "";
    const puhelin = henkilo.puhelin || "";

    let sulkeetSisalto = "";

    if (osapuoliTyyppi === "kunta") {
      const kunta = henkilo.kunta || "";

      const tiedot = [kunta, puhelin, email].filter((tieto) => tieto !== "");
      sulkeetSisalto = tiedot.length > 0 ? `(${tiedot.join(", ")})` : "";
    } else {
      const organisaatio = henkilo.organisaatio || "";

      const tiedot = [organisaatio, puhelin, email].filter((tieto) => tieto !== "");
      sulkeetSisalto = tiedot.length > 0 ? `(${tiedot.join(", ")})` : "";
    }

    return `${etunimi} ${sukunimi} ${sulkeetSisalto}`;
  };

  return (
    <ContentSpacer gap={8}>
      <div style={{ marginTop: "3rem" }}>
        <H4>{osapuoliTyyppi === "kunta" ? "Kunnan edustajan tiedot" : "Yrityksen edustajan tiedot"}</H4>
        <p>
          {osapuoliTyyppi === "kunta"
            ? "Kunnan edustajaksi merkitty henkilö näkyy automaattisesti valittuna aloituskuulutuksen ja vuorovaikutusten yhteystiedoissa sekä julkisella puolella projektin yleisissä yhteystiedoissa."
            : "Yrityksen edustajaksi merkitty henkilö näkyy automaattisesti valittuna aloituskuulutuksen ja vuorovaikutusten yhteystiedoissa sekä julkisella puolella projektin yleisissä yhteystiedoissa."}
        </p>
      </div>
      {lisatytHenkilot.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <div className="henkilot-list">
            {lisatytHenkilot.map((henkilo, index) => (
              <div key={index} className="henkilo-item" style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                <Checkbox
                  id={`henkilo-${index}-checkbox`}
                  checked={henkilo.selected || false}
                  onChange={() => toggleHenkiloSelection(index)}
                  disabled={formDisabled}
                />
                <span style={{ marginLeft: "0.5rem" }}>{formatHenkilo(henkilo)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <OsapuolenYhteyshenkilot
          osapuoliNumero={osapuoliNumero}
          osapuoliTyyppi={osapuoliTyyppi}
          projekti={projekti}
          formDisabled={formDisabled}
          kuntaOptions={kuntaOptions}
          watch={watch}
        />

        <SectionContent>
          <div style={{ marginTop: "1rem", marginBottom: "3rem", display: "flex", gap: "1rem" }}>
            <Button
              disabled={formDisabled}
              onClick={() => {
                const etunimi = getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.etunimi` as any) || "";
                const sukunimi = getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.sukunimi` as any) || "";
                const email = getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.email` as any) || "";
                const puhelin = getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.puhelinnumero` as any) || "";

                if (etunimi && sukunimi && email && puhelin) {
                  const uusiHenkilo = {
                    etunimi: etunimi,
                    sukunimi: sukunimi,
                    email: email,
                    puhelin: puhelin,
                    kunta: getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.kunta` as any) || "",
                    yritys: getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.yritys` as any) || "",
                    selected: false,
                  };

                  const paivitetytHenkilot = [...lisatytHenkilot, uusiHenkilo];
                  setLisatytHenkilot(paivitetytHenkilot);
                  setValue("suunnitteluSopimus.lisatytHenkilot" as any, paivitetytHenkilot);
                  setValue(`suunnitteluSopimus.osapuoli${osapuoliNumero}.etunimi` as any, "");
                  setValue(`suunnitteluSopimus.osapuoli${osapuoliNumero}.sukunimi` as any, "");
                  setValue(`suunnitteluSopimus.osapuoli${osapuoliNumero}.email` as any, "");
                  setValue(`suunnitteluSopimus.osapuoli${osapuoliNumero}.puhelinnumero` as any, "");
                  if (osapuoliTyyppi === "kunta") {
                    setValue(`suunnitteluSopimus.osapuoli${osapuoliNumero}.kunta` as any, "");
                  } else {
                    setValue(`suunnitteluSopimus.osapuoli${osapuoliNumero}.yritys` as any, "");
                  }
                } else {
                  alert("Täytä pakolliset tiedot");
                }
              }}
              type="button"
              id="lisaa_uusi_henkilo"
              className="primary"
            >
              Lisää uusi +
            </Button>
          </div>
        </SectionContent>
      </div>
      <input type="hidden" {...register("suunnitteluSopimus.lisatytHenkilot" as any, { shouldUnregister: true })} />
    </ContentSpacer>
  );
}
