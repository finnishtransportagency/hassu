import { DynamoDBStreamEvent } from "aws-lambda/trigger/dynamodb-stream";
import DynamoDB from "aws-sdk/clients/dynamodb";
import { DBProjekti } from "../../src/database/model/projekti";

const createProjekti = (projekti: DBProjekti): any => {
  return DynamoDB.Converter.input(projekti).M;
};

export class ProjektiSearchFixture {
  public createNewProjektiEvent(projekti: DBProjekti): DynamoDBStreamEvent {
    return {
      Records: [
        {
          eventID: "1",
          eventName: "INSERT",
          eventVersion: "1.1",
          eventSource: "aws:dynamodb",
          awsRegion: "eu-west-1",
          dynamodb: {
            ApproximateCreationDateTime: 1637755664,
            Keys: { oid: { S: projekti.oid } },
            NewImage: createProjekti(projekti),
            SequenceNumber: "1",
            SizeBytes: 499,
            StreamViewType: "NEW_IMAGE",
          },
          eventSourceARN: "x",
        },
      ],
    };
  }

  public createUpdateProjektiEvent(projekti: DBProjekti): DynamoDBStreamEvent {
    return {
      Records: [
        {
          eventID: "1",
          eventName: "MODIFY",
          eventVersion: "1.1",
          eventSource: "aws:dynamodb",
          awsRegion: "eu-west-1",
          dynamodb: {
            ApproximateCreationDateTime: 1637757922,
            Keys: { oid: { S: projekti.oid } },
            NewImage: {
              ...createProjekti(projekti),
              muistiinpano: { S: "moro" },
            },
            SequenceNumber: "2",
            SizeBytes: 503,
            StreamViewType: "NEW_IMAGE",
          },
          eventSourceARN: "x",
        },
      ],
    };
  }

  public createdDeleteProjektiEvent(oid: string): DynamoDBStreamEvent {
    return {
      Records: [
        {
          eventID: "1",
          eventName: "REMOVE",
          eventVersion: "1.1",
          eventSource: "aws:dynamodb",
          awsRegion: "eu-west-1",
          dynamodb: {
            ApproximateCreationDateTime: 1637758822,
            Keys: { oid: { S: oid } },
            SequenceNumber: "1",
            SizeBytes: 22,
            StreamViewType: "NEW_IMAGE",
          },
          eventSourceARN: "x",
        },
      ],
    };
  }

  public createOpenSearchQueryResult(): any {
    return {
      took: 13,
      timed_out: false,
      _shards: { total: 5, successful: 5, skipped: 0, failed: 0 },
      hits: {
        total: { value: 1, relation: "eq" },
        max_score: 0.21072102,
        hits: [
          {
            _index: "projekti",
            _type: "_doc",
            _id: "1",
            _score: 0.21072102,
            _source: {
              velho: { nimi: "Testiprojekti 1", kunnat: ["Tampere", "Nokia"] },
              muistiinpano: "Testiprojekti 1:n muistiinpano",
              status: "EI_JULKAISTU",
            },
          },
        ],
      },
    };
  }
}
