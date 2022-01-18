#!/bin/bash

aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 283563576583.dkr.ecr.eu-west-1.amazonaws.com

IMAGE_TAG=hassu-robot
REPO_TAG=283563576583.dkr.ecr.eu-west-1.amazonaws.com/$IMAGE_TAG:latest
aws ecr create-repository --repository-name $IMAGE_TAG || true
docker pull $REPO_TAG || true
docker build --progress=plain --cache-from $REPO_TAG -t $IMAGE_TAG:latest -f ./tools/robot/Dockerfile .
docker tag $IMAGE_TAG:latest $REPO_TAG
docker push $REPO_TAG
