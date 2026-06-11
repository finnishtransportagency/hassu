// Contains code generated or recommended by Amazon Q
const { Macie2Client, CreateClassificationJobCommand } = require("@aws-sdk/client-macie2");

const macie = new Macie2Client();
const BUCKET_NAME = process.env.BUCKET_NAME;
const ACCOUNT_ID = process.env.ACCOUNT_ID;

exports.handler = async () => {
  const jobName = `hassu-sensitive-data-scan-${Date.now()}`;
  console.log(`Creating Macie classification job: ${jobName}`);

  const command = new CreateClassificationJobCommand({
    jobType: "ONE_TIME",
    name: jobName,
    s3JobDefinition: {
      bucketDefinitions: [
        {
          accountId: ACCOUNT_ID,
          buckets: [BUCKET_NAME],
        },
      ],
      scoping: {
        includes: {
          and: [
            {
              simpleScopeTerm: {
                comparator: "STARTS_WITH",
                key: "OBJECT_KEY",
                values: ["palautteet/", "muistutukset/"],
              },
            },
          ],
        },
      },
    },
  });

  const response = await macie.send(command);
  console.log(`Classification job created: ${response.jobId}`);
  return { jobId: response.jobId };
};
