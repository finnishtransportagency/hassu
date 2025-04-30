import React, { ReactElement, useEffect, useState } from "react";
import { useFormContext, UseFormWatch } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import SectionContent from "@components/layout/SectionContent";
import Button from "@components/button/Button";
import ContentSpacer from "@components/layout/ContentSpacer";
import SuunnittelusopimusOsapuoliHenkilo from "./SuunnittelusopimusOsapuoliHenkilo";
import { H4 } from "@components/Headings";
import { Checkbox, IconButton, SvgIcon } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface HenkiloListaProps {
  osapuoliNumero: number;
  osapuoliTyyppi: string;
}

interface Henkilo {
  etunimi: string;
  sukunimi: string;
  email: string;
  puhelinnumero: string;
  kunta: string;
  yritys: string;
  valittu: boolean;
}

export default function HenkiloLista({ osapuoliNumero, osapuoliTyyppi }: HenkiloListaProps): ReactElement {
  const { setValue, getValues } = useFormContext<FormValues>();

  const [osapuolenHenkilot, setOsapuolenHenkilot] = useState<Henkilo[]>([]);

  useEffect(() => {
    const henkilot = getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenHenkilot` as any) || [];
    setOsapuolenHenkilot(henkilot);

    console.log("Alustetaan henkilöt:", henkilot);
  }, [getValues, osapuoliNumero, osapuoliTyyppi]);

  const maxHenkilot = 2;

  const toggleHenkiloSelection = (index: number) => {
    const paivitetytHenkilot = [...osapuolenHenkilot];
    paivitetytHenkilot[index] = {
      ...paivitetytHenkilot[index],
      valittu: !paivitetytHenkilot[index].valittu,
    };
    setOsapuolenHenkilot(paivitetytHenkilot);
    setValue(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenHenkilot` as any, paivitetytHenkilot);
  };

  const poistaHenkilo = (index: number) => {
    const paivitetytHenkilot = [...osapuolenHenkilot];
    paivitetytHenkilot.splice(index, 1);
    setOsapuolenHenkilot(paivitetytHenkilot);
    setValue(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenHenkilot` as any, paivitetytHenkilot);
  };

  const formatHenkilo = (henkilo: any) => {
    const etunimi = henkilo.etunimi || "";
    const sukunimi = henkilo.sukunimi || "";
    const email = henkilo.email || "";
    const puhelinnumero = henkilo.puhelinnumero || "";

    let sulkeetSisalto = "";

    if (osapuoliTyyppi === "kunta") {
      const kunta = henkilo.kunta || "";

      const tiedot = [kunta, puhelinnumero, email].filter((tieto) => tieto !== "");
      sulkeetSisalto = tiedot.length > 0 ? `(${tiedot.join(", ")})` : "";
    } else {
      const yritys = henkilo.yritys || "";

      const tiedot = [yritys, puhelinnumero, email].filter((tieto) => tieto !== "");
      sulkeetSisalto = tiedot.length > 0 ? `(${tiedot.join(", ")})` : "";
    }

    return `${etunimi} ${sukunimi} ${sulkeetSisalto}`;
  };

  return (
    <ContentSpacer gap={8}>
      <div style={{ marginTop: "3rem" }}>
        <H4>{osapuoliTyyppi === "kunta" ? "Kunnan edustajan tiedot" : "Yrityksen edustajan tiedot"}</H4>
        <p>
          Lisättyjen edustajien listalta valittu henkilö näkyy aloituskuulutuksen ja vuorovaikutusten yhteystiedoissa sekä julkisella
          puolella projektin yleisissä yhteystiedoissa.
        </p>
      </div>
      {osapuolenHenkilot.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <div className="henkilot-list">
            {osapuolenHenkilot.map((henkilo: Henkilo, index) => (
              <div key={index} className="henkilo-item" style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                <Checkbox
                  id={`henkilo-${index}-checkbox`}
                  checked={henkilo.valittu || false}
                  onChange={() => toggleHenkiloSelection(index)}
                  disabled={false}
                />
                <span style={{ marginLeft: "0.5rem" }}>{formatHenkilo(henkilo)}</span>
                <IconButton onClick={() => poistaHenkilo(index)}>
                  <SvgIcon fontSize="small" style={{ marginLeft: 10 }}>
                    <FontAwesomeIcon icon="trash" />
                  </SvgIcon>
                </IconButton>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        {osapuolenHenkilot.length < maxHenkilot ? (
          <>
            <SuunnittelusopimusOsapuoliHenkilo osapuoliNumero={osapuoliNumero} osapuoliTyyppi={osapuoliTyyppi} />

            <SectionContent>
              <div style={{ marginTop: "1rem", marginBottom: "3rem", display: "flex", gap: "1rem" }}>
                <Button
                  disabled={false}
                  onClick={() => {
                    const etunimi = getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.etunimi` as any) || "";
                    const sukunimi = getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.sukunimi` as any) || "";
                    const email = getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.email` as any) || "";
                    const puhelinnumero = getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.puhelinnumero` as any) || "";

                    if (etunimi && sukunimi && email && puhelinnumero) {
                      const uusiHenkilo = {
                        etunimi: etunimi,
                        sukunimi: sukunimi,
                        email: email,
                        puhelinnumero: puhelinnumero,
                        kunta: getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.kunta` as any) || "",
                        yritys: getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.yritys` as any) || "",
                        valittu: false,
                      };

                      const paivitetytHenkilot = [...osapuolenHenkilot, uusiHenkilo];
                      setOsapuolenHenkilot(paivitetytHenkilot);
                      setValue(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenHenkilot` as any, paivitetytHenkilot);
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
                  Lisää edustaja
                </Button>
              </div>
            </SectionContent>
          </>
        ) : (
          <SectionContent>
            <div style={{ marginTop: "1rem", marginBottom: "3rem" }}>
              <p>Edustajia lisätty maksimimäärä. Poista edustaja ennen uuden lisäämistä.</p>
            </div>
          </SectionContent>
        )}
      </div>
    </ContentSpacer>
  );
}
