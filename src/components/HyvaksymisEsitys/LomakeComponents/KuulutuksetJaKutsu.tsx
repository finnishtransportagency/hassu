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
  poisValitutTiedostot?: (LadattavaTiedosto | LadattuTiedostoNew | string)[] | null;
  ennakkoneuvottelu?: boolean;
};

export default function KuulutuksetJaKutsu({ tuodut, tiedostot, poisValitutTiedostot, ennakkoneuvottelu }: Readonly<Props>): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { control, register, setValue } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const [valitutTiedostot, setValitutTiedostot] = useState<string[]>([]);
  const [alustettu, setAlustettu] = useState(false);

  const { fields, remove, move } = useFieldArray({
    name: `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.kuulutuksetJaKutsu`,
    control,
  });

  const handleUploadedFiles = useHandleUploadedFiles(
    `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.kuulutuksetJaKutsu`
  );

  const paivitaLomakkeenPoisValitutTiedostot = useCallback(
    (valitutTiedostoUrlit: string[]) => {
      if (!tuodut || !ennakkoneuvottelu) return;

      const kaikkiS3Keys = tuodut.map((tiedosto) => tiedosto.s3Key).filter((s3Key): s3Key is string => !!s3Key);

      const poisValitutS3Keys = kaikkiS3Keys.filter((s3Key) => !valitutTiedostoUrlit.includes(s3Key));

      setValue(
        "ennakkoNeuvottelu",
        {
          ...control._formValues.ennakkoNeuvottelu,
          poisValitutKuulutuksetJaKutsu: poisValitutS3Keys.length > 0 ? poisValitutS3Keys : null,
        },
        { shouldDirty: true }
      );
    },
    [setValue, control._formValues.ennakkoNeuvottelu, ennakkoneuvottelu, tuodut]
  );

  useEffect(() => {
    if (!tuodut || tuodut.length === 0 || alustettu) return;

    let poisValitutS3Keys: string[] = [];

    if (poisValitutTiedostot && Array.isArray(poisValitutTiedostot) && poisValitutTiedostot.length > 0) {
      poisValitutTiedostot.forEach((tiedosto) => {
        if (typeof tiedosto === "string") {
          poisValitutS3Keys.push(tiedosto);
        } else if (tiedosto && typeof tiedosto === "object" && "s3Key" in tiedosto && tiedosto.s3Key) {
          poisValitutS3Keys.push(tiedosto.s3Key);
        }
      });
    }

    const valitutS3Keys = tuodut
      .map((tiedosto) => tiedosto.s3Key)
      .filter((s3Key): s3Key is string => !!s3Key && !poisValitutS3Keys.includes(s3Key));

    setValitutTiedostot(valitutS3Keys);

    setAlustettu(true);
  }, [tuodut, poisValitutTiedostot, alustettu]);

  const handleTiedostonValintaMuutos = (tiedosto: LadattavaTiedosto) => {
    const tiedostoS3Key = tiedosto.s3Key as string;

    let paivitetytValitutTiedostoUrlit;
    if (valitutTiedostot.includes(tiedostoS3Key)) {
      paivitetytValitutTiedostoUrlit = valitutTiedostot.filter((url) => url !== tiedostoS3Key);
    } else {
      paivitetytValitutTiedostoUrlit = [...valitutTiedostot, tiedostoS3Key];
    }

    setValitutTiedostot(paivitetytValitutTiedostoUrlit);

    paivitaLomakkeenPoisValitutTiedostot(paivitetytValitutTiedostoUrlit);
  };

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

  return (
    <>
      <H4 variant="h3">Kuulutukset ja kutsu vuorovaikutukseen</H4>
      <p>
        Järjestelmä on tuonut alle automaattisesti kuulutukset ja kutsun vuorovaikutukseen. Voit halutessasi lisätä aineistoa omalta
        koneeltasi.
      </p>

      {ennakkoneuvottelu && tuodut && tuodut.length > 0 ? (
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
                    checked={valitutTiedostot.includes(tiedosto.s3Key as string)}
                    onChange={() => handleTiedostonValintaMuutos(tiedosto)}
                    id={`valitse_tuotu_${tiedosto.nimi.replace(/\s+/g, "_")}`}
                  />
                  <LadattavaTiedostoComponent tiedosto={tiedosto} />

                  {!valitutTiedostot.includes(tiedosto.s3Key as string) && (
                    <Typography style={{ color: "grey" }}>Ei näytetä aineistolinkin sisällössä</Typography>
                  )}
                </Stack>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <ul style={{ listStyle: "none" }} className="mt-4">
            {!!tuodut?.length &&
              tuodut.map((tiedosto, i) => (
                <li key={tiedosto.nimi + i}>
                  <LadattavaTiedostoComponent tiedosto={tiedosto} />
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
