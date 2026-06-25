// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import { expect } from "chai";
import {
  HyvaksymisPaatosVaiheScheduleManager,
  JatkoPaatos1VaiheScheduleManager,
  JatkoPaatos2VaiheScheduleManager,
  NahtavillaoloVaiheScheduleManager,
  PublishOrExpireEventType,
} from "../../src/sqsEvents/projektiScheduleManager";
import { KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";
import { NahtavillaoloVaiheJulkaisu, PaatosVaiheJulkaisu } from "../../src/database/model";

function asNahtavillaolo(obj: unknown): NahtavillaoloVaiheJulkaisu {
  return obj as NahtavillaoloVaiheJulkaisu;
}

function asPaatos(obj: unknown): PaatosVaiheJulkaisu {
  return obj as PaatosVaiheJulkaisu;
}

describe("projektiScheduleManager", () => {
  describe("NahtavillaoloVaiheScheduleManager", () => {
    it("should create schedule for single approved julkaisu", () => {
      const julkaisu = asNahtavillaolo({
        id: 1,
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        kuulutusPaiva: "2025-01-15",
        kuulutusVaihePaattyyPaiva: "2025-02-15",
        hyvaksyja: "test",
        hyvaksymisPaiva: "2025-01-10",
      });
      const julkaisut: NahtavillaoloVaiheJulkaisu[] = [julkaisu];

      const manager = new NahtavillaoloVaiheScheduleManager("1.2.3", undefined, julkaisut);
      const schedule = manager.getSchedule();

      expect(schedule).to.have.lengthOf(2);
      expect(schedule[0].type).to.equal(PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO);
      expect(schedule[0].date.format("YYYY-MM-DD")).to.equal("2025-01-15");
      expect(schedule[1].type).to.equal(PublishOrExpireEventType.EXPIRE);
      expect(schedule[1].date.format("YYYY-MM-DD")).to.equal("2025-02-15");
    });

    it("should create schedule only for latest approved julkaisu when there is uudelleenkuulutus", () => {
      const julkaisu1 = asNahtavillaolo({
        id: 1,
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        kuulutusPaiva: "2025-01-15",
        kuulutusVaihePaattyyPaiva: "2025-02-15",
        hyvaksyja: "test",
        hyvaksymisPaiva: "2025-01-10",
      });
      const julkaisu2 = asNahtavillaolo({
        id: 2,
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        kuulutusPaiva: "2025-02-01",
        kuulutusVaihePaattyyPaiva: "2025-03-15",
        hyvaksyja: "test",
        hyvaksymisPaiva: "2025-01-25",
        uudelleenKuulutus: {
          alkuperainenHyvaksymisPaiva: "2025-01-10",
          tiedotaKiinteistonomistajia: true,
        },
      });
      const julkaisut: NahtavillaoloVaiheJulkaisu[] = [julkaisu1, julkaisu2];

      const manager = new NahtavillaoloVaiheScheduleManager("1.2.3", undefined, julkaisut);
      const schedule = manager.getSchedule();

      // Should only have schedules for the latest (uudelleenkuulutettu) julkaisu
      expect(schedule).to.have.lengthOf(2);
      expect(schedule[0].type).to.equal(PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO);
      expect(schedule[0].date.format("YYYY-MM-DD")).to.equal("2025-02-01");
      expect(schedule[1].type).to.equal(PublishOrExpireEventType.EXPIRE);
      expect(schedule[1].date.format("YYYY-MM-DD")).to.equal("2025-03-15");
    });

    it("should return empty schedule when no approved julkaisut", () => {
      const julkaisu = asNahtavillaolo({
        id: 1,
        tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
        kuulutusPaiva: "2025-01-15",
        kuulutusVaihePaattyyPaiva: "2025-02-15",
      });
      const julkaisut: NahtavillaoloVaiheJulkaisu[] = [julkaisu];

      const manager = new NahtavillaoloVaiheScheduleManager("1.2.3", undefined, julkaisut);
      const schedule = manager.getSchedule();

      expect(schedule).to.be.empty;
    });
  });

  describe("HyvaksymisPaatosVaiheScheduleManager", () => {
    it("should create schedule for single approved julkaisu", () => {
      const julkaisu = asPaatos({
        id: 1,
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        kuulutusPaiva: "2025-01-15",
        kuulutusVaihePaattyyPaiva: "2025-02-15",
        hyvaksyja: "test",
        hyvaksymisPaiva: "2025-01-10",
      });
      const julkaisut: PaatosVaiheJulkaisu[] = [julkaisu];

      const manager = new HyvaksymisPaatosVaiheScheduleManager("1.2.3", undefined, julkaisut);
      const schedule = manager.getSchedule();

      // Should have: PUBLISH, EXPIRE, EPAAKTIVOI, ONE_MONTH_TO_INACTIVE
      expect(schedule).to.have.lengthOf(4);
      expect(schedule[0].type).to.equal(PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOSVAIHE);
      expect(schedule[1].type).to.equal(PublishOrExpireEventType.EXPIRE);
      expect(schedule[2].type).to.equal(PublishOrExpireEventType.EXPIRE);
      expect(schedule[3].type).to.equal(PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOS_EPAAKTIVOITUU_KK);
    });

    it("should create schedule only for latest approved julkaisu when there is uudelleenkuulutus", () => {
      const julkaisu1 = asPaatos({
        id: 1,
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        kuulutusPaiva: "2025-01-15",
        kuulutusVaihePaattyyPaiva: "2025-02-15",
        hyvaksyja: "test",
        hyvaksymisPaiva: "2025-01-10",
      });
      const julkaisu2 = asPaatos({
        id: 2,
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        kuulutusPaiva: "2025-02-01",
        kuulutusVaihePaattyyPaiva: "2025-03-15",
        hyvaksyja: "test",
        hyvaksymisPaiva: "2025-01-25",
        uudelleenKuulutus: {
          alkuperainenHyvaksymisPaiva: "2025-01-10",
          tiedotaKiinteistonomistajia: true,
        },
      });
      const julkaisut: PaatosVaiheJulkaisu[] = [julkaisu1, julkaisu2];

      const manager = new HyvaksymisPaatosVaiheScheduleManager("1.2.3", undefined, julkaisut);
      const schedule = manager.getSchedule();

      // Should only have schedules for the latest (uudelleenkuulutettu) julkaisu
      expect(schedule).to.have.lengthOf(4);
      expect(schedule[0].date.format("YYYY-MM-DD")).to.equal("2025-02-01");
      expect(schedule[1].date.format("YYYY-MM-DD")).to.equal("2025-03-15");
    });
  });

  describe("JatkoPaatos1VaiheScheduleManager", () => {
    it("should create schedule only for latest approved julkaisu when there is uudelleenkuulutus", () => {
      const julkaisu1 = asPaatos({
        id: 1,
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        kuulutusPaiva: "2025-01-15",
        kuulutusVaihePaattyyPaiva: "2025-02-15",
        hyvaksyja: "test",
        hyvaksymisPaiva: "2025-01-10",
      });
      const julkaisu2 = asPaatos({
        id: 2,
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        kuulutusPaiva: "2025-02-01",
        kuulutusVaihePaattyyPaiva: "2025-03-15",
        hyvaksyja: "test",
        hyvaksymisPaiva: "2025-01-25",
        uudelleenKuulutus: {
          alkuperainenHyvaksymisPaiva: "2025-01-10",
          tiedotaKiinteistonomistajia: false,
        },
      });
      const julkaisut: PaatosVaiheJulkaisu[] = [julkaisu1, julkaisu2];

      const manager = new JatkoPaatos1VaiheScheduleManager("1.2.3", undefined, julkaisut);
      const schedule = manager.getSchedule();

      // Should only have schedules for the latest julkaisu
      expect(schedule).to.have.lengthOf(4);
      expect(schedule[0].type).to.equal(PublishOrExpireEventType.PUBLISH_JATKOPAATOS1VAIHE);
      expect(schedule[0].date.format("YYYY-MM-DD")).to.equal("2025-02-01");
      expect(schedule[1].date.format("YYYY-MM-DD")).to.equal("2025-03-15");
    });
  });

  describe("JatkoPaatos2VaiheScheduleManager", () => {
    it("should create schedule only for latest approved julkaisu when there is uudelleenkuulutus", () => {
      const julkaisu1 = asPaatos({
        id: 1,
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        kuulutusPaiva: "2025-01-15",
        kuulutusVaihePaattyyPaiva: "2025-02-15",
        hyvaksyja: "test",
        hyvaksymisPaiva: "2025-01-10",
      });
      const julkaisu2 = asPaatos({
        id: 2,
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        kuulutusPaiva: "2025-02-01",
        kuulutusVaihePaattyyPaiva: "2025-03-15",
        hyvaksyja: "test",
        hyvaksymisPaiva: "2025-01-25",
        uudelleenKuulutus: {
          alkuperainenHyvaksymisPaiva: "2025-01-10",
          tiedotaKiinteistonomistajia: false,
        },
      });
      const julkaisut: PaatosVaiheJulkaisu[] = [julkaisu1, julkaisu2];

      const manager = new JatkoPaatos2VaiheScheduleManager("1.2.3", undefined, julkaisut);
      const schedule = manager.getSchedule();

      // Should only have schedules for the latest julkaisu
      expect(schedule).to.have.lengthOf(4);
      expect(schedule[0].type).to.equal(PublishOrExpireEventType.PUBLISH_JATKOPAATOS2VAIHE);
      expect(schedule[0].date.format("YYYY-MM-DD")).to.equal("2025-02-01");
      expect(schedule[1].date.format("YYYY-MM-DD")).to.equal("2025-03-15");
    });
  });
});
