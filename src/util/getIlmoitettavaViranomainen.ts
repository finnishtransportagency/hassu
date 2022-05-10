import { IlmoitettavaViranomainen } from "@services/api";

export default function getIlmoitettavaViranomainen(maakunta: string) : IlmoitettavaViranomainen {
  switch (maakunta) {
    case "Uusimaa": return "UUDENMAAN_ELY" as IlmoitettavaViranomainen;
    case "Etelä-Savo": return "ETELA_SAVO_ELY" as IlmoitettavaViranomainen;
    case "Etelä-Pohjanmaa": return "ETELA_POHJANMAAN_ELY" as IlmoitettavaViranomainen;
    case "Häme": return "HAME_ELY" as IlmoitettavaViranomainen;
    case "Kaakkois-Suomi": return "KAAKKOIS_SUOMEN_ELY" as IlmoitettavaViranomainen;
    case "Kainuu": return "KAINUUN_ELY" as IlmoitettavaViranomainen;
    case "Lappi": return "LAPIN_ELY" as IlmoitettavaViranomainen;
    case "Pirkanmaa": return "PIRKANMAAN_ELY" as IlmoitettavaViranomainen;
    case "Pohjanmaa": return "POHJANMAAN_ELY" as IlmoitettavaViranomainen;
    case "Pohjois-Karjala": return "POHJOIS_KARJALAN_ELY" as IlmoitettavaViranomainen;
    case "Pohjois-Pohjanmaa": return "POHJOIS_POHJANMAAN_ELY" as IlmoitettavaViranomainen;
    case "Pohjois-Savo": return "POHJOIS_SAVON_ELY" as IlmoitettavaViranomainen;
    case "Satakunta": return "SATAKUNNAN_ELY" as IlmoitettavaViranomainen;
    case "Varsinais-Suomi": return "VARSINAIS_SUOMEN_ELY" as IlmoitettavaViranomainen;
    default:
      return "VAYLAVIRASTO" as IlmoitettavaViranomainen;
  }
}