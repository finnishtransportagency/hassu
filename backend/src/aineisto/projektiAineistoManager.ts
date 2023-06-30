import {
  Aineisto,
  AloitusKuulutus,
  AloitusKuulutusJulkaisu,
  DBProjekti,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  KuulutusSaamePDFt,
  LadattuTiedosto,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
  VuorovaikutusTilaisuusJulkaisu,
} from "../database/model";
import { PathTuple, ProjektiPaths } from "../files/ProjektiPath";
import {
  AineistoTila,
  KuulutusJulkaisuTila,
  SuunnittelustaVastaavaViranomainen,
  VuorovaikutusTilaisuusTyyppi,
} from "../../../common/graphql/apiModel";
import { findJulkaisutWithTila, findJulkaisuWithAsianhallintaEventId, findJulkaisuWithTila, getAsiatunnus } from "../projekti/projektiUtil";
import { isDateTimeInThePast, nyt, parseDate, parseOptionalDate } from "../util/dateUtil";
import { aineistoService } from "./aineistoService";
import { synchronizeFilesToPublic } from "./synchronizeFilesToPublic";
import { velho } from "../velho/velhoClient";
import * as mime from "mime-types";
import { fileService } from "../files/fileService";
import { Dayjs } from "dayjs";
import contentDisposition from "content-disposition";
import { uniqBy } from "lodash";
import { formatScheduleDate } from "./aineistoSynchronizerService";
import { forEverySaameDo, forSuomiRuotsiDo } from "../projekti/adapter/common";
import { AsianhallintaSynkronointi } from "@hassu/asianhallinta";
import { assertIsDefined } from "../util/assertions";

export enum PublishOrExpireEventType {
  PUBLISH = "PUBLISH",
  EXPIRE = "EXPIRE",
}

export type PublishOrExpireEvent = {
  type: PublishOrExpireEventType;
  date: Dayjs;
  reason: string;
};

export class ProjektiAineistoManager {
  private projekti: DBProjekti;

  constructor(projekti: DBProjekti) {
    this.projekti = projekti;
  }

  isReady(): boolean {
    return (
      this.getAloitusKuulutusVaihe().isReady() &&
      this.getVuorovaikutusKierros().isReady() &&
      this.getNahtavillaoloVaihe().isReady() &&
      this.getHyvaksymisPaatosVaihe().isReady() &&
      this.getJatkoPaatos1Vaihe().isReady() &&
      this.getJatkoPaatos2Vaihe().isReady()
    );
  }

  getAloitusKuulutusVaihe(): AloitusKuulutusAineisto {
    return new AloitusKuulutusAineisto(this.projekti.oid, this.projekti.aloitusKuulutus, this.projekti.aloitusKuulutusJulkaisut);
  }

  getNahtavillaoloVaihe(): NahtavillaoloVaiheAineisto {
    return new NahtavillaoloVaiheAineisto(this.projekti.oid, this.projekti.nahtavillaoloVaihe, this.projekti.nahtavillaoloVaiheJulkaisut);
  }

  getVuorovaikutusKierros(): VuorovaikutusKierrosAineisto {
    return new VuorovaikutusKierrosAineisto(
      this.projekti.oid,
      this.projekti.vuorovaikutusKierros,
      this.projekti.vuorovaikutusKierrosJulkaisut,
      this.getNahtavillaoloVaihe()
    );
  }

  getVuorovaikutusKierrosJulkaisut(): VuorovaikutusKierrosJulkaisuAineisto[] {
    return (
      this.projekti.vuorovaikutusKierrosJulkaisut?.map(
        (julkaisu) => new VuorovaikutusKierrosJulkaisuAineisto(this.projekti.oid, julkaisu)
      ) || []
    );
  }

  getHyvaksymisPaatosVaihe(): HyvaksymisPaatosVaiheAineisto {
    return new HyvaksymisPaatosVaiheAineisto(
      this.projekti.oid,
      this.projekti.hyvaksymisPaatosVaihe,
      this.projekti.hyvaksymisPaatosVaiheJulkaisut
    );
  }

  getJatkoPaatos1Vaihe(): JatkoPaatos1VaiheAineisto {
    return new JatkoPaatos1VaiheAineisto(this.projekti.oid, this.projekti.jatkoPaatos1Vaihe, this.projekti.jatkoPaatos1VaiheJulkaisut);
  }

