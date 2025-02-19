#!/bin/bash

# Check if an argument is provided, otherwise use the ENVIRONMENT variable
IMAGE_TAG="${1:-$ENVIRONMENT}"

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

# If the tag is provided as an argument, check if the image exists in ECR
if [[ -n "$1" ]]; then
    if aws ecr describe-images --repository-name "$REPO_NAME" --image-ids imageTag="$IMAGE_TAG" --region "$AWS_REGION" &>/dev/null; then
        echo "Image with tag '$IMAGE_TAG' already exists in ECR. Exiting."
        exit 0
    fi
fi


echo "Image does not exist in ECR. Building and pushing..."

aws ecr create-repository --repository-name $REPO_NAME || true
docker buildx create --use
docker buildx build --push --progress=plain -t "$ECR_URI":"$IMAGE_TAG" -f "frontend.Dockerfile" .

