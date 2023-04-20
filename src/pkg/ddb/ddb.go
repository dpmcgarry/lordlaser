package ddb

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

func TableExists(client *dynamodb.Client, tableName string) (bool, error) {
	exists := true
	_, err := client.DescribeTable(
		context.TODO(), &dynamodb.DescribeTableInput{TableName: aws.String(tableName)},
	)
	if err != nil {
		exists = false
	}
	return exists, err
}

func GetThrottles(client *dynamodb.Client, tableName string) ([]Throttle, error) {
	var throttles []Throttle
	resp, err := client.Scan(context.TODO(), &dynamodb.ScanInput{TableName: aws.String(tableName)})
	if err != nil {
		return nil, err
	}

	err = attributevalue.UnmarshalListOfMaps(resp.Items, &throttles)
	if err != nil {
		return nil, err
	}

	return throttles, nil
}
