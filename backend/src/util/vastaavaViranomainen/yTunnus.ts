import { SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";

const yTunnusVayla = "1010547-1";
const yTunnusELY = "2296962-1";

const vastaavanViranomaisenYTunnusMap: Record<SuunnittelustaVastaavaViranomainen, string | undefined> = {
  ETELA_POHJANMAAN_ELY: yTunnusELY,
  KAAKKOIS_SUOMEN_ELY: yTunnusELY,
  KESKI_SUOMEN_ELY: yTunnusELY,
  LAPIN_ELY: yTunnusELY,
  MUU: undefined,
  PIRKANMAAN_ELY: yTunnusELY,
  POHJOIS_POHJANMAAN_ELY: yTunnusELY,
  POHJOIS_SAVON_ELY: yTunnusELY,
  UUDENMAAN_ELY: yTunnusELY,
  VARSINAIS_SUOMEN_ELY: yTunnusELY,
  VAYLAVIRASTO: yTunnusVayla,
};

export const vastaavanViranomaisenYTunnus = (vastaavaViranomainen: SuunnittelustaVastaavaViranomainen | undefined | null) =>
  vastaavaViranomainen ? vastaavanViranomaisenYTunnusMap[vastaavaViranomainen] : undefined;
