# Usage: ./deployment/bin/updateCertificate.sh [aws profile] [environment name e.g. dev] <intermediate certificate filename> <pfx filename>
# For example ./deployment/bin/updateCertificate.sh my_aws_profile dev ../Intermediate.crt somecertificate.pfx
set -e
AWS_PROFILE=$1
ENV=$2
INTERMEDIATE=$3
INPUT_FILE=$4
echo "Processing certificate $INPUT_FILE into $2 using AWS_PROFILE=$AWS_PROFILE"
WORKDIR="ssl_$ENV"
mkdir -p "$WORKDIR"

if [ ! -f "$WORKDIR/privatekey.pem" ]; then
  openssl pkcs12 -in "$INPUT_FILE" -out "$WORKDIR/privatekey.pem" -nocerts -nodes -legacy
  openssl pkcs12 -in "$INPUT_FILE" -out "$WORKDIR/cert.pem" -nokeys -legacy
fi
# pfx filussa voi olla myös certicate chain
NUMBER_OF_CERTS=$(grep -F "BEGIN CERTIFICATE" -c $WORKDIR/cert.pem)
if [ $NUMBER_OF_CERTS -gt 1 ]; then
  echo "Edit $WORKDIR/cert.pem to contain only server certificate. You can put rest to Intermediate.crt. Then run script again."
  exit 1;
fi
aws acm import-certificate --certificate "fileb://$WORKDIR/cert.pem" --private-key "fileb://$WORKDIR/privatekey.pem" --certificate-chain "fileb://$INTERMEDIATE" --region us-east-1 >"$WORKDIR/output.json"
CERTIFICATE_ARN=$(grep CertificateArn $WORKDIR/output.json | cut -d '"' -f 4)
aws ssm put-parameter --overwrite --region us-east-1 --name "/$ENV/CloudfrontCertificateArn" --value "$CERTIFICATE_ARN" --type String
aws ssm put-parameter --overwrite --region eu-west-1 --name "/$ENV/CloudfrontCertificateArn" --value "$CERTIFICATE_ARN" --type String
CERTIFICATE=$(sed -n '/BEGIN CERTIFICATE/,/END CERTIFICATE/p' $WORKDIR/cert.pem)
PRIVATEKEY=$(sed -n '/BEGIN PRIVATE KEY/,/END PRIVATE KEY/p' $WORKDIR/privatekey.pem)
if [ "$ENV" == "dev" ] || [ "$ENV" == "prod" ]; then
  aws ssm put-parameter --overwrite --region eu-west-1 --name "/$ENV/Certificate" --value "$CERTIFICATE" --type SecureString
  aws ssm put-parameter --overwrite --region eu-west-1 --name "/$ENV/PrivateKey" --value "$PRIVATEKEY" --type SecureString
fi
CN=$(openssl x509 -noout -subject -in $WORKDIR/cert.pem | awk -F= '{gsub(/^[ \t]+/,"",$6); print $6}')
echo "Certificate $CN updated"
rm -rf "$WORKDIR"
