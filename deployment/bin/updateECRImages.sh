#!/bin/bash

aws ecr create-repository --repository-name localstack || true
docker pull localstack/localstack:latest
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 283563576583.dkr.ecr.eu-west-1.amazonaws.com
docker tag localstack/localstack:latest 283563576583.dkr.ecr.eu-west-1.amazonaws.com/localstack:latest
docker push 283563576583.dkr.ecr.eu-west-1.amazonaws.com/localstack:latest
