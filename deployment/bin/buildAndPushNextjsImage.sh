#!/bin/bash

# Check if an argument is provided, otherwise use the ENVIRONMENT variable
IMAGE_TAG="${ENVIRONMENT}"
BUILD_ONLY="false"

# Parse options
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -b|--build-only)
            BUILD_ONLY="true"
            shift 1
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check if IMAGE_TAG is empty or in the restricted list
if [[ -z "$IMAGE_TAG" || "$IMAGE_TAG" =~ ^(dev|test|training|prod)$ ]]; then
    echo "Invalid or missing image tag. Provide a tag as an argument or set ENVIRONMENT variable (excluding dev, test, training, prod)."
    exit 1
fi

REPO_NAME="hassu-nextjs"
AWS_REGION="eu-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --output text --query Account)
ECR_URI="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME"

aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# If the build tag is provided as an argument, check if the image exists in ECR
if [[ -n "$IMAGE_TAG" && "$BUILD_ONLY" != "true" ]]; then
    if aws ecr describe-images --repository-name "$REPO_NAME" --image-ids imageTag="$IMAGE_TAG" --region "$AWS_REGION" &>/dev/null; then
        echo "Image with tag '$IMAGE_TAG' already exists in ECR. Exiting."
        exit 0
    fi
fi

# Set the conditonal push flag and build message
PUSH_FLAG="--push"
BUILD_MESSAGE="Image does not exist in ECR. Building and pushing..."
if [[ "$BUILD_ONLY" == "true" ]]; then
    PUSH_FLAG=""
    BUILD_MESSAGE="Image does not exist in ECR but 'build-only' flag detected. Just building the image..."
fi

echo "$BUILD_MESSAGE"

CODE_ARTIFACT_DOMAIN="hassu-domain"
export CODE_ARTIFACT_TOKEN=$(aws codeartifact get-authorization-token --domain $CODE_ARTIFACT_DOMAIN --domain-owner $ACCOUNT_ID --query authorizationToken --output text --duration-seconds 900)
NPM_SCOPE="@hassu"
NPM_REGISTRY="hassu-private-npm"

aws ecr create-repository --repository-name $REPO_NAME || true
docker buildx create --use

# Using placeholder values at build time 
docker buildx build \
  $PUSH_FLAG \
  --progress=plain \
  --platform linux/amd64 \
  --secret id=code_artifact_token,env=CODE_ARTIFACT_TOKEN \
  --build-arg CODE_ARTIFACT_DOMAIN=$CODE_ARTIFACT_DOMAIN \
  --build-arg ACCOUNT_ID=$ACCOUNT_ID \
  --build-arg AWS_REGION=$AWS_REGION \
  --build-arg NPM_SCOPE=$NPM_SCOPE \
  --build-arg NPM_REGISTRY=$NPM_REGISTRY \
  --build-arg NEXT_PUBLIC_VERSION=_NEXT_PUBLIC_VERSION_ \
  --build-arg NEXT_PUBLIC_ENVIRONMENT=_NEXT_PUBLIC_ENVIRONMENT_ \
  --build-arg NEXT_PUBLIC_VAYLA_EXTRANET_URL=_NEXT_PUBLIC_VAYLA_EXTRANET_URL_ \
  --build-arg NEXT_PUBLIC_VELHO_BASE_URL=_NEXT_PUBLIC_VELHO_BASE_URL_ \
  --build-arg NEXT_PUBLIC_AJANSIIRTO_SALLITTU=_NEXT_PUBLIC_AJANSIIRTO_SALLITTU_ \
  -t "$ECR_URI":"$IMAGE_TAG" \
  -f "frontend.Dockerfile" .
