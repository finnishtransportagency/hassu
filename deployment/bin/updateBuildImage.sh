#!/bin/bash

ACCOUNT_ID=$(aws sts get-caller-identity --output text --query Account)

aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com"

export NODE_VERSION=$(cat .nvmrc)
BUILD_IMAGE_VERSION=$(cat .buildimageversion)
REPO_TAG=$ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com/hassu-build-image:$BUILD_IMAGE_VERSION
REPO_TAG_LATEST=$ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com/hassu-build-image:latest
aws ecr create-repository --repository-name hassu-build-image || true
docker buildx create --use
docker buildx build --build-arg NODE_VERSION --platform=linux/amd64,linux/arm64 --push --progress=plain -t "$REPO_TAG" -t "$REPO_TAG_LATEST" .