  getJatkoPaatos2Vaihe(): JatkoPaatos2VaiheAineisto {
    return new JatkoPaatos2VaiheAineisto(this.projekti.oid, this.projekti.jatkoPaatos2Vaihe, this.projekti.jatkoPaatos2VaiheJulkaisut);
  }

  getSchedule(): PublishOrExpireEvent[] {
    const publishOrExpireEvents = Array<PublishOrExpireEvent>()
      .concat(this.getAloitusKuulutusVaihe().getSchedule())
      .concat(this.getVuorovaikutusKierros().getSchedule())
      .concat(this.getNahtavillaoloVaihe().getSchedule())
      .concat(this.getHyvaksymisPaatosVaihe().getSchedule())
      .concat(this.getJatkoPaatos1Vaihe().getSchedule())
      .concat(this.getJatkoPaatos2Vaihe().getSchedule());
    const schedule = uniqBy(publishOrExpireEvents, (event) => formatScheduleDate(event.date)); // Poista duplikaatit
    return schedule.sort((a, b) => a.date.date() - b.date.date());
  }
}

type AineistoPathsPair = { aineisto: Aineisto[] | null | undefined; paths: PathTuple };

export abstract class VaiheAineisto<T, J> {
  public readonly oid: string;
  public readonly vaihe: T | undefined;
  public readonly julkaisut: J[] | undefined;
  public readonly projektiPaths: ProjektiPaths;

  constructor(oid: string, vaihe: T | undefined | null, julkaisut: J[] | undefined | null) {
    this.oid = oid;
    this.projektiPaths = new ProjektiPaths(oid);
    this.vaihe = vaihe || undefined;
    this.julkaisut = julkaisut || undefined;
  }

  abstract getAineistot(vaihe: T): AineistoPathsPair[];

  abstract getLadatutTiedostot(vaihe: T): LadattuTiedosto[];

  abstract synchronize(): Promise<boolean>;

  abstract getAsianhallintaSynkronointi(
    projekti: DBProjekti,
    asianhallintaEventId: string | null | undefined
  ): AsianhallintaSynkronointi | undefined;

  async handleChanges(): Promise<T | undefined> {
    if (this.vaihe) {
      let changes = false;
      for (const element of this.getAineistot(this.vaihe)) {
        changes = (await handleAineistot(this.oid, element.aineisto, element.paths)) || changes;
      }
      if (changes) {
        return this.vaihe;
      }
    }
  }

  isReady(): boolean {
    function hasAllAineistoValmis(element: AineistoPathsPair): boolean {
      if (!element.aineisto) {
        return true;
      }
      return element.aineisto?.every((a) => a.tila == AineistoTila.VALMIS);
    }

    let ready = true;
    if (this.vaihe) {
      const aineistot = this.getAineistot(this.vaihe);
      for (const element of aineistot) {
        const tmp = hasAllAineistoValmis(element);
        ready = ready && tmp;
      }

      const ladatutTiedostot = this.getLadatutTiedostot(this.vaihe);
      for (const ladattuTiedosto of ladatutTiedostot) {
        ready = ready && !!ladattuTiedosto.tuotu;
      }
    }
    return ready;
  }

  abstract getSchedule(): PublishOrExpireEvent[];

  abstract isAineistoVisible(julkaisu: J): boolean;
}

function getKuulutusSaamePDFt(saamePDFt: KuulutusSaamePDFt | null | undefined): LadattuTiedosto[] {
  const tiedostot: LadattuTiedosto[] = [];
  if (saamePDFt) {
    forEverySaameDo((kieli) => {
      const pdft = saamePDFt[kieli];
      if (pdft?.kuulutusPDF) {
        tiedostot.push(pdft.kuulutusPDF);
      }
      if (pdft?.kuulutusIlmoitusPDF) {
        tiedostot.push(pdft.kuulutusIlmoitusPDF);
      }
    });
  }
  return tiedostot;
}

export class AloitusKuulutusAineisto extends VaiheAineisto<AloitusKuulutus, AloitusKuulutusJulkaisu> {
  getAineistot(): AineistoPathsPair[] {
    return [];
  }

  getLadatutTiedostot(vaihe: AloitusKuulutus): LadattuTiedosto[] {
    return getKuulutusSaamePDFt(vaihe.aloituskuulutusSaamePDFt);
  }

