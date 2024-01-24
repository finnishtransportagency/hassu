#!/bin/bash

set +e

aws s3 cp s3://hassu-dev-internal/cache/users_localstack.json users.json
aws --endpoint-url=http://localhost:4566 s3 cp users.json s3://hassu-localstack-internal/cache/users.json
rm users.json
set -e
