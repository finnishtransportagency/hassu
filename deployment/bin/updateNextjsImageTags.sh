#!/bin/bash

# Tags an existing ECR image (identified by commit SHA tag) with the latest semver Git tag.
# semantic-release pushes the tag to GitHub; this script fetches it and applies it to the ECR image.

SOURCE_TAG="${CODEBUILD_RESOLVED_SOURCE_VERSION}"

echo "Adding semantic release tag to image $CODEBUILD_RESOLVED_SOURCE_VERSION."

if [[ -z "$SOURCE_TAG" ]]; then
    echo "SOURCE_TAG (CODEBUILD_RESOLVED_SOURCE_VERSION) is not set."
    exit 1
fi

REPO_NAME="hassu-nextjs"
AWS_REGION="eu-west-1"

git fetch --tags
if [[ "$ENVIRONMENT" == "prod" ]]; then
    SEMVER_TAG=$(git tag --points-at "$CODEBUILD_RESOLVED_SOURCE_VERSION" | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$')
    SEMVER_TAG="${SEMVER_TAG}-prod"
    echo "Prod environment detected, appended -prod suffix to semver tag."
    echo "This is needed to efficiently run lifecycle policies in prod ECR."
else
    SEMVER_TAG=$(git tag --points-at "$CODEBUILD_RESOLVED_SOURCE_VERSION" | grep -E "^v[0-9]+\.[0-9]+\.[0-9]+-${ENVIRONMENT}\.[0-9]+$")
fi

if [[ -z "$SEMVER_TAG" ]]; then
    echo "No semver tag found in git for environment $ENVIRONMENT."
    exit 1
fi

echo "Using semver tag: $SEMVER_TAG"

MANIFEST=$(aws ecr batch-get-image \
    --repository-name "$REPO_NAME" \
    --image-ids imageTag="$SOURCE_TAG" \
    --region "$AWS_REGION" \
    --query 'images[0].imageManifest' \
    --output text)

if [[ -z "$MANIFEST" || "$MANIFEST" == "None" ]]; then
    echo "Image with tag '$SOURCE_TAG' not found in ECR."
    exit 1
fi

aws ecr put-image \
    --repository-name "$REPO_NAME" \
    --image-tag "$SEMVER_TAG" \
    --image-manifest "$MANIFEST" \
    --region "$AWS_REGION"

echo "Tagged '$SOURCE_TAG' with '$SEMVER_TAG' in ECR."