  async synchronize(): Promise<boolean> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      return synchronizeFilesToPublic(
        this.oid,
        new ProjektiPaths(this.oid).aloituskuulutus(julkaisu),
        parseOptionalDate(julkaisu.kuulutusPaiva)
      );
    }
    return true;
  }

  getSchedule(): PublishOrExpireEvent[] {
    return (
      findJulkaisutWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY)?.reduce((schedule: PublishOrExpireEvent[], julkaisu) => {
        if (julkaisu.kuulutusPaiva) {
          schedule.push({
            reason: "Aloituskuulutus julkaisupäivä",
            type: PublishOrExpireEventType.PUBLISH,
            date: parseDate(julkaisu.kuulutusPaiva).startOf("day"),
          });
        }
        return schedule;
      }, []) || []
    );
  }

  isAineistoVisible(julkaisu: AloitusKuulutusJulkaisu): boolean {
    return !!julkaisu && !!julkaisu.kuulutusPaiva && parseDate(julkaisu.kuulutusPaiva).isBefore(nyt());
  }

  getAsianhallintaSynkronointi(
    projekti: DBProjekti,
    asianhallintaEventId: string | null | undefined
  ): AsianhallintaSynkronointi | undefined {
    const julkaisu = findJulkaisuWithAsianhallintaEventId(this.julkaisut, asianhallintaEventId);
    if (!julkaisu || !julkaisu.asianhallintaEventId) {
      // Yhteensopiva vanhan datan kanssa, josta asianhallintaEventId voi puuttua
      return;
    }
    const asiatunnus = getAsiatunnus(julkaisu.velho);
    assertIsDefined(asiatunnus);
    const aloituskuulutusPaths = new ProjektiPaths(projekti.oid).aloituskuulutus(julkaisu);
    const s3Paths = new S3Paths(aloituskuulutusPaths);
    forSuomiRuotsiDo((kieli) => {
      const aloituskuulutusPDF = julkaisu.aloituskuulutusPDFt?.[kieli];
      s3Paths.pushYllapitoFilesIfDefined(aloituskuulutusPDF?.aloituskuulutusPDFPath, aloituskuulutusPDF?.aloituskuulutusIlmoitusPDFPath);
    });

    forEverySaameDo((kieli) => {
      const aloituskuulutusPDF = julkaisu.aloituskuulutusSaamePDFt?.[kieli];
      s3Paths.pushYllapitoFilesIfDefined(aloituskuulutusPDF?.kuulutusPDF?.tiedosto, aloituskuulutusPDF?.kuulutusIlmoitusPDF?.tiedosto);
    });

    s3Paths.pushYllapitoFilesIfDefined(julkaisu.lahetekirje?.tiedosto);

    return {
      vaihe: julkaisu.uudelleenKuulutus ? "ALOITUSKUULUTUS_UUDELLEENKUULUTUS" : "ALOITUSKUULUTUS",
      asianhallintaEventId: julkaisu.asianhallintaEventId,
      asiatunnus,
      s3Paths: s3Paths.getPaths(),
      vaylaAsianhallinta: julkaisu.velho.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
    };
  }
}

export class VuorovaikutusKierrosAineisto extends VaiheAineisto<VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu> {
  private nahtavillaoloVaiheAineisto: NahtavillaoloVaiheAineisto;

  constructor(
    oid: string,
    vaihe: VuorovaikutusKierros | undefined | null,
    julkaisut: VuorovaikutusKierrosJulkaisu[] | undefined | null,
    nahtavillaoloVaiheAineisto: NahtavillaoloVaiheAineisto
  ) {
    super(oid, vaihe, julkaisut);
    this.nahtavillaoloVaiheAineisto = nahtavillaoloVaiheAineisto;
  }

  getAineistot(vaihe: VuorovaikutusKierros): AineistoPathsPair[] {
    const filePathInProjekti = this.projektiPaths.vuorovaikutus(vaihe).aineisto;
    return [
      { aineisto: vaihe.esittelyaineistot, paths: filePathInProjekti },
      {
        aineisto: vaihe.suunnitelmaluonnokset,
        paths: filePathInProjekti,
      },
    ];
  }

  getLadatutTiedostot(vaihe: VuorovaikutusKierros): LadattuTiedosto[] {
    const tiedostot: LadattuTiedosto[] = [];
    const saamePDFt = vaihe.vuorovaikutusSaamePDFt;
    if (saamePDFt) {
      forEverySaameDo((kieli) => {
        const pdft = saamePDFt[kieli];
        if (pdft) {
          tiedostot.push(pdft);
        }
      });
    }
    return tiedostot;
  }

