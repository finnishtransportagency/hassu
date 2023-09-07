import { NextApiRequest, NextApiResponse } from "next";
import { authenticateAndLoadProjekti } from "../../../util/apiUtil.dev";
import { ProjektiTestCommandExecutor } from "../../../../common/testUtil.dev";
import { projektiDatabase } from "../../../../backend/src/database/projektiDatabase";
import dayjs from "dayjs";
import { DBProjekti } from "../../../../backend/src/database/model";
import { testProjektiDatabase } from "../../../../backend/src/database/testProjektiDatabase";
import { importProjekti, TargetStatuses } from "../../../../backend/src/migraatio/migration";
import { NykyinenKayttaja } from "../../../../common/graphql/apiModel";
import { aineistoSynchronizationSchedulerService } from "../../../../backend/src/aineisto/aineistoSynchronizationSchedulerService";
import { fileService } from "../../../../backend/src/files/fileService";
import { ProjektiPaths } from "../../../../backend/src/files/ProjektiPath";
import { asianhallintaService } from "../../../../backend/src/asianhallinta/asianhallintaService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const dbProjekti = await authenticateAndLoadProjekti(req, res);

  let executor = new ProjektiTestCommandExecutor(req.query);

  function requireProjekti() {
    if (!dbProjekti) {
      res.send("Projektia ei löydy.");
    }
  }

  await executor.onVuorovaikutusKierrosMenneisyyteen(async () => {
    requireProjekti();
    if (dbProjekti?.vuorovaikutusKierrosJulkaisut) {
      for (const julkaisu of dbProjekti.vuorovaikutusKierrosJulkaisut) {
        julkaisu.vuorovaikutusTilaisuudet?.forEach((tilaisuus) => {
          tilaisuus.paivamaara = "2022-01-01";
        });
        await projektiDatabase.vuorovaikutusKierrosJulkaisut.update(dbProjekti, julkaisu);
      }
      await aineistoSynchronizationSchedulerService.synchronizeProjektiFiles(dbProjekti.oid);
    }
  });

  await executor.onNahtavillaoloMenneisyyteen(async () => {
    requireProjekti();
    if (dbProjekti?.nahtavillaoloVaiheJulkaisut) {
      for (const julkaisu of dbProjekti.nahtavillaoloVaiheJulkaisut) {
        julkaisu.kuulutusVaihePaattyyPaiva = "2022-01-01";
        await projektiDatabase.nahtavillaoloVaiheJulkaisut.update(dbProjekti, julkaisu);
      }
      await aineistoSynchronizationSchedulerService.synchronizeProjektiFiles(dbProjekti.oid);
    }
  });

  await executor.onHyvaksymispaatosMenneisyyteen(async () => {
    requireProjekti();
    if (dbProjekti?.hyvaksymisPaatosVaiheJulkaisut) {
      for (const julkaisu of dbProjekti.hyvaksymisPaatosVaiheJulkaisut) {
        let yesterday = dayjs().add(-1, "day").format("YYYY-MM-DD");
        julkaisu.kuulutusPaiva = yesterday;
        julkaisu.kuulutusVaihePaattyyPaiva = yesterday;
        await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.update(dbProjekti, julkaisu);
      }
      await aineistoSynchronizationSchedulerService.synchronizeProjektiFiles(dbProjekti.oid);
    }
  });

  await executor.onHyvaksymispaatosVuosiMenneisyyteen(async () => {
    requireProjekti();
    if (dbProjekti?.hyvaksymisPaatosVaiheJulkaisut) {
      for (const julkaisu of dbProjekti.hyvaksymisPaatosVaiheJulkaisut) {
        let yearAgo = dayjs().add(-1, "year").add(-1, "day").format("YYYY-MM-DD");
        julkaisu.kuulutusPaiva = yearAgo;
        julkaisu.kuulutusVaihePaattyyPaiva = yearAgo;
        await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.update(dbProjekti, julkaisu);
      }
      await aineistoSynchronizationSchedulerService.synchronizeProjektiFiles(dbProjekti.oid);
    }
  });

  const jatkoPaatos2VaiheFields: Partial<DBProjekti> = {
    jatkoPaatos2Vaihe: null,
    jatkoPaatos2VaiheJulkaisut: null,
  };

  const jatkoPaatos1VaiheFields: Partial<DBProjekti> = {
    jatkoPaatos1Vaihe: null,
    jatkoPaatos1VaiheJulkaisut: null,
    ...jatkoPaatos2VaiheFields,
  };

  const hyvaksymisPaatosVaiheFields: Partial<DBProjekti> = {
    hyvaksymisPaatosVaihe: null,
    hyvaksymisPaatosVaiheJulkaisut: null,
    ...jatkoPaatos1VaiheFields,
  };

  const nahtavillaoloVaiheFields: Partial<DBProjekti> = {
    nahtavillaoloVaihe: null,
    nahtavillaoloVaiheJulkaisut: null,
    ...hyvaksymisPaatosVaiheFields,
  };

  const vuorovaikutusJulkaisuFields: Partial<DBProjekti> = {
    vuorovaikutusKierrosJulkaisut: null,
    ...nahtavillaoloVaiheFields,
  };

  const suunnitteluVaiheFields: Partial<DBProjekti> = {
    vuorovaikutusKierros: null,
    ...vuorovaikutusJulkaisuFields,
  };

  const aloituskuulutusFields: Partial<DBProjekti> = {
    aloitusKuulutus: null,
    aloitusKuulutusJulkaisut: null,
    ...suunnitteluVaiheFields,
  };

  await executor.onResetAloituskuulutus(async (oid: string) => {
    requireProjekti();
    await testProjektiDatabase.saveProjekti({
      oid,
      ...aloituskuulutusFields,
      synkronoinnit: {},
    });
    await fileService.deleteProjektiFilesRecursively(new ProjektiPaths(oid), ProjektiPaths.PATH_ALOITUSKUULUTUS);
  });

  await executor.onResetSuunnittelu(async (oid: string) => {
    requireProjekti();
    await testProjektiDatabase.saveProjekti({
      oid,
      ...suunnitteluVaiheFields,
    });
    await fileService.deleteProjektiFilesRecursively(new ProjektiPaths(oid), ProjektiPaths.PATH_SUUNNITTELUVAIHE);
  });

  await executor.onResetVuorovaikutukset(async (oid: string) => {
    requireProjekti();
    await testProjektiDatabase.saveProjekti({
      oid,
      ...vuorovaikutusJulkaisuFields,
    });
  });

  await executor.onResetNahtavillaolo(async (oid: string) => {
    requireProjekti();
    await testProjektiDatabase.saveProjekti({
      oid,
      ...nahtavillaoloVaiheFields,
    });
    await fileService.deleteProjektiFilesRecursively(new ProjektiPaths(oid), ProjektiPaths.PATH_NAHTAVILLAOLO);
  });

  await executor.onResetHyvaksymisvaihe(async (oid: string) => {
    requireProjekti();
    await testProjektiDatabase.saveProjekti({
      oid,
      kasittelynTila: null,
      ...hyvaksymisPaatosVaiheFields,
    });
    await fileService.deleteProjektiFilesRecursively(new ProjektiPaths(oid), ProjektiPaths.PATH_HYVAKSYMISPAATOS);
  });

  await executor.onMigraatio(
    async (oid: string, targetStatus: TargetStatuses, hyvaksymispaatosPaivamaara?: string, hyvaksymispaatosAsianumero?: string) => {
      if (!targetStatus) {
        throw new Error("targetStatus-parametri puuttuu");
      }
      const kayttaja: NykyinenKayttaja = {
        __typename: "NykyinenKayttaja",
        etunimi: "migraatio",
        sukunimi: "migraatio",
        roolit: ["hassu_admin"],
        uid: "migraatio",
      };

      await importProjekti({
        oid: oid,
        kayttaja,
        targetStatus: targetStatus,
        hyvaksymispaatosPaivamaara: dayjs(hyvaksymispaatosPaivamaara).toDate(),
        hyvaksymispaatosAsianumero: hyvaksymispaatosAsianumero,
      });
    }
  );

  await executor.onResetJatkopaatos1vaihe(async (oid: string) => {
    requireProjekti();
    const kasittelyntila = dbProjekti?.kasittelynTila;
    await testProjektiDatabase.saveProjekti({
      oid,
      kasittelynTila: kasittelyntila?.hyvaksymispaatos
        ? {
            hyvaksymispaatos: kasittelyntila.hyvaksymispaatos,
            ensimmainenJatkopaatos: { asianumero: "", paatoksenPvm: "" },
            toinenJatkopaatos: { asianumero: "", paatoksenPvm: "" },
          }
        : null,
      ...jatkoPaatos1VaiheFields,
    });
    await fileService.deleteProjektiFilesRecursively(new ProjektiPaths(oid), ProjektiPaths.PATH_JATKOPAATOS1);
  });

  await executor.onJatkopaatos1Menneisyyteen(async () => {
    requireProjekti();
    if (dbProjekti?.jatkoPaatos1VaiheJulkaisut) {
      for (const julkaisu of dbProjekti.jatkoPaatos1VaiheJulkaisut) {
        let yesterday = dayjs().add(-1, "day").format("YYYY-MM-DD");
        julkaisu.kuulutusPaiva = yesterday;
        julkaisu.kuulutusVaihePaattyyPaiva = yesterday;
        await projektiDatabase.jatkoPaatos1VaiheJulkaisut.update(dbProjekti, julkaisu);
      }
    }
  });

  await executor.onJatkopaatos1VuosiMenneisyyteen(async () => {
    requireProjekti();
    if (!dbProjekti) {
      return;
    }
    if (dbProjekti.jatkoPaatos1VaiheJulkaisut) {
      for (const julkaisu of dbProjekti.jatkoPaatos1VaiheJulkaisut) {
        let yearAgo = dayjs().add(-1, "year").add(-1, "day").format("YYYY-MM-DD");
        julkaisu.kuulutusPaiva = yearAgo;
        julkaisu.kuulutusVaihePaattyyPaiva = yearAgo;
        await projektiDatabase.jatkoPaatos1VaiheJulkaisut.update(dbProjekti, julkaisu);
      }
    }
  });

  await executor.onKaynnistaAsianhallintaSynkronointi(async () => {
    requireProjekti();
    if (!dbProjekti) {
      return;
    }

    const julkaisut: {
      asianhallintaEventId?: string | null;
    }[] = [
      ...(dbProjekti.aloitusKuulutusJulkaisut || []),
      ...(dbProjekti.vuorovaikutusKierrosJulkaisut || []),
      ...(dbProjekti.nahtavillaoloVaiheJulkaisut || []),
      ...(dbProjekti.hyvaksymisPaatosVaiheJulkaisut || []),
    ];

    for (const julkaisu of julkaisut) {
      if (julkaisu?.asianhallintaEventId) {
        let synkronointi = dbProjekti.synkronoinnit?.[julkaisu.asianhallintaEventId];
        if (synkronointi) {
          console.log("Käynnistetään asianhallinta-synkronointi", synkronointi.asianhallintaEventId);
          await asianhallintaService.enqueueSynchronization(dbProjekti.oid, synkronointi.asianhallintaEventId);
        }
      }
    }
  });

  // text/html jotta cypress toimii paremmin
  res.setHeader("Content-Type", "text/html");
  if (dbProjekti) {
    res.send("<script>history.go(-1);</script>");
  } else {
    res.send("OK");
  }
}
