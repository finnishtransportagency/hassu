import { HyvaksymisEsityksenTiedot } from "@services/api";

export default function HyvaksymisEsitysLukutila({ hyvaksymisEsityksenTiedot }: { hyvaksymisEsityksenTiedot: HyvaksymisEsityksenTiedot }) {
  return <>{JSON.stringify(hyvaksymisEsityksenTiedot)}</>;
}
