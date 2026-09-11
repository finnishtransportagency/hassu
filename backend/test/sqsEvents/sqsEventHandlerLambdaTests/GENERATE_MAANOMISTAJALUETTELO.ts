// Contains code generated or recommended by Amazon Q
import { DBProjekti } from "../../../src/database/model";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import { fakeEventInSqsQueueWithApprovalType, stubBasics } from "./util/util";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";
import sinon from "sinon";
import { omistajaDatabase } from "../../../src/database/omistajaDatabase";
import { asianhallintaService } from "../../../src/asianhallinta/asianhallintaService";
import * as tiedotettavatExcel from "../../../src/mml/tiedotettavatExcel";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { PublishOrExpireEventType } from "../../../src/sqsEvents/projektiScheduleManager";
import { TiedotettavanLahetyksenTila } from "hassu-common/graphql/apiModel";

const OID = "1.2.246.578.5.1.2978288874.2711575506";
const HYVAKSYMISPAIVA = "2022-01-01";
const LAHETYSAIKA_AFTER = "2022-01-02T00:00:00";

function baseProjekti(): DBProjekti {
  return {
    oid: OID,
    versio: 1,
    kayttoOikeudet: [],
    salt: "salt",
    tallennettu: true,
    velho: {
      nimi: "Projekti 1",
      asiatunnusVayla: "VAYLA/1234/2022",
      suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
    },
    kielitiedot: { ensisijainenKieli: API.Kieli.SUOMI },
  };
}

function aloitusKuulutusJulkaisu(overrides?: object) {
  // as any: testitiedoissa ei tarvita kaikkia pakollisia kenttiä
  return {
    id: 1,
    tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
    hyvaksymisPaiva: HYVAKSYMISPAIVA,
    kuulutusPaiva: "2022-01-01",
    asianhallintaEventId: "event-123",
    yhteystiedot: [],
    kuulutusYhteystiedot: {},
    velho: { nimi: "Projekti 1" },
    hankkeenKuvaus: { SUOMI: "kuvaus" },
    kielitiedot: { ensisijainenKieli: API.Kieli.SUOMI },
    ...overrides,
  } as any;
}

export const doesNotGenerateWhenNotAllHandled = async () => {
  const projekti: DBProjekti = {
    ...baseProjekti(),
    aloitusKuulutusJulkaisut: [aloitusKuulutusJulkaisu()],
  };
  stubBasics({ loadProjektiByOidReturnValue: projekti, applyProjektiStatusSetStatus: API.Status.ALOITUSKUULUTUS });
  sinon.stub(omistajaDatabase, "haeProjektinKaytossaolevatOmistajat").resolves([
    {
      // as any: aws-sdk-client-mock type incompatibility, ks. testing-and-verification.md
      id: "omistaja-1",
      oid: OID,
      kiinteistotunnus: "123",
      lisatty: "2022-01-01",
      kaytossa: true,
      suomifiLahetys: true,
      lahetykset: [], // ei yhtään lähetystä → ei allHandled
    } as any,
  ]);
  const tallennaMaanomistajaluetteloStub = sinon.stub(tiedotettavatExcel, "tallennaMaanomistajaluettelo");
  const saveAndEnqueueStub = sinon.stub(asianhallintaService, "saveAndEnqueueSynchronization");

  const handler = fakeEventInSqsQueueWithApprovalType({
    eventType: SqsEventType.GENERATE_MAANOMISTAJALUETTELO,
    projektiOid: OID,
    approvalType: PublishOrExpireEventType.PUBLISH_ALOITUSKUULUTUS,
  });
  await handler();

  expect(tallennaMaanomistajaluetteloStub.callCount).to.eql(0);
  expect(saveAndEnqueueStub.callCount).to.eql(0);
};

