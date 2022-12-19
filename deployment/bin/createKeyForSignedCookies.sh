# For example ./deployment/bin/createKeyForSignedCookies.sh my_aws_profile dev
AWS_PROFILE=$1
ENV=$2
echo "Creating private key into $2 using AWS_PROFILE=$AWS_PROFILE"
WORKDIR="key_$ENV"
mkdir "$WORKDIR"

openssl genrsa -out "$WORKDIR/private_key.pem" 2048
openssl rsa -pubout -in "$WORKDIR/private_key.pem" -out "$WORKDIR/public_key.pem"

aws ssm put-parameter --region eu-west-1 --name "/$ENV/FrontendPrivateKey" --value "$(cat $WORKDIR/private_key.pem)" --type SecureString

aws ssm put-parameter --region eu-west-1 --name "/$ENV/FrontendPublicKey" --value "$(cat $WORKDIR/public_key.pem)" --type SecureString

aws ssm put-parameter --region us-east-1 --name "/$ENV/FrontendPrivateKey" --value "$(cat $WORKDIR/private_key.pem)" --type SecureString

aws ssm put-parameter --region us-east-1 --name "/$ENV/FrontendPublicKey" --value "$(cat $WORKDIR/public_key.pem)" --type SecureString

rm -rf "$WORKDIR"
