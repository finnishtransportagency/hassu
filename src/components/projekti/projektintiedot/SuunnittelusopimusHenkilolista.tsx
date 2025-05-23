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
  const {
    setValue,
    getValues,
    watch,
    setFocus,
    trigger,
    formState: { errors },
  } = useFormContext<FormValues>();

  const [osapuolenHenkilot, setOsapuolenHenkilot] = useState<Henkilo[]>([]);
  const [naytaUusiEdustajaKentat, setNaytaUusiEdustajaKentat] = useState(false);
  const [lisatytHenkilot, setLisatytHenkilot] = useState<Set<string>>(new Set());

  const watchedHenkilot = watch(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenHenkilot` as any);

  const suunnittelusopimus = watch("suunnittelusopimusprojekti");

  const hasEdustajaError = () => {
    const henkilot = getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenHenkilot` as any) || [];

    const suunnitteluSopimusErrors = errors?.suunnitteluSopimus as any;
    const osapuoliErrors = suunnitteluSopimusErrors?.[`osapuoli${osapuoliNumero}`];
    const henkilotError = osapuoliErrors?.osapuolenHenkilot;

    if (henkilot.length === 0) {
      return true;
    }
    if (henkilotError?.message === "Vähintään yksi henkilö on valittava") {
      return false;
    }
    return !!henkilotError;
  };

  const hasValittuEdustajaError = () => {
    const henkilot = getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenHenkilot` as any) || [];
    const valitutHenkilot = henkilot.filter((h: Henkilo) => h.valittu);

    const suunnitteluSopimusErrors = errors?.suunnitteluSopimus as any;
    const osapuoliErrors = suunnitteluSopimusErrors?.[`osapuoli${osapuoliNumero}`];
    const henkilotValidationError = osapuoliErrors?.osapuolenHenkilot;

    const uiError = henkilot.length > 0 && valitutHenkilot.length === 0;
    const yupError = henkilotValidationError?.message === "Vähintään yksi henkilö on valittava";

    return uiError || yupError;
  };

  useEffect(() => {
    if (!projekti) return;
    if (suunnittelusopimus === "true" && !getValues("suunnitteluSopimus.osapuoliMaara" as any)) {
      setValue("suunnitteluSopimus.osapuoliMaara" as any, 1);
    }
  }, [suunnittelusopimus, getValues, setValue, projekti]);

  useEffect(() => {
    const henkilot = watchedHenkilot || [];
    setOsapuolenHenkilot(henkilot);

    const henkiloIdt = new Set<string>();
    henkilot.forEach((henkilo: Henkilo) => {
      if (henkilo.kayttajatunnus) {
        henkiloIdt.add(henkilo.kayttajatunnus);
      }
      if (henkilo.email) {
        henkiloIdt.add(henkilo.email);
      }
    });
    setLisatytHenkilot(henkiloIdt);

    const tallennettuNayttoTila = getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}.naytaKentat` as any);
    if (tallennettuNayttoTila !== undefined) {
      setNaytaUusiEdustajaKentat(tallennettuNayttoTila);
    }
  }, [getValues, watchedHenkilot, osapuoliNumero, osapuoliTyyppi, projekti]);

  const vaihdaKenttienNakyvyys = (tila: boolean) => {
    setNaytaUusiEdustajaKentat(tila);
    setValue(`suunnitteluSopimus.osapuoli${osapuoliNumero}.naytaKentat` as any, tila);
    if (tila) {
      setTimeout(() => {
        setFocus(`suunnitteluSopimus.osapuoli${osapuoliNumero}.etunimi` as any);
      }, 100);
    }
  };

  const toggleHenkiloSelection = (index: number) => {
    const paivitetytHenkilot = [...osapuolenHenkilot];
    paivitetytHenkilot[index] = {
      ...paivitetytHenkilot[index],
      valittu: !paivitetytHenkilot[index].valittu,
    };
    setOsapuolenHenkilot(paivitetytHenkilot);
    setValue(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenHenkilot` as any, paivitetytHenkilot);
    trigger(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenHenkilot` as any);
  };

  const poistaHenkilo = (index: number) => {
    const poistettavaHenkilo = osapuolenHenkilot[index];
    const henkiloId = poistettavaHenkilo.kayttajatunnus || poistettavaHenkilo.email;

    const paivitetytHenkilot = [...osapuolenHenkilot];
    paivitetytHenkilot.splice(index, 1);
    setOsapuolenHenkilot(paivitetytHenkilot);
    setValue(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenHenkilot` as any, paivitetytHenkilot);
    trigger(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenHenkilot` as any);

    setLisatytHenkilot((prev) => {
      const uusi = new Set([...prev]);
      uusi.delete(henkiloId);
      return uusi;
    });
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

  const maxHenkilot = 2;

  const lisaaKayttajaOsapuolenHenkiloksi = (kayttaja: any) => {
    if (osapuolenHenkilot.length >= maxHenkilot) {
      alert("Edustajia lisätty maksimimäärä. Poista edustaja ennen uuden lisäämistä.");
      return;
    }
    const henkiloId = kayttaja.kayttajatunnus || kayttaja.email;
    const onJoListalla = osapuolenHenkilot.some(
      (henkilo) => henkilo.email === kayttaja.email || (kayttaja.kayttajatunnus && henkilo.kayttajatunnus === kayttaja.kayttajatunnus)
    );

    if (onJoListalla) {
      setLisatytHenkilot((prev) => new Set([...prev, henkiloId]));
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
    setValue(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenHenkilot` as any, paivitetytHenkilot, { shouldValidate: true });
    trigger(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenHenkilot` as any);
    setLisatytHenkilot((prev) => new Set([...prev, henkiloId]));
  };

  return (
    <ContentSpacer gap={8}>
      <div style={{ marginTop: "3rem", marginLeft: "2rem" }}>
        <H4>{"Osapuolen edustajan tiedot"}</H4>
        <p>
          Voit valita osapuolen edustajaksi projektin henkilöitä tai lisätä kokonaan uusia edustajia. Lisää uusi edustaja valintalistalle
          Lisää uusi -painikkeella. Edustajia voi olla korkeintaan kaksi per osapuoli.
        </p>
      </div>
      <SectionContent largeGaps sx={{ marginLeft: 8 }}>
        <H5>Projektin henkilöt</H5>
        <div className="projekti-henkilot-list" style={{ marginTop: "1rem" }}>
          {projekti?.kayttoOikeudet?.map((kayttaja, index) => {
            const onLisattyKayttajatunnuksella = kayttaja.kayttajatunnus && lisatytHenkilot.has(kayttaja.kayttajatunnus);
            const onLisattySahkopostilla = kayttaja.email && lisatytHenkilot.has(kayttaja.email);
            const onLisatty = onLisattyKayttajatunnuksella || onLisattySahkopostilla;

            return (
              <div key={index} className="henkilo-item" style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ minWidth: "500px", display: "inline-block" }}>{formatHenkilo(kayttaja)}</span>
                {onLisatty ? (
                  <span style={{ color: "#666", fontWeight: "bold" }}>Lisätty</span>
                ) : osapuolenHenkilot.length >= maxHenkilot ? (
                  <span style={{ color: "#666" }}>Maksimimäärä edustajia lisätty</span>
                ) : (
                  <Button
                    type="button"
                    onClick={() => lisaaKayttajaOsapuolenHenkiloksi(kayttaja)}
                    style={{ width: "auto" }}
                    id={`lisaa_projektihenkilö_${kayttaja.kayttajatunnus}`}
                  >
                    Lisää edustajaksi
                  </Button>
                )}
              </div>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", marginTop: "1rem" }}>
            {osapuolenHenkilot.length < maxHenkilot ? (
              <>
                <span style={{ minWidth: "500px", display: "inline-block" }}></span>
                <Button
                  type="button"
                  onClick={() => vaihdaKenttienNakyvyys(!naytaUusiEdustajaKentat)}
                  style={{ width: "auto" }}
                  id="lisaa_uusi_edustaja_nappi"
                >
                  {naytaUusiEdustajaKentat ? "Piilota kentät" : "Lisää uusi +"}
                </Button>
              </>
            ) : (
              <>
                <span style={{ marginTop: "1rem" }}>
                  <p>
                    <strong>Edustajia voi olla korkeintaan kaksi.</strong> Poista edustaja alla olevalta valintalistalta ennen uuden
                    lisäämistä.
                  </p>
                </span>
              </>
            )}
          </div>
          <div>{hasEdustajaError() && <p style={{ color: "red" }}>Lisää vähintään yksi edustaja.</p>}</div>
        </div>
      </SectionContent>

      <div>
        {naytaUusiEdustajaKentat && osapuolenHenkilot.length < maxHenkilot && (
          <>
            <SuunnittelusopimusOsapuoliHenkilo
              osapuoliNumero={osapuoliNumero}
              osapuoliTyyppi={osapuoliTyyppi}
              renderLisaaPainike={() => (
                <div style={{ marginTop: "1.8rem", marginBottom: "3rem", marginLeft: "2rem", display: "flex", gap: "1rem" }}>
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
                        vaihdaKenttienNakyvyys(false);
                      } else {
                        alert("Täytä pakolliset tiedot");
                      }
                    }}
                    type="button"
                    id="lisaa_uusi_henkilo"
                    className="primary"
                  >
                    Lisää edustajaksi
                  </Button>
                </div>
              )}
            />
          </>
        )}
      </div>
      <SectionContent largeGaps sx={{ marginLeft: 8 }}>
        {osapuolenHenkilot.length > 0 && (
          <div>
            <H5>Suunnittelusopimuksen osapuolen edustajat</H5>
            <p>
              Valintalistalta valitut henkilöt näkyvät aloituskuulutuksen ja vuorovaikutusten yhteystiedoissa sekä julkisella puolella
              projektin yleisissä yhteystiedoissa.
            </p>
            {hasValittuEdustajaError() && <p style={{ color: "red" }}>Valitse listalta vähintään yksi edustaja.</p>}
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
    </ContentSpacer>
  );
}
