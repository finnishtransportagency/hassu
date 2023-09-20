#!/usr/bin/env bash
mkdir -p .report
FILTER="aws common error user model importContext adapter config util logger importAineistoEvent.ts projektiUtil.ts projektirekisteri hakupalvelu aineistopalvelu PartiallyMandatory ProjektiPath.ts adaptToDB projektiSchemaUpdate.ts"
npx ts_dependency_graph --start ./backend/src/aineisto/sqsEventHandlerLambda.ts --graph_folder --filter $FILTER | dot -T png > .report/dependencygraph-sqsEventHandlerLambda.png
npx ts_dependency_graph --start ./backend/src/personSearch/lambda/personSearchUpdaterHandler.ts --graph_folder --filter $FILTER | dot -T png > .report/dependencygraph-personSearchUpdaterHandler.png
npx ts_dependency_graph --start ./backend/src/api/yllapitoOperations.ts --graph_folder --filter $FILTER asiakirjaAdapter.ts | dot -T png > .report/dependencygraph-yllapitoOperations.png
npx ts_dependency_graph --start ./backend/src/api/publicOperations.ts --graph_folder --filter $FILTER | dot -T png > .report/dependencygraph-publicOperations.png
npx ts_dependency_graph --start ./backend/src/handler/tila/nahtavillaoloTilaManager.ts --graph_folder --filter $FILTER AloituskuulutusHyvaksyntaEmailSender.ts sendHyvaksymiskuulutusEmails.ts personSearchClient.ts velho cache endDateCalculator asiakirjaTypes.ts | dot -T png > .report/dependencygraph-nahtavillaoloTilaManager.png
