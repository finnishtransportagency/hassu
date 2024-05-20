import HassuDialog from "@components/HassuDialog";
import Button from "@components/button/Button";
import Textarea from "@components/form/Textarea";
import HassuStack from "@components/layout/HassuStack";
import log from "loglevel";
import { useRouter } from "next/router";
import React, { useCallback } from "react";
import { useForm } from "react-hook-form";
import useApi from "src/hooks/useApi";
import useSnackbars from "src/hooks/useSnackbars";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useHyvaksymisEsitys from "src/hooks/useHyvaksymisEsitys";

type PalautusValues = {
  syy: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  oid: string;
  versio: number;
};

export default function PalautaDialog({ open, onClose, oid, versio }: Props) {
  const api = useApi();
  const { mutate: reloadData } = useHyvaksymisEsitys();
  const { showSuccessMessage } = useSnackbars();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PalautusValues>({ defaultValues: { syy: "" } });

  const { withLoadingSpinner } = useLoadingSpinner();

  const palautaMuokattavaksi = useCallback(
    (data: PalautusValues) =>
      withLoadingSpinner(
        (async () => {
          try {
            await api.palautaHyvaksymisEsitys({ oid, versio, syy: data.syy });
            await reloadData();
            showSuccessMessage(`Kuulutuksen palautus onnistui`);
          } catch (error) {
            log.error(error);
          }
          onClose();
        })()
      ),
    [withLoadingSpinner, onClose, api, oid, versio, reloadData, showSuccessMessage]
  );

  const palautaMuokattavaksiJaPoistu = useCallback(
    (data: PalautusValues) =>
      withLoadingSpinner(
        (async () => {
          await palautaMuokattavaksi(data);
          const siirtymaTimer = setTimeout(() => {
            router.push(`/yllapito/projekti/${oid}`);
          }, 1000);
          return () => {
            clearTimeout(siirtymaTimer);
          };
        })()
      ),
    [withLoadingSpinner, palautaMuokattavaksi, router, oid]
  );

  return (
    <div>
      <HassuDialog open={open} title={"Hyväksymisesityksen palauttaminen"} onClose={onClose}>
        <form>
          <HassuStack>
            <p>
              Olet palauttamassa hyväksymisesityksen korjattavaksi. Hyväksymisesityksen tekijä saa tiedon palautuksesta ja sen syystä. Saat
              ilmoituksen, kun hyväksymisesitys on taas valmis hyväksyttäväksi. Jos haluat itse muokata kuulutusta ja hyväksyä sen tehtyjen
              muutoksien jälkeen, valitse Palauta ja siirry muokkaamaan.
            </p>
            <Textarea
              label="Syy palautukselle *"
              {...register("syy", { required: "Palautuksen syy täytyy antaa" })}
              error={errors.syy}
              maxLength={200}
              hideLengthCounter={false}
            ></Textarea>
          </HassuStack>
          <HassuStack direction={["column", "column", "row"]} justifyContent={[undefined, undefined, "flex-end"]} paddingTop={"1rem"}>
            <Button primary onClick={handleSubmit(palautaMuokattavaksiJaPoistu)}>
              Palauta ja poistu
            </Button>
            <Button id="reject_and_edit" onClick={handleSubmit(palautaMuokattavaksi)}>
              Siirry muokkaamaan
            </Button>
            <Button type="button" onClick={onClose}>
              Peruuta
            </Button>
          </HassuStack>
        </form>
      </HassuDialog>
    </div>
  );
}
