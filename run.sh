#!/usr/bin/env bash
#try to stop the service if it is running:
if hash systemctl 2>/dev/null; then
  #only run the stop system command if systemctl exists.
	#need to stop the service otherwise systemd will restart the
	#container when we kill it down below
  sudo systemctl stop docker-prephub.service
fi

IMAGE_NAME=${IMAGE_NAME:-'server'}
EX_PORT=${EX_PORT:-'8081'}
HOST_PORT=${HOST_PORT:-'28081'}
PROJECT_NAME=${PROJECT_NAME:-'prephubwifi'}

sudo docker kill $IMAGE_NAME
sudo docker rm $IMAGE_NAME
NAME="\"$IMAGE_NAME\""
sudo docker run -p $HOST_PORT:$EX_PORT -d --name $IMAGE_NAME $PROJECT_NAME"/"$IMAGE_NAME
