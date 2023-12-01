#!/usr/bin/env bash
# If parameter is "start", start Bastion Host
# If parameter is "stop", stop Bastion Host
# If parameter is "connect", connect to host using systems manager. It has three optional parameters for tunneling: remote host, remote port and local port.
# Bastion Host is running on AWS. Instance name is "vls-bastion"

INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=vls-bastion" --query "Reservations[*].Instances[*].InstanceId" --output text)

if [ "$1" == "start" ]; then
  echo "Starting Bastion Host"
  aws ec2 start-instances --instance-ids $INSTANCE_ID
  echo "Done"
elif [ "$1" == "stop" ]; then
  echo "Stopping Bastion Host"
  aws ec2 stop-instances --instance-ids $INSTANCE_ID
  echo "Done"
elif [ "$1" == "connect" ]; then
  # If tunneling parameters were given, use them
  if [ "$2" != "" ]; then
    echo "Connecting to Bastion Host with tunneling"
    #    --parameters '{"host":["mydb.example.us-east-2.rds.amazonaws.com"],"portNumber":["3306"], "localPortNumber":["3306"]}'
    REMOTE_HOST=$2
    REMOTE_PORT=${3:-80}
    LOCAL_PORT=${4:-8080}
    PARAMETERS='{"host":["'$REMOTE_HOST'"],"portNumber":["'$REMOTE_PORT'"], "localPortNumber":["'$LOCAL_PORT'"]}'
    aws ssm start-session --target "$INSTANCE_ID" --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters "$PARAMETERS" > /dev/null &
    echo "Port forwarding started to $REMOTE_HOST:$REMOTE_PORT on local port $LOCAL_PORT"
  else
    echo "Connecting to Bastion Host"
    aws ssm start-session --target $INSTANCE_ID
  fi
else
  echo "Invalid parameter. Use start, stop or connect"
  exit 1
fi
