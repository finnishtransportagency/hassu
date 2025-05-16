import React, { ReactElement, useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import SectionContent from "@components/layout/SectionContent";
import Button from "@components/button/Button";
import ContentSpacer from "@components/layout/ContentSpacer";
import SuunnittelusopimusOsapuoliHenkilo from "./SuunnittelusopimusOsapuoliHenkilo";
import { H4, H5 } from "@components/Headings";
import { Checkbox, IconButton, SvgIcon } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Projekti } from "@services/api";

interface HenkiloListaProps {
  osapuoliNumero: number;
  osapuoliTyyppi: string;
  projekti?: Projekti | null;
}

interface Henkilo {
  etunimi: string;
  sukunimi: string;
  email: string;
  puhelinnumero: string;
  kunta: string;
  yritys: string;
  valittu: boolean;
  kayttajatunnus?: string;
  isProjektiHenkilo?: boolean;
}

export default function HenkiloLista({ osapuoliNumero, osapuoliTyyppi, projekti }: HenkiloListaProps): ReactElement {
  const { setValue, getValues, watch } = useFormContext<FormValues>();

  const [osapuolenHenkilot, setOsapuolenHenkilot] = useState<Henkilo[]>([]);

  const suunnittelusopimus = watch("suunnittelusopimusprojekti");

  useEffect(() => {
    if (!projekti) return;
    if (suunnittelusopimus === "true" && !getValues("suunnitteluSopimus.osapuoliMaara" as any)) {
      setValue("suunnitteluSopimus.osapuoliMaara" as any, 1);
    }
  }, [suunnittelusopimus, getValues, setValue, projekti]);

  useEffect(() => {
    const henkilot = getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenHenkilot` as any) || [];
    setOsapuolenHenkilot(henkilot);
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

  const lisaaKayttajaOsapuolenHenkiloksi = (kayttaja: any) => {
    if (osapuolenHenkilot.length >= maxHenkilot) {
      alert("Edustajia lisätty maksimimäärä. Poista edustaja ennen uuden lisäämistä.");
      return;
    }

    const onJoListalla = osapuolenHenkilot.some(
      (henkilo) => henkilo.email === kayttaja.email || (kayttaja.kayttajatunnus && henkilo.kayttajatunnus === kayttaja.kayttajatunnus)
    );

    if (onJoListalla) {
      alert("Tämä henkilö on jo lisätty osapuolen edustajiin.");
      return;
    }

    const uusiHenkilo: Henkilo = {
      etunimi: kayttaja.etunimi || "",
      sukunimi: kayttaja.sukunimi || "",
      email: kayttaja.email || "",
      puhelinnumero: kayttaja.puhelinnumero || "",
      kunta: osapuoliTyyppi === "kunta" ? kayttaja.kunta || "" : "",
      yritys: osapuoliTyyppi !== "kunta" ? kayttaja.yritys || "" : "",
      valittu: true,
      kayttajatunnus: kayttaja.kayttajatunnus,
      isProjektiHenkilo: true,
    };

    const paivitetytHenkilot = [...osapuolenHenkilot, uusiHenkilo];
    setOsapuolenHenkilot(paivitetytHenkilot);
    setValue(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenHenkilot` as any, paivitetytHenkilot);
  };

  return (
    <ContentSpacer gap={8}>
      <div style={{ marginTop: "3rem", marginLeft: "2rem" }}>
        <H4>{"Osapuolen edustajan tiedot"}</H4>
        <p>
          Valintalistalta valitut henkilöt näkyvät aloituskuulutuksen ja vuorovaikutusten yhteystiedoissa sekä julkisella puolella projektin
          yleisissä yhteystiedoissa.
        </p>
      </div>

      {osapuoliNumero === 1 && (
        <SectionContent largeGaps sx={{ marginLeft: 8 }}>
          <H5>Projektin henkilöt</H5>
          <div className="projekti-henkilot-list" style={{ marginTop: "1rem" }}>
            {projekti?.kayttoOikeudet?.map((kayttaja, index) => (
              <div key={index} className="henkilo-item" style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                <span
                  style={{
                    minWidth: "500px",
                    display: "inline-block",
                  }}
                >
                  {formatHenkilo(kayttaja)}
                </span>
                <Button
                  type="button"
                  onClick={() => lisaaKayttajaOsapuolenHenkiloksi(kayttaja)}
                  style={{ width: "auto" }}
                  id={`lisaa_projektihenkilö_${kayttaja.kayttajatunnus}`}
                >
                  Lisää osapuolen edustajaksi
                </Button>
              </div>
            ))}
          </div>
        </SectionContent>
      )}
      <SectionContent largeGaps sx={{ marginLeft: 8 }}>
        {osapuolenHenkilot.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <H5>Suunnittelusopimukseen lisätyt henkilöt</H5>
            <div className="henkilot-list">
              {osapuolenHenkilot.map((henkilo, index) => (
                <div key={index} className="henkilo-item" style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                  <Checkbox
                    id={`henkilo-${index}-checkbox`}
                    checked={henkilo.valittu || false}
                    onChange={() => toggleHenkiloSelection(index)}
                    disabled={false}
                  />
                  <span style={{ marginLeft: "0.5rem", minWidth: "450px", display: "inline-block" }}>{formatHenkilo(henkilo)}</span>
                  <IconButton onClick={() => poistaHenkilo(index)}>
                    <SvgIcon fontSize="small">
                      <FontAwesomeIcon icon="trash" />
                    </SvgIcon>
                  </IconButton>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionContent>
      <div>
        {osapuolenHenkilot.length < maxHenkilot ? (
          <>
            <SuunnittelusopimusOsapuoliHenkilo osapuoliNumero={osapuoliNumero} osapuoliTyyppi={osapuoliTyyppi} />
            <SectionContent>
              <div style={{ marginTop: "1rem", marginBottom: "3rem", marginLeft: "2rem", display: "flex", gap: "1rem" }}>
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
                        valittu: true,
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
                  Lisää edustaja valintalistalle
                </Button>
              </div>
            </SectionContent>
          </>
        ) : (
          <SectionContent>
            <div style={{ marginTop: "1rem", marginBottom: "3rem", marginLeft: "2rem" }}>
              <p>Edustajia lisätty maksimimäärä. Poista edustaja ennen uuden lisäämistä.</p>
            </div>
          </SectionContent>
        )}
      </div>
    </ContentSpacer>
  );
}
