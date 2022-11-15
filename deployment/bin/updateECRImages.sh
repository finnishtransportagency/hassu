#!/bin/bash

aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 283563576583.dkr.ecr.eu-west-1.amazonaws.com

# Copy localstack into private repository
LOCALSTACK_VERSION=0.14.1
aws ecr create-repository --repository-name localstack || true
docker pull 283563576583.dkr.ecr.eu-west-1.amazonaws.com/localstack:$LOCALSTACK_VERSION || true
docker pull localstack/localstack:$LOCALSTACK_VERSION
docker tag localstack/localstack:$LOCALSTACK_VERSION 283563576583.dkr.ecr.eu-west-1.amazonaws.com/localstack:$LOCALSTACK_VERSION
docker push 283563576583.dkr.ecr.eu-west-1.amazonaws.com/localstack:$LOCALSTACK_VERSION

# Create buildimage to provide faster builds
BUILD_IMAGE_VERSION=$(cat .buildimageversion)
REPO_TAG=283563576583.dkr.ecr.eu-west-1.amazonaws.com/hassu-buildimage:$BUILD_IMAGE_VERSION
aws ecr create-repository --repository-name hassu-buildimage || true
docker pull $REPO_TAG || true
docker build --progress=plain --no-cache -t hassu-buildimage:$BUILD_IMAGE_VERSION . && \
  docker tag hassu-buildimage:$BUILD_IMAGE_VERSION $REPO_TAG && \
  docker push $REPO_TAG
