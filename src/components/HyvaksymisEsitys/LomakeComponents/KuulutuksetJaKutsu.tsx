import { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { allowedFileTypes } from "hassu-common/fileValidationSettings";
import Button from "@components/button/Button";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
import { LadattavaTiedosto, LadattuTiedostoNew } from "@services/api";
import { useFieldArray, useFormContext } from "react-hook-form";
import { H4 } from "@components/Headings";
import TiedostoInputNewTable from "./TiedostoInputNewTable";
import LadattavaTiedostoComponent from "@components/LadattavatTiedostot/LadattavaTiedosto";
import { EnnakkoneuvotteluForm, HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";
import { Stack } from "@mui/system";
import { Checkbox, Typography } from "@mui/material";

type Props = {
  tuodut?: LadattavaTiedosto[] | null;
  tiedostot?: LadattuTiedostoNew[] | null;
  valitutTiedostot?: LadattuTiedostoNew[] | null;
  ennakkoneuvottelu?: boolean;
};

export default function KuulutuksetJaKutsu({
  tuodut,
  tiedostot,
  valitutTiedostot,
  ennakkoneuvottelu = true,
}: Readonly<Props>): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { control, register, setValue } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const [alustettu, setAlustettu] = useState(false);
  const [valitutTiedostonimet, setValitutTiedostonimet] = useState<string[]>([]);

  const { fields, remove, move } = useFieldArray({
    name: `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.kuulutuksetJaKutsu`,
    control,
  });

  const handleUploadedFiles = useHandleUploadedFiles(
    `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.kuulutuksetJaKutsu`
  );

  const paivitaLomakkeenValitutTiedostot = useCallback(
    (kaikkiTuodutTiedostot: LadattavaTiedosto[] | null | undefined, valitutTiedostonimet: string[]) => {
      if (!kaikkiTuodutTiedostot) return;

      const valitutTiedostot = kaikkiTuodutTiedostot.filter((tiedosto) => valitutTiedostonimet.includes(tiedosto.nimi));

      if (ennakkoneuvottelu) {
        setValue(
          "ennakkoNeuvottelu",
          {
            ...control._formValues.ennakkoNeuvottelu,
            valitutKuulutuksetJaKutsu: valitutTiedostot,
          },
          { shouldDirty: true }
        );
      }
    },
    [setValue, control._formValues.ennakkoNeuvottelu, ennakkoneuvottelu]
  );

  useEffect(() => {
    if (tuodut && !alustettu) {
      const valinnat = valitutTiedostot?.length
        ? valitutTiedostot.map((tiedosto) => tiedosto.nimi)
        : tuodut.map((tiedosto) => tiedosto.nimi);

      setValitutTiedostonimet(valinnat);
      paivitaLomakkeenValitutTiedostot(tuodut, valinnat);
      setAlustettu(true);
    }
  }, [tuodut, valitutTiedostot, paivitaLomakkeenValitutTiedostot, alustettu]);

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  const registerNimi = useCallback(
    (index: number) => {
      return register(`${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.kuulutuksetJaKutsu.${index}.nimi`);
    },
    [register, ennakkoneuvottelu]
  );

  const handleTiedostonValintaMuutos = (tiedostonimi: string) => {
    const paivitetytValitutTiedostonimet = valitutTiedostonimet.includes(tiedostonimi)
      ? valitutTiedostonimet.filter((nimi) => nimi !== tiedostonimi)
      : [...valitutTiedostonimet, tiedostonimi];

    setValitutTiedostonimet(paivitetytValitutTiedostonimet);
    paivitaLomakkeenValitutTiedostot(tuodut, paivitetytValitutTiedostonimet);
  };

  return (
    <>
      <H4 variant="h3">Kuulutukset ja kutsu vuorovaikutukseen</H4>
      <p>
        Järjestelmä on tuonut alle automaattisesti kuulutukset ja kutsun vuorovaikutukseen. Voit halutessasi lisätä aineistoa omalta
        koneeltasi.
      </p>
      {ennakkoneuvottelu && tuodut && tuodut.length > 0 && (
        <>
          <p>
            Valitse aineistolinkin sisältöön mukaan otettavat tiedostot. Valitsematta jätetyt tiedostot eivät tule näkyviin
            aineistolinkissä.
          </p>
          <ul style={{ listStyle: "none" }} className="mt-2">
            {tuodut.map((tiedosto) => (
              <li key={tiedosto.nimi} style={{ marginBottom: "8px" }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Checkbox
                    checked={valitutTiedostonimet.includes(tiedosto.nimi)}
                    onChange={() => handleTiedostonValintaMuutos(tiedosto.nimi)}
                    id={`valitse_tuotu_${tiedosto.nimi.replace(/\s+/g, "_")}`}
                  />
                  <LadattavaTiedostoComponent tiedosto={tiedosto} />

                  {!valitutTiedostonimet.includes(tiedosto.nimi) && (
                    <Typography style={{ color: "grey" }}>Ei näytetä aineistolinkin sisällössä</Typography>
                  )}
                </Stack>
              </li>
            ))}
          </ul>
        </>
      )}
      {!!fields?.length && (
        <TiedostoInputNewTable
          id="hyvaksymisesitys_files_table"
          tiedostot={tiedostot}
          remove={remove}
          fields={fields}
          move={move}
          registerNimi={registerNimi}
          ladattuTiedosto
          noHeaders
          showTuotu
        />
      )}
      <input
        type="file"
        multiple
        accept={allowedFileTypes.join(", ")}
        style={{ display: "none" }}
        id="kuulutuksetJaKutsu-input"
        onChange={handleUploadedFiles}
        ref={(e) => {
          if (hiddenInputRef) {
            hiddenInputRef.current = e;
          }
        }}
      />
      <Stack justifyContent={{ md: "flex-start" }} direction={{ xs: "column", md: "row" }} spacing={2}>
        <label htmlFor="kuulutuksetJaKutsu-input">
          <Button type="button" id="tuo_kuulutuksetJaKutsu_button" onClick={onButtonClick}>
            Tuo tiedostot
          </Button>
        </label>
      </Stack>
    </>
  );
}
