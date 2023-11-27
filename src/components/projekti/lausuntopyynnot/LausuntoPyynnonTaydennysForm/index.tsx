import Section from "@components/layout/Section2";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import PoistumisPaiva from "../PoistumisPaiva";
import Linkki from "../Linkki";
import { Stack } from "@mui/system";
import { kuntametadata } from "common/kuntametadata";
import Muistutukset from "./Muistutukset";
import MuuAineisto from "./MuuAineisto";

export default function LausuntoPyynnonTaydennysForm({
  index,
  projekti,
  kunta,
}: Readonly<{ index: number; kunta: number; projekti: ProjektiLisatiedolla }>) {
  return (
    <Section style={{ marginBottom: "4em", marginTop: "4em" }}>
      <Stack direction="row" justifyContent="space-between">
        <h2 className="vayla-title">{kuntametadata.nameForKuntaId(kunta, "fi")}</h2>
      </Stack>
      <PoistumisPaiva index={index} kunta={kunta} />
      <Muistutukset index={index} projekti={projekti} />
      <MuuAineisto index={index} projekti={projekti} />
      <Linkki index={index} projekti={projekti} kunta={kunta} />
    </Section>
  );
}