export const generatesAndSendsToAsianhallintaWhenAllHandled = async () => {
  const projekti: DBProjekti = {
    ...baseProjekti(),
    aloitusKuulutusJulkaisut: [aloitusKuulutusJulkaisu()],
  };
  stubBasics({ loadProjektiByOidReturnValue: projekti, applyProjektiStatusSetStatus: API.Status.ALOITUSKUULUTUS });
  sinon.stub(omistajaDatabase, "haeProjektinKaytossaolevatOmistajat").resolves([
    {
      id: "omistaja-1",
      oid: OID,
      kiinteistotunnus: "123",
      lisatty: "2022-01-01",
      kaytossa: true,
      suomifiLahetys: true,
      lahetykset: [
        {
          tila: TiedotettavanLahetyksenTila.OK,
          lahetysaika: LAHETYSAIKA_AFTER,
          tyyppi: PublishOrExpireEventType.PUBLISH_ALOITUSKUULUTUS,
        },
      ],
    } as any,
  ]);
  sinon.stub(tiedotettavatExcel, "tallennaMaanomistajaluettelo").resolves("/aloituskuulutus/1/Maanomistajaluettelo.xlsx");
  const aloitusKuulutusJulkaisutUpdateStub = sinon.stub(projektiDatabase.aloitusKuulutusJulkaisut, "update").resolves(true);
  const saveAndEnqueueStub = sinon.stub(asianhallintaService, "saveAndEnqueueSynchronization").resolves();

  const handler = fakeEventInSqsQueueWithApprovalType({
    eventType: SqsEventType.GENERATE_MAANOMISTAJALUETTELO,
    projektiOid: OID,
    approvalType: PublishOrExpireEventType.PUBLISH_ALOITUSKUULUTUS,
  });
  await handler();

  expect(aloitusKuulutusJulkaisutUpdateStub.callCount).to.eql(1);
  expect(saveAndEnqueueStub.callCount).to.eql(1);
  const syncArgs = saveAndEnqueueStub.firstCall.args[1];
  expect(syncArgs.asianhallintaEventId).to.eql("event-123_maanomistajaluettelo");
  expect(syncArgs.toimenpideTyyppi).to.eql("ENSIMMAINEN_VERSIO");
};

export const doesNotGenerateWhenMaanomistajaluetteloAlreadyExists = async () => {
  const projekti: DBProjekti = {
    ...baseProjekti(),
    aloitusKuulutusJulkaisut: [aloitusKuulutusJulkaisu({ maanomistajaluettelo: "/aloituskuulutus/1/Maanomistajaluettelo.xlsx" })],
  };
  stubBasics({ loadProjektiByOidReturnValue: projekti, applyProjektiStatusSetStatus: API.Status.ALOITUSKUULUTUS });
  sinon.stub(omistajaDatabase, "haeProjektinKaytossaolevatOmistajat").resolves([
    {
      id: "omistaja-1",
      oid: OID,
      kiinteistotunnus: "123",
      lisatty: "2022-01-01",
      kaytossa: true,
      suomifiLahetys: true,
      lahetykset: [
        {
          tila: TiedotettavanLahetyksenTila.OK,
          lahetysaika: LAHETYSAIKA_AFTER,
          tyyppi: PublishOrExpireEventType.PUBLISH_ALOITUSKUULUTUS,
        },
      ],
    } as any,
  ]);
  const tallennaMaanomistajaluetteloStub = sinon.stub(tiedotettavatExcel, "tallennaMaanomistajaluettelo");
  const saveAndEnqueueStub = sinon.stub(asianhallintaService, "saveAndEnqueueSynchronization");

  const handler = fakeEventInSqsQueueWithApprovalType({
    eventType: SqsEventType.GENERATE_MAANOMISTAJALUETTELO,
    projektiOid: OID,
    approvalType: PublishOrExpireEventType.PUBLISH_ALOITUSKUULUTUS,
  });
  await handler();

  expect(tallennaMaanomistajaluetteloStub.callCount).to.eql(0);
  expect(saveAndEnqueueStub.callCount).to.eql(0);
};

