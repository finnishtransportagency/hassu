#!/bin/bash

aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 283563576583.dkr.ecr.eu-west-1.amazonaws.com

# Copy localstack into private repository
aws ecr create-repository --repository-name localstack || true
docker pull 283563576583.dkr.ecr.eu-west-1.amazonaws.com/localstack:latest || true
docker pull localstack/localstack:latest
docker tag localstack/localstack:latest 283563576583.dkr.ecr.eu-west-1.amazonaws.com/localstack:latest
docker push 283563576583.dkr.ecr.eu-west-1.amazonaws.com/localstack:latest

# Create buildimage to provide faster builds
REPO_TAG=283563576583.dkr.ecr.eu-west-1.amazonaws.com/hassu-buildimage:latest
aws ecr create-repository --repository-name hassu-buildimage || true
docker pull $REPO_TAG || true
docker build --progress=plain --cache-from $REPO_TAG -t hassu-buildimage:latest . && \
  docker tag hassu-buildimage:latest $REPO_TAG && \
  docker push $REPO_TAG
