import HassuDialog from "@components/HassuDialog";
import Button from "@components/button/Button";
import Textarea from "@components/form/Textarea";
import HassuStack from "@components/layout/HassuStack";
import { useRouter } from "next/router";
import React from "react";
import { useForm } from "react-hook-form";
import useApi from "src/hooks/useApi";
import useHyvaksymisEsitys from "src/hooks/useHyvaksymisEsitys";
import useSpinnerAndSuccessMessage from "src/hooks/useSpinnerAndSuccessMessage";

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
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PalautusValues>({ defaultValues: { syy: "" } });

  const palautaMuokattavaksi = useSpinnerAndSuccessMessage(async (data: PalautusValues) => {
    await api.palautaHyvaksymisEsitys({ oid, versio, syy: data.syy });
    onClose();
    await reloadData();
  }, "Kuulutuksen palautus onnistui");

  const palautaMuokattavaksiJaPoistu = useSpinnerAndSuccessMessage(async (data: PalautusValues) => {
    await api.palautaHyvaksymisEsitys({ oid, versio, syy: data.syy });
    onClose();
    await reloadData();
    const siirtymaTimer = setTimeout(() => {
      router.push(`/yllapito/projekti/${oid}`);
    }, 1000);
    return () => {
      clearTimeout(siirtymaTimer);
    };
  }, "Kuulutuksen palautus onnistui");

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