  async synchronize(): Promise<boolean> {
    return (
      (await this.julkaisut?.reduce(async (promiseResult, julkaisu) => {
        const result = await promiseResult;
        const kuulutusPaiva = parseOptionalDate(julkaisu?.vuorovaikutusJulkaisuPaiva);
        // suunnitteluvaiheen aineistot poistuvat kansalaispuolelta, kun nähtävilläolokuulutus julkaistaan
        const kuulutusPaattyyPaiva = this.nahtavillaoloVaiheAineisto.getKuulutusPaiva();
        return (
          result &&
          synchronizeFilesToPublic(
            this.oid,
            new ProjektiPaths(this.oid).vuorovaikutus(julkaisu),
            kuulutusPaiva,
            kuulutusPaattyyPaiva?.startOf("day")
          )
        );
      }, Promise.resolve(true))) || true
    );
  }

  getSchedule(): PublishOrExpireEvent[] {
    return (
      this.julkaisut?.reduce((schedule, julkaisu: VuorovaikutusKierrosJulkaisu) => {
        const kuulutusPaiva = parseOptionalDate(julkaisu?.vuorovaikutusJulkaisuPaiva);
        if (kuulutusPaiva) {
          schedule.push({
            reason: "VuorovaikutusKierrosAineisto julkaisu",
            type: PublishOrExpireEventType.PUBLISH,
            date: kuulutusPaiva.startOf("day"),
          });
        }
        // suunnitteluvaiheen aineistot poistuvat kansalaispuolelta, kun nähtävilläolokuulutus julkaistaan
        const kuulutusPaattyyPaiva = this.nahtavillaoloVaiheAineisto.getKuulutusPaiva();
        if (kuulutusPaattyyPaiva) {
          schedule.push({
            reason: "VuorovaikutusKierrosAineisto julkaisu päättyy",
            type: PublishOrExpireEventType.EXPIRE,
            date: kuulutusPaattyyPaiva.startOf("day"),
          });
        }

        // Linkki verkossa julkaistaan 2 tuntia ennen tilaisuuden alkua. Linkki poistetaan verkosta tilaisuuden loputtua. Ajastetaan projektin tiedot päivittymään noina aikoina.
        julkaisu.vuorovaikutusTilaisuudet
          ?.filter((tilaisuus: VuorovaikutusTilaisuusJulkaisu) => tilaisuus.tyyppi == VuorovaikutusTilaisuusTyyppi.VERKOSSA)
          .forEach((tilaisuus: VuorovaikutusTilaisuusJulkaisu) => {
            schedule.push({
              reason: "VuorovaikutusTilaisuus linkki julkaistaan",
              type: PublishOrExpireEventType.EXPIRE,
              date: getVuorovaikutusTilaisuusLinkkiPublicationTime(tilaisuus),
            });
            schedule.push({
              reason: "VuorovaikutusTilaisuus linkki pois näkyvistä",
              type: PublishOrExpireEventType.EXPIRE,
              date: getVuorovaikutusTilaisuusLinkkiExpirationTime(tilaisuus),
            });
          });
        return schedule;
      }, [] as PublishOrExpireEvent[]) || ([] as PublishOrExpireEvent[])
    );
  }

  isAineistoVisible(julkaisu: VuorovaikutusKierrosJulkaisu): boolean {
    const kuulutusPaiva = parseOptionalDate(julkaisu?.vuorovaikutusJulkaisuPaiva);
    let julkinen = false;
    if (kuulutusPaiva?.isBefore(nyt())) {
      julkinen = true;
    }
    // suunnitteluvaiheen aineistot poistuvat kansalaispuolelta, kun nähtävilläolokuulutus julkaistaan
    const kuulutusPaattyyPaiva = this.nahtavillaoloVaiheAineisto.getKuulutusPaiva();
    if (kuulutusPaattyyPaiva?.startOf("day").isBefore(nyt())) {
      julkinen = false;
    }
    return julkinen;
  }

