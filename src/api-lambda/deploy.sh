#!/bin/bash
while getopts p: flag
do
    case "${flag}" in
        p) profile=${OPTARG};;
    esac
done
if [ -z "$profile" ]; then
    profile="default"
fi
echo "Username: $username";
echo "Age: $age";
echo "Full Name: $fullname";
ZIPNAME=lordlaser-api.zip
BINNAME=lordlaser-api
FUNCTION=LordLaserApi
BUCKET=$(aws ssm --profile ${profile} get-parameter --name LordLaserArtifactBucket |jq -r '.Parameter.Value')
echo ${BUCKET}
echo ${BINNAME}
echo ${ZIPNAME}
echo ${FUNCTION}
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o ${BINNAME}
zip ${ZIPNAME} ${BINNAME}
aws s3 --profile ${profile} cp ${ZIPNAME} s3://${BUCKET}/${ZIPNAME}
aws lambda --profile ${profile} update-function-code --function-name ${FUNCTION} --s3-bucket ${BUCKET} --s3-key ${ZIPNAME}