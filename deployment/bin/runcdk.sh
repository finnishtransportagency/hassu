#!/usr/bin/env bash
# stop on error
set -e
# first arg is the cdk command
CDK_COMMAND=$1
# second arg is the stack name
CDK_STACK_NAME=$2

# Verify that both arguments are provided
if [ -z "$CDK_COMMAND" ] || [ -z "$CDK_STACK_NAME" ]; then
  echo "Usage: runcdk.sh <cdk-command> <stack-name>"
  exit 1
fi

 ./deployment/node_modules/.bin/cdk --app "ts-node --project=tsconfig.cdk.json ./deployment/bin/hassu" $CDK_COMMAND $CDK_STACK_NAME
