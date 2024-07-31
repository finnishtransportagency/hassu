import React, { useEffect, useState } from "react";
import ProjektiPerustiedot from "./ProjektiPerustiedot";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import ProjektiKuntatiedot from "./ProjektiKuntatiedot";
import ProjektinLinkit from "./ProjektinLinkit";
import Section from "@components/layout/Section2";
import { KarttaKansalaiselle } from "../common/KarttaKansalaiselle";
import ContentSpacer from "@components/layout/ContentSpacer";
import TextInput from "@components/form/TextInput";
import { FormState, UseFormRegister } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import SectionContent from "@components/layout/SectionContent";
import { H3, H4 } from "../../Headings";
import axios from "axios";
import useSnackbars from "src/hooks/useSnackbars";

export interface PerusosioProps {
  projekti: ProjektiLisatiedolla;
}

interface ProjektinPerusosioProps extends PerusosioProps {
  register?: UseFormRegister<FormValues>;
  formState?: FormState<FormValues>;
  lukutila?: boolean;
}

export default function ProjektinPerusosio({ projekti, register, formState, lukutila }: Readonly<ProjektinPerusosioProps>) {
  const [geoJSON, setGeoJSON] = useState<string | null>(projekti.velho.geoJSON ?? null);
  const { showErrorMessage } = useSnackbars();

  useEffect(() => {
    const updateGeoJson = async () => {
      try {
        const response = await axios.get(`/yllapito/tiedostot/projekti/${projekti.oid}/sijaintitieto/sijaintitieto.geojson`, {
          responseType: "blob",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache", Expires: "0" },
        });

        if (!(response.data instanceof Blob)) {
          return;
        }
        const text = await response.data.text();
        setGeoJSON(text);
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 404) {
          // Ei tehdä mitään. Karttarajaustiedostoa ei toistaiseksi ole
          setGeoJSON(null);
        } else {
          console.log(e);
          showErrorMessage("Projektin sijaintitiedon lataaminen epäonnistui");
        }
      }
    };
    if (!projekti.velho.geoJSON) {
      updateGeoJson();
    }
  }, [projekti, showErrorMessage]);

  return (
    <>
      <Section>
        <ProjektiPerustiedot projekti={projekti} />
        <ProjektinLinkit projekti={projekti} />
      </Section>
      <Section>
        <ProjektiKuntatiedot projekti={projekti} />
        <ContentSpacer>
          <H4 className="vayla-smallest-title">Projekti kartalla</H4>
          <KarttaKansalaiselle geoJSON={geoJSON} />
        </ContentSpacer>
      </Section>
      {register && formState && (
        <Section gap={4}>
          <H3>Projektin viitetieto</H3>
          <p>
            Tämä tieto on Suomi.fi-viestien tulostus-, kuoritus- ja jakelupalvelun laskutusta varten. Väylän projektissa projektikohtainen
            VSK-koodi. ELYn projektissa käytetään oman ohjeistuksen mukaista viitetietoa. Viitetiedon maksimipituus on 15 merkkiä ja se voi
            sisältää vain isoja kirjaimia ja numeroita. HUOM! Hyväksymisesityksen mukana Traficomiin toimitettavat laskutustiedot annetaan
            sivulla Hyväksymisesitys.
          </p>
          <TextInput
            label="Projektin viitetieto *"
            maxLength={15}
            {...register("kustannuspaikka")}
            error={formState.errors.kustannuspaikka}
          />
        </Section>
      )}
      {lukutila && (
        <Section gap={4}>
          <h4 className="vayla-small-title">Projektin viitetieto</h4>
          <SectionContent>
            <p>{projekti.kustannuspaikka ?? ""}</p>
          </SectionContent>
        </Section>
      )}
    </>
  );
}