  getAsianhallintaSynkronointi(
    projekti: DBProjekti,
    asianhallintaEventId: string | null | undefined
  ): AsianhallintaSynkronointi | undefined {
    const julkaisu = findJulkaisuWithAsianhallintaEventId(this.julkaisut, asianhallintaEventId);
    if (!julkaisu || !julkaisu.asianhallintaEventId) {
      // Yhteensopiva vanhan datan kanssa, josta asianhallintaEventId voi puuttua
      return;
    }
    const asiatunnus = getAsiatunnus(projekti.velho);
    assertIsDefined(asiatunnus);
    const vuorovaikutusPaths = new ProjektiPaths(projekti.oid).vuorovaikutus(julkaisu);
    const s3Paths = new S3Paths(vuorovaikutusPaths);
    forSuomiRuotsiDo((kieli) => s3Paths.pushYllapitoFilesIfDefined(julkaisu.vuorovaikutusPDFt?.[kieli]?.kutsuPDFPath));
    forEverySaameDo((kieli) => s3Paths.pushYllapitoFilesIfDefined(julkaisu.vuorovaikutusSaamePDFt?.[kieli]?.tiedosto));

    s3Paths.pushYllapitoFilesIfDefined(julkaisu.lahetekirje?.tiedosto);

    assertIsDefined(projekti.velho?.suunnittelustaVastaavaViranomainen);
    return {
      vaihe: "SUUNNITTELUN_AIKAINEN_VUOROVAIKUTUS",
      asianhallintaEventId: julkaisu.asianhallintaEventId,
      asiatunnus,
      s3Paths: s3Paths.getPaths(),
      vaylaAsianhallinta: projekti.velho.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
    };
  }
}

export class VuorovaikutusKierrosJulkaisuAineisto extends VaiheAineisto<VuorovaikutusKierrosJulkaisu, unknown> {
  constructor(oid: string, julkaisu: VuorovaikutusKierrosJulkaisu | undefined | null) {
    super(oid, julkaisu, undefined);
  }

  getAineistot(julkaisu: VuorovaikutusKierrosJulkaisu): AineistoPathsPair[] {
    const paths = this.projektiPaths.vuorovaikutus(julkaisu).aineisto;
    return [
      { aineisto: julkaisu.esittelyaineistot, paths },
      { aineisto: julkaisu.suunnitelmaluonnokset, paths },
    ];
  }

  getLadatutTiedostot(): LadattuTiedosto[] {
    return [];
  }

  async synchronize(): Promise<boolean> {
    // VuorovaikutusKierrosAineisto vastuussa tästä
    throw new Error("Not implemented");
  }

  getSchedule(): PublishOrExpireEvent[] {
    // VuorovaikutusKierrosAineisto vastuussa tästä
    throw new Error("Not implemented");
  }

  isAineistoVisible(): boolean {
    // VuorovaikutusKierrosAineisto vastuussa tästä
    throw new Error("Not implemented");
  }

  getAsianhallintaSynkronointi(): undefined {
    // VuorovaikutusKierrosAineisto vastuussa tästä
    throw new Error("Not implemented");
  }
}

export class NahtavillaoloVaiheAineisto extends VaiheAineisto<NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu> {
  getAineistot(vaihe: NahtavillaoloVaihe): AineistoPathsPair[] {
    const paths = this.projektiPaths.nahtavillaoloVaihe(this.vaihe);
    return [
      { aineisto: vaihe.aineistoNahtavilla, paths },
      { aineisto: vaihe.lisaAineisto, paths },
    ];
  }

  getLadatutTiedostot(vaihe: NahtavillaoloVaihe): LadattuTiedosto[] {
    return getKuulutusSaamePDFt(vaihe.nahtavillaoloSaamePDFt);
  }

