import { AttributeValue, DynamoDBStreamEvent } from "aws-lambda/trigger/dynamodb-stream";
import { DBProjekti } from "../../src/database/model";

import { marshall } from "@aws-sdk/util-dynamodb";

const createProjekti = (projekti: DBProjekti): { [key: string]: AttributeValue } => {
  return marshall(projekti, { removeUndefinedValues: true }) as { [key: string]: AttributeValue };
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
}
