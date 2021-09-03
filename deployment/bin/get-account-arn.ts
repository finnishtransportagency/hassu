/* tslint:disable:no-console */
process.env.AWS_SDK_LOAD_CONFIG = "true"; // to get region from config file
import * as AWS from "aws-sdk";
import { AWSError } from "aws-sdk";

const sts = new AWS.STS();
sts.getCallerIdentity({}, (err: AWSError, data) => {
  if (err) {
    console.log("Error", err);
  } else {
    console.log(`${data.Account}/${AWS.config.region}`);
  }
});