  async synchronize(): Promise<boolean> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      return synchronizeFilesToPublic(
        this.oid,
        this.projektiPaths.nahtavillaoloVaihe(julkaisu),
        parseOptionalDate(julkaisu.kuulutusPaiva),
        parseOptionalDate(julkaisu.kuulutusVaihePaattyyPaiva)?.endOf("day")
      );
    }
    return true;
  }

  getSchedule(): PublishOrExpireEvent[] {
    const julkaisut = findJulkaisutWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    return getPublishExpireScheduleForVaiheJulkaisut(julkaisut, "NahtavillaoloVaiheAineisto");
  }

  getKuulutusPaiva(): Dayjs | undefined {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      return parseOptionalDate(julkaisu.kuulutusPaiva);
    }
  }

  isAineistoVisible(julkaisu: NahtavillaoloVaiheJulkaisu): boolean {
    return isVaiheAineistoVisible(julkaisu);
  }

  getAsianhallintaSynkronointi(projekti: DBProjekti,
                               asianhallintaEventId: string | null | undefined): AsianhallintaSynkronointi | undefined {
    const julkaisu = findJulkaisuWithAsianhallintaEventId(this.julkaisut, asianhallintaEventId);
    if (!julkaisu || !julkaisu.asianhallintaEventId) {
      // Yhteensopiva vanhan datan kanssa, josta asianhallintaEventId voi puuttua
      return;
    }
    const asiatunnus = getAsiatunnus(projekti.velho);
    assertIsDefined(asiatunnus);
    const paths = new ProjektiPaths(projekti.oid).nahtavillaoloVaihe(julkaisu);
    const s3Paths = new S3Paths(paths);
    forSuomiRuotsiDo((kieli) => {
      const pdf = julkaisu.nahtavillaoloPDFt?.[kieli];
      s3Paths.pushYllapitoFilesIfDefined(
        pdf?.nahtavillaoloPDFPath,
        pdf?.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath,
        pdf?.nahtavillaoloIlmoitusPDFPath
      );
    });

    forEverySaameDo((kieli) => {
      const pdf = julkaisu.nahtavillaoloSaamePDFt?.[kieli];
      s3Paths.pushYllapitoFilesIfDefined(pdf?.kuulutusPDF?.tiedosto, pdf?.kuulutusIlmoitusPDF?.tiedosto);
    });

    s3Paths.pushYllapitoFilesIfDefined(julkaisu.lahetekirje?.tiedosto);

    assertIsDefined(projekti.velho?.suunnittelustaVastaavaViranomainen);
    return {
      vaihe: julkaisu.uudelleenKuulutus ? "NAHTAVILLAOLO_UUDELLEENKUULUTUS" : "NAHTAVILLAOLO",
      asianhallintaEventId: julkaisu.asianhallintaEventId,
      asiatunnus,
      s3Paths: s3Paths.getPaths(),
      vaylaAsianhallinta: projekti.velho.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
    };
  }
}

abstract class AbstractHyvaksymisPaatosVaiheAineisto extends VaiheAineisto<HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu> {
  getScheduleFor(description: string): PublishOrExpireEvent[] {
    const julkaisut = findJulkaisutWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    return getPublishExpireScheduleForVaiheJulkaisut(julkaisut, description);
  }

  isAineistoVisible(julkaisu: HyvaksymisPaatosVaiheJulkaisu): boolean {
    return isVaiheAineistoVisible(julkaisu);
  }
}

export class HyvaksymisPaatosVaiheAineisto extends AbstractHyvaksymisPaatosVaiheAineisto {
  getAineistot(vaihe: HyvaksymisPaatosVaihe): AineistoPathsPair[] {
    const paths = this.projektiPaths.hyvaksymisPaatosVaihe(this.vaihe);
    return [
      { aineisto: vaihe.aineistoNahtavilla, paths },
      { aineisto: vaihe.hyvaksymisPaatos, paths: paths.paatos },
    ];
  }

  getLadatutTiedostot(vaihe: HyvaksymisPaatosVaihe): LadattuTiedosto[] {
    return getKuulutusSaamePDFt(vaihe.hyvaksymisPaatosVaiheSaamePDFt);
  }

  async synchronize(): Promise<boolean> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      return synchronizeFilesToPublic(
        this.oid,
        this.projektiPaths.hyvaksymisPaatosVaihe(julkaisu),
        parseOptionalDate(julkaisu.kuulutusPaiva),
        parseOptionalDate(julkaisu.kuulutusVaihePaattyyPaiva)?.endOf("day")
      );
    }
    return true;
  }

  getSchedule(): PublishOrExpireEvent[] {
    return super.getScheduleFor("HyvaksymisPaatosVaiheAineisto");
  }

  getAsianhallintaSynkronointi(
    projekti: DBProjekti,
    asianhallintaEventId: string | null | undefined
  ): AsianhallintaSynkronointi | undefined {
    const julkaisu = findJulkaisuWithAsianhallintaEventId(this.julkaisut, asianhallintaEventId);
    if (!julkaisu || !julkaisu.asianhallintaEventId) {
      // Yhteensopiva vanhan datan kanssa, josta asianhallintaEventId voi puuttua
      return;
    }
    const asiatunnus = getAsiatunnus(projekti.velho);
    assertIsDefined(asiatunnus);
    const paths = new ProjektiPaths(projekti.oid).hyvaksymisPaatosVaihe(julkaisu);
    const s3Paths = new S3Paths(paths);
    forSuomiRuotsiDo((kieli) => {
      const pdf = julkaisu.hyvaksymisPaatosVaihePDFt?.[kieli];
      s3Paths.pushYllapitoFilesIfDefined(
        pdf?.hyvaksymisKuulutusPDFPath,
        pdf?.hyvaksymisIlmoitusLausunnonantajillePDFPath,
        pdf?.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath,
        pdf?.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath
      );
    });

    forEverySaameDo((kieli) => {
      const pdf = julkaisu.hyvaksymisPaatosVaiheSaamePDFt?.[kieli];
      s3Paths.pushYllapitoFilesIfDefined(pdf?.kuulutusPDF?.tiedosto, pdf?.kuulutusIlmoitusPDF?.tiedosto);
    });

    s3Paths.pushYllapitoFilesIfDefined(julkaisu.lahetekirje?.tiedosto);

    assertIsDefined(projekti.velho?.suunnittelustaVastaavaViranomainen);
    return {
      vaihe: julkaisu.uudelleenKuulutus ? "HYVAKSYMISPAATOS_UUDELLEENKUULUTUS" : "HYVAKSYMISPAATOS",
      asianhallintaEventId: julkaisu.asianhallintaEventId,
      asiatunnus,
      s3Paths: s3Paths.getPaths(),
      vaylaAsianhallinta: projekti.velho.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
    };
  }
}

