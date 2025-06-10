#!/bin/bash

STACK_NAME="hassu-frontend-${ENVIRONMENT}"
REGION="us-east-1"
CFN_OUTPUT_KEY="NewCloudfrontDistributionId"

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='${CFN_OUTPUT_KEY}'].OutputValue" \
  --output text)

if [ -z "$DISTRIBUTION_ID" ]; then
  echo "Error: Could not retrieve Distribution ID"
  exit 1
fi

echo "Invalidating CloudFront distribution: $DISTRIBUTION_ID"

aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --no-cli-pager # fire and forget
