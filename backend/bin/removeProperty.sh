#!/bin/bash

if [ -z "${ENVIRONMENT}" ]; then
    echo "ENVIRONMENT variable is not set."
    exit 1
fi

if [ "${ENVIRONMENT}" == "dev" ] || [ "${ENVIRONMENT}" == "test" ] || [ "${ENVIRONMENT}" == "training" ] || [ "${ENVIRONMENT}" == "prod" ]; then
    echo "ENVIRONMENT should not be 'dev', 'test', 'training' or 'prod'."
    exit 1
fi

tablePrefix="Projekti-"
tableName="${tablePrefix}${ENVIRONMENT}"
echo "tableName: ${tableName}"

aws dynamodb scan \
    --table-name "${tableName}" \
    --projection-expression "oid, liittyvatSuunnitelmat" \
    --query "Items[?liittyvatSuunnitelmat].oid" \
    --output text |
    while read -r oid; do
        echo "Removing property liittyvatSuunnitelmat from oid: ${oid}... "
        aws dynamodb update-item \
            --table-name "${tableName}" \
            --key '{"oid": {"S": "'"$oid"'"}}' \
            --update-expression "REMOVE liittyvatSuunnitelmat"
        echo "Done."
    done