export class JatkoPaatos1VaiheAineisto extends AbstractHyvaksymisPaatosVaiheAineisto {
  getAineistot(vaihe: HyvaksymisPaatosVaihe): AineistoPathsPair[] {
    const paths = this.projektiPaths.jatkoPaatos1Vaihe(this.vaihe);
    return [
      { aineisto: vaihe.aineistoNahtavilla, paths },
      { aineisto: vaihe.hyvaksymisPaatos, paths: paths.paatos },
    ];
  }

  getLadatutTiedostot(vaihe: HyvaksymisPaatosVaihe): LadattuTiedosto[] {
    return getKuulutusSaamePDFt(vaihe.hyvaksymisPaatosVaiheSaamePDFt);
  }

  async synchronize(): Promise<boolean> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      return synchronizeFilesToPublic(
        this.oid,
        this.projektiPaths.jatkoPaatos1Vaihe(julkaisu),
        parseOptionalDate(julkaisu.kuulutusPaiva),
        parseOptionalDate(julkaisu.kuulutusVaihePaattyyPaiva)?.endOf("day")
      );
    }
    return true;
  }

  getSchedule(): PublishOrExpireEvent[] {
    return super.getScheduleFor("JatkoPaatos1VaiheAineisto");
  }

  getAsianhallintaSynkronointi(): undefined {
    // Ei määritelty
    return undefined;
  }
}

export class JatkoPaatos2VaiheAineisto extends AbstractHyvaksymisPaatosVaiheAineisto {
  getAineistot(vaihe: HyvaksymisPaatosVaihe): AineistoPathsPair[] {
    const paths = this.projektiPaths.jatkoPaatos2Vaihe(this.vaihe);
    return [
      { aineisto: vaihe.aineistoNahtavilla, paths },
      { aineisto: vaihe.hyvaksymisPaatos, paths: paths.paatos },
    ];
  }

  getLadatutTiedostot(vaihe: HyvaksymisPaatosVaihe): LadattuTiedosto[] {
    return getKuulutusSaamePDFt(vaihe.hyvaksymisPaatosVaiheSaamePDFt);
  }

  async synchronize(): Promise<boolean> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      return synchronizeFilesToPublic(
        this.oid,
        new ProjektiPaths(this.oid).jatkoPaatos2Vaihe(julkaisu),
        parseOptionalDate(julkaisu.kuulutusPaiva),
        parseOptionalDate(julkaisu.kuulutusVaihePaattyyPaiva)?.endOf("day")
      );
    }
    return true;
  }

  getSchedule(): PublishOrExpireEvent[] {
    return super.getScheduleFor("JatkoPaatos2VaiheAineisto");
  }

  getAsianhallintaSynkronointi(): undefined {
    // Ei määritelty
    return undefined;
  }
}