export const setsToimenpideTyyppiUudelleenkuulutusWhenUudelleenKuulutus = async () => {
  const projekti: DBProjekti = {
    ...baseProjekti(),
    aloitusKuulutusJulkaisut: [
      aloitusKuulutusJulkaisu({
        uudelleenKuulutus: { tiedotaKiinteistonomistajia: true },
      }),
    ],
  };
  stubBasics({ loadProjektiByOidReturnValue: projekti, applyProjektiStatusSetStatus: API.Status.ALOITUSKUULUTUS });
  sinon.stub(omistajaDatabase, "haeProjektinKaytossaolevatOmistajat").resolves([
    {
      id: "omistaja-1",
      oid: OID,
      kiinteistotunnus: "123",
      lisatty: "2022-01-01",
      kaytossa: true,
      suomifiLahetys: true,
      lahetykset: [
        {
          tila: TiedotettavanLahetyksenTila.OK,
          lahetysaika: LAHETYSAIKA_AFTER,
          tyyppi: PublishOrExpireEventType.PUBLISH_ALOITUSKUULUTUS,
        },
      ],
    } as any,
  ]);
  sinon.stub(tiedotettavatExcel, "tallennaMaanomistajaluettelo").resolves("/aloituskuulutus/1/Maanomistajaluettelo.xlsx");
  sinon.stub(projektiDatabase.aloitusKuulutusJulkaisut, "update").resolves(true);
  const saveAndEnqueueStub = sinon.stub(asianhallintaService, "saveAndEnqueueSynchronization").resolves();

  const handler = fakeEventInSqsQueueWithApprovalType({
    eventType: SqsEventType.GENERATE_MAANOMISTAJALUETTELO,
    projektiOid: OID,
    approvalType: PublishOrExpireEventType.PUBLISH_ALOITUSKUULUTUS,
  });
  await handler();

  expect(saveAndEnqueueStub.callCount).to.eql(1);
  expect(saveAndEnqueueStub.firstCall.args[1].toimenpideTyyppi).to.eql("UUDELLEENKUULUTUS");
};

export const doesNotGenerateWhenHyvaksymisPaivaMissing = async () => {
  const projekti: DBProjekti = {
    ...baseProjekti(),
    aloitusKuulutusJulkaisut: [aloitusKuulutusJulkaisu({ hyvaksymisPaiva: undefined })],
  };
  stubBasics({ loadProjektiByOidReturnValue: projekti, applyProjektiStatusSetStatus: API.Status.ALOITUSKUULUTUS });
  sinon.stub(omistajaDatabase, "haeProjektinKaytossaolevatOmistajat").resolves([]);
  const tallennaMaanomistajaluetteloStub = sinon.stub(tiedotettavatExcel, "tallennaMaanomistajaluettelo");
  const saveAndEnqueueStub = sinon.stub(asianhallintaService, "saveAndEnqueueSynchronization");

  const handler = fakeEventInSqsQueueWithApprovalType({
    eventType: SqsEventType.GENERATE_MAANOMISTAJALUETTELO,
    projektiOid: OID,
    approvalType: PublishOrExpireEventType.PUBLISH_ALOITUSKUULUTUS,
  });
  await handler();

  expect(tallennaMaanomistajaluetteloStub.callCount).to.eql(0);
  expect(saveAndEnqueueStub.callCount).to.eql(0);
};

export const doesNotSendToAsianhallintaWhenAsiatunnusMissing = async () => {
  const projekti: DBProjekti = {
    ...baseProjekti(),
    velho: { nimi: "Projekti 1" }, // ei asiatunnusta
    aloitusKuulutusJulkaisut: [aloitusKuulutusJulkaisu()],
  };
  stubBasics({ loadProjektiByOidReturnValue: projekti, applyProjektiStatusSetStatus: API.Status.ALOITUSKUULUTUS });
  sinon.stub(omistajaDatabase, "haeProjektinKaytossaolevatOmistajat").resolves([
    {
      id: "omistaja-1",
      oid: OID,
      kiinteistotunnus: "123",
      lisatty: "2022-01-01",
      kaytossa: true,
      suomifiLahetys: true,
      lahetykset: [
        {
          tila: TiedotettavanLahetyksenTila.OK,
          lahetysaika: LAHETYSAIKA_AFTER,
          tyyppi: PublishOrExpireEventType.PUBLISH_ALOITUSKUULUTUS,
        },
      ],
    } as any,
  ]);
  const tallennaMaanomistajaluetteloStub = sinon.stub(tiedotettavatExcel, "tallennaMaanomistajaluettelo");
  const saveAndEnqueueStub = sinon.stub(asianhallintaService, "saveAndEnqueueSynchronization");

  const handler = fakeEventInSqsQueueWithApprovalType({
    eventType: SqsEventType.GENERATE_MAANOMISTAJALUETTELO,
    projektiOid: OID,
    approvalType: PublishOrExpireEventType.PUBLISH_ALOITUSKUULUTUS,
  });
  await handler();

  expect(tallennaMaanomistajaluetteloStub.callCount).to.eql(0);
  expect(saveAndEnqueueStub.callCount).to.eql(0);
};
