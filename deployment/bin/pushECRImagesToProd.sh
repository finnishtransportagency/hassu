#!/bin/bash

ACCOUNT_ID=$(aws sts get-caller-identity --output text --query Account)

aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com

LOCALSTACK_VERSION=1.3
aws ecr create-repository --repository-name localstack || true
docker tag localstack/localstack:$LOCALSTACK_VERSION $ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com/localstack:$LOCALSTACK_VERSION
docker push $ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com/localstack:$LOCALSTACK_VERSION

# Create buildimage to provide faster builds
BUILD_IMAGE_VERSION=$(cat .buildimageversion)
REPO_TAG=$ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com/hassu-buildimage:$BUILD_IMAGE_VERSION
aws ecr create-repository --repository-name hassu-buildimage || true
docker tag hassu-buildimage:$BUILD_IMAGE_VERSION $REPO_TAG
docker push $REPO_TAG