function getPublishExpireScheduleForVaiheJulkaisut(
  julkaisut: Pick<NahtavillaoloVaiheJulkaisu & HyvaksymisPaatosVaiheJulkaisu, "kuulutusPaiva" | "kuulutusVaihePaattyyPaiva">[] | undefined,
  description: string
): PublishOrExpireEvent[] {
  return (
    julkaisut?.reduce((events: PublishOrExpireEvent[], julkaisu) => {
      const kuulutusPaiva = parseOptionalDate(julkaisu.kuulutusPaiva);
      if (kuulutusPaiva) {
        events.push({
          reason: description + " kuulutuspäivä",
          type: PublishOrExpireEventType.PUBLISH,
          date: kuulutusPaiva.startOf("day"),
        });
      }

      const kuulutusVaihePaattyyPaiva = parseOptionalDate(julkaisu.kuulutusVaihePaattyyPaiva);
      if (kuulutusVaihePaattyyPaiva) {
        events.push({
          reason: description + " kuulutusvaihe päättyy",
          type: PublishOrExpireEventType.EXPIRE,
          date: kuulutusVaihePaattyyPaiva.endOf("day"),
        });
      }
      return events;
    }, [] as PublishOrExpireEvent[]) || []
  );
}

function isVaiheAineistoVisible(julkaisu: HyvaksymisPaatosVaiheJulkaisu | NahtavillaoloVaiheJulkaisu) {
  return (
    !!julkaisu &&
    !!julkaisu.kuulutusPaiva &&
    isDateTimeInThePast(julkaisu.kuulutusPaiva, "start-of-day") &&
    !!julkaisu.kuulutusVaihePaattyyPaiva &&
    !isDateTimeInThePast(julkaisu.kuulutusVaihePaattyyPaiva, "end-of-day")
  );
}

async function handleAineistot(oid: string, aineistot: Aineisto[] | null | undefined, paths: PathTuple): Promise<boolean> {
  if (!aineistot) {
    return false;
  }
  let hasChanges = false;
  const originalAineistot = aineistot.splice(0, aineistot.length); // Move list contents to a separate list. Aineistot list contents are formed in the following loop
  for (const aineisto of originalAineistot) {
    if (aineisto.tila == AineistoTila.ODOTTAA_POISTOA) {
      await aineistoService.deleteAineisto(oid, aineisto, paths.yllapitoPath, paths.publicPath, "ODOTTAA_POISTOA");
      hasChanges = true;
    } else if (aineisto.tila == AineistoTila.ODOTTAA_TUONTIA) {
      await importAineisto(aineisto, oid, paths);
      aineistot.push(aineisto);
      hasChanges = true;
    } else {
      aineistot.push(aineisto);
    }
  }

  return hasChanges;
}

async function importAineisto(aineisto: Aineisto, oid: string, path: PathTuple) {
  const { disposition, contents } = await velho.getAineisto(aineisto.dokumenttiOid);
  const fileName = contentDisposition.parse(disposition).parameters.filename;
  if (!fileName) {
    throw new Error("Tiedoston nimeä ei pystytty päättelemään: '" + disposition + "'");
  }
  const contentType = mime.lookup(fileName);
  aineisto.tiedosto = await fileService.createAineistoToProjekti({
    oid,
    path,
    fileName,
    contentType: contentType || undefined,
    inline: true,
    contents,
  });
  aineisto.tila = AineistoTila.VALMIS;
  aineisto.tuotu = nyt().format();
}

export function getVuorovaikutusTilaisuusLinkkiPublicationTime(tilaisuus: VuorovaikutusTilaisuusJulkaisu): Dayjs {
  return parseDate(tilaisuus.paivamaara + "T" + tilaisuus.alkamisAika).subtract(2, "hours");
}

export function getVuorovaikutusTilaisuusLinkkiExpirationTime(tilaisuus: VuorovaikutusTilaisuusJulkaisu): Dayjs {
  return parseDate(tilaisuus.paivamaara + "T" + tilaisuus.paattymisAika);
}

export function isVerkkotilaisuusLinkkiVisible(julkaisu: VuorovaikutusTilaisuusJulkaisu): boolean {
  const now = nyt();
  return (
    getVuorovaikutusTilaisuusLinkkiPublicationTime(julkaisu).isBefore(now) &&
    getVuorovaikutusTilaisuusLinkkiExpirationTime(julkaisu).isAfter(now)
  );
}

class S3Paths {
  private readonly paths: PathTuple;
  private readonly s3Paths: string[];

  constructor(paths: PathTuple) {
    this.paths = paths;
    this.s3Paths = [];
  }

  pushYllapitoFilesIfDefined(...filePaths: (string | undefined)[]) {
    if (filePaths) {
      filePaths.forEach((filePath) => {
        if (filePath) {
          this.s3Paths.push(fileService.getYllapitoPathForProjektiFile(this.paths, filePath));
        }
      });
    }
  }

  getPaths(): string[] {
    return this.s3Paths;
  }
}
