import { HyvaksymisEsityksenTiedot, HyvaksymisTila } from "@services/api";
import HyvaksyTaiPalautaPainikkeet from "./LomakeComponents/HyvaksyTaiPalautaPainikkeet";

export default function HyvaksymisEsitysLukutila({ hyvaksymisEsityksenTiedot }: { hyvaksymisEsityksenTiedot: HyvaksymisEsityksenTiedot }) {
  const { oid, versio, hyvaksymisEsitys } = hyvaksymisEsityksenTiedot;
  const odottaaHyvaksyntaa = hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.tila == HyvaksymisTila.ODOTTAA_HYVAKSYNTAA;
  const kayttajaOnProjari = true; // TODO: muuta

  if (!hyvaksymisEsitys) {
    return null;
  }
  return (
    <div>
      {JSON.stringify(hyvaksymisEsityksenTiedot)}
      {odottaaHyvaksyntaa && kayttajaOnProjari && (
        <HyvaksyTaiPalautaPainikkeet oid={oid} versio={versio} vastaanottajat={hyvaksymisEsitys.vastaanottajat!} />
      )}
    </div>
  );
}
