#!/bin/bash
# Contains code generated or recommended by Amazon Q

# Tags an existing ECR image (identified by commit SHA tag) with the latest semver Git tag.
# semantic-release pushes the tag to GitHub; this script fetches it and applies it to the ECR image.
# For test/training: also replicates the image to prod ECR with both the SHA and semver tags if not already present.

SOURCE_TAG="${CODEBUILD_RESOLVED_SOURCE_VERSION}"

echo "Adding semantic release tag to image $CODEBUILD_RESOLVED_SOURCE_VERSION."

if [[ -z "$SOURCE_TAG" ]]; then
    echo "SOURCE_TAG (CODEBUILD_RESOLVED_SOURCE_VERSION) is not set."
    exit 1
fi

REPO_NAME="hassu-nextjs"
AWS_REGION="eu-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --output text --query Account)

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
    echo "❌ No semver tag found in git for environment $ENVIRONMENT."
    echo "💡 Most likely Reason: PR merge commit did not follow conventional commit format (feat:, fix:, chore:, etc.)"
    echo "✅ Proper fix: Revert the merge and re-merge with correct commit message format"
    echo "⚡ Quick fix: git commit --allow-empty -m 'chore: trigger release' && git push"
    exit 1
fi

echo "Using semver tag: $SEMVER_TAG"

# Tag in dev ECR
MANIFEST=$(aws ecr batch-get-image \
    --repository-name "$REPO_NAME" \
    --image-ids imageTag="$SOURCE_TAG" \
    --region "$AWS_REGION" \
    --query 'images[0].imageManifest' \
    --output text)

if [[ -z "$MANIFEST" || "$MANIFEST" == "None" ]]; then
    echo "Image with tag '$SOURCE_TAG' not found in dev ECR."
    exit 1
fi

aws ecr put-image \
    --repository-name "$REPO_NAME" \
    --image-tag "$SEMVER_TAG" \
    --image-manifest "$MANIFEST" \
    --region "$AWS_REGION"

echo "Tagged '$SOURCE_TAG' with '$SEMVER_TAG' in dev ECR."

# For test/training: copy image to prod ECR if not present, then tag it there too
if [[ "$ENVIRONMENT" == "test" || "$ENVIRONMENT" == "training" ]]; then
    PROD_ACCOUNT_ID=$(aws ssm get-parameter \
        --name "/ProdAccountId" \
        --region "$AWS_REGION" \
        --query Parameter.Value \
        --output text)
    PROD_ECR_HOST="$PROD_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$PROD_ECR_HOST"

    if ! aws ecr describe-images \
        --repository-name "$REPO_NAME" \
        --image-ids imageTag="$SOURCE_TAG" \
        --registry-id "$PROD_ACCOUNT_ID" \
        --region "$AWS_REGION" &>/dev/null; then
        echo "Image '$SOURCE_TAG' not found in prod ECR. Copying from dev account..."
        docker pull "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:$SOURCE_TAG"
        docker tag "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:$SOURCE_TAG" "$PROD_ECR_HOST/$REPO_NAME:$SOURCE_TAG"
        docker push "$PROD_ECR_HOST/$REPO_NAME:$SOURCE_TAG"
        echo "Copied image to prod ECR as '$SOURCE_TAG'."
    else
        echo "Image '$SOURCE_TAG' already exists in prod ECR. Skipping copy."
    fi

    PROD_MANIFEST=$(aws ecr batch-get-image \
        --repository-name "$REPO_NAME" \
        --image-ids imageTag="$SOURCE_TAG" \
        --registry-id "$PROD_ACCOUNT_ID" \
        --region "$AWS_REGION" \
        --query 'images[0].imageManifest' \
        --output text)
    aws ecr put-image \
        --repository-name "$REPO_NAME" \
        --image-tag "$SEMVER_TAG" \
        --image-manifest "$PROD_MANIFEST" \
        --registry-id "$PROD_ACCOUNT_ID" \
        --region "$AWS_REGION"
    echo "Tagged '$SOURCE_TAG' with '$SEMVER_TAG' in prod ECR."
fi
