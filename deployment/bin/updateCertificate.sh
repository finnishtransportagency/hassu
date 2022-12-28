# Usage: ./deployment/bin/updateCertificate.sh [aws profile] [environment name e.g. dev] <intermediate certificate filename> <pfx filename>
# For example ./deployment/bin/updateCertificate.sh my_aws_profile dev ../Intermediate.crt somecertificate.pfx
AWS_PROFILE=$1
ENV=$2
INTERMEDIATE=$3
INPUT_FILE=$4
echo "Processing certificate $INPUT_FILE into $2 using AWS_PROFILE=$AWS_PROFILE"
WORKDIR="ssl_$ENV"
mkdir "$WORKDIR"

openssl pkcs12 -in "$INPUT_FILE" -out "$WORKDIR/privatekey.pem" -nocerts -nodes
openssl pkcs12 -in "$INPUT_FILE" -out "$WORKDIR/cert.pem" -nokeys
aws acm import-certificate --certificate "fileb://$WORKDIR/cert.pem" --private-key "fileb://$WORKDIR/privatekey.pem" --certificate-chain "fileb://$INTERMEDIATE" --region us-east-1 >"$WORKDIR/output.json"
CERTIFICATE_ARN=$(grep CertificateArn $WORKDIR/output.json | cut -d '"' -f 4)
aws ssm put-parameter --overwrite --region us-east-1 --name "/$ENV/CloudfrontCertificateArn" --value "$CERTIFICATE_ARN" --type String
aws ssm put-parameter --overwrite --region eu-west-1 --name "/$ENV/CloudfrontCertificateArn" --value "$CERTIFICATE_ARN" --type String
rm -rf "$WORKDIR"
