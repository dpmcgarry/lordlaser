package message

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/dpmcgarry/lordlaser/pkg/ddb"
	"github.com/rs/zerolog/log"
	"golang.org/x/exp/slices"
)

type MessageType string

const (
	SMS   MessageType = "SMS"
	EMAIL MessageType = "EMAIL"
	WEB   MessageType = "WEB"
)

type MessageStatus string

const (
	Pending   MessageStatus = "PENDING"
	Posted    MessageStatus = "POSTED"
	Throttled MessageStatus = "THROTTLED"
)

type CrowdMessage struct {
	Type           MessageType   `dynamodbav:"messageType"`
	Source         string        `dynamodbav:"source"`
	Destination    string        `dynamodbav:"destination"`
	Body           string        `dynamodbav:"body"`
	ID             string        `dynamodbav:"messageId"`
	Language       string        `dynamodbav:"language"`
	TranslatedBody string        `dynamodbav:"translatedBody"`
	Status         MessageStatus `dynamodbav:"messageStatus"`
	Received       string        `dynamodbav:"received"`
}

func (msg CrowdMessage) GetKey() map[string]types.AttributeValue {
	id, err := attributevalue.Marshal(msg.ID)
	if err != nil {
		log.Error().Err(err).Msg("Error marshalling ID")
		os.Exit(1)
	}
	return map[string]types.AttributeValue{"messageId": id}
}

func ParseFromLambdaSMS(records []events.SNSEventRecord) ([]CrowdMessage, error) {
	var messages []CrowdMessage
	for _, record := range records {
		log.Debug().Msgf("Record: %v", record)
		var msgData map[string]string
		json.Unmarshal([]byte(record.SNS.Message), &msgData)
		log.Debug().Msgf("Message: %v", msgData)
		message := CrowdMessage{
			Type: SMS,
		}
		val, ok := msgData["originationNumber"]
		if ok {
			message.Source = val
		} else {
			return nil, fmt.Errorf("originationNumber not found")
		}
		val, ok = msgData["destinationNumber"]
		if ok {
			message.Destination = val
		} else {
			return nil, fmt.Errorf("destinationNumber not found")
		}
		val, ok = msgData["messageBody"]
		if ok {
			message.Body = val
		} else {
			return nil, fmt.Errorf("messageBody not found")
		}
		message.ID = record.SNS.MessageID
		message.Status = Pending
		message.Received = time.Now().UTC().Format("2006-01-02 15:04:05Z")
		messages = append(messages, message)
	}
	return messages, nil
}

func ProcessSMSThrottle(messages []CrowdMessage, throttle ddb.Throttle) ([]CrowdMessage, error) {
	var unThrottleMessages []CrowdMessage
	log.Debug().Msgf("Processing SMS Throttle for %v messages", len(messages))
	for _, msg := range messages {
		if !slices.Contains(throttle.ThrottleValueList, msg.Source) {
			log.Debug().Msg("Adding Message")
			unThrottleMessages = append(unThrottleMessages, msg)
		} else {
			log.Warn().Msgf("Throttling Message From Source Number: %v", msg.Source)
		}
	}
	return unThrottleMessages, nil
}

func PutMessage(message CrowdMessage, ddbClient *dynamodb.Client, tableName string) error {
	item, err := attributevalue.MarshalMap(message)
	if err != nil {
		log.Error().Msgf("Couldn't marshal message %v: %v\n", message.ID, err)
		return err
	}
	resp, err := ddbClient.PutItem(context.TODO(), &dynamodb.PutItemInput{
		Item:      item,
		TableName: aws.String(tableName),
	})
	if err != nil {
		log.Error().Msgf("Couldn't put item %v: %v\n", message.ID, err)
		return err
	}

	log.Debug().Msgf("Response: %v", resp)
	return nil

}

func PutMessages(messages []CrowdMessage, ddbClient *dynamodb.Client, tableName string) (int, error) {
	written := 0
	for _, msg := range messages {
		err := PutMessage(msg, ddbClient, tableName)
		if err != nil {
			return 0, err
		}
		written++
	}

	return written, nil
}

func GetMessages(ddbClient *dynamodb.Client, tableName string) ([]CrowdMessage, error) {
	var messages []CrowdMessage
	resp, err := ddbClient.Scan(context.TODO(), &dynamodb.ScanInput{
		TableName: aws.String(tableName),
	})
	if err != nil {
		log.Error().Msgf("Couldn't scan table %v: %v\n", tableName, err)
		return messages, err
	}
	err = attributevalue.UnmarshalListOfMaps(resp.Items, &messages)
	if err != nil {
		log.Error().Msgf("Couldn't unmarshal query response. Here's why: %v\n", err)
		return messages, err
	}
	return messages, nil
}

func GetMessage(ddbClient *dynamodb.Client, tableName, id string) (CrowdMessage, error) {
	var message CrowdMessage
	ddbid, err := attributevalue.Marshal(id)
	if err != nil {
		log.Error().Err(err).Msg("Error marshalling ID")
		os.Exit(1)
	}
	resp, err := ddbClient.GetItem(context.TODO(), &dynamodb.GetItemInput{
		TableName: aws.String(tableName),
		Key:       map[string]types.AttributeValue{"messageId": ddbid},
	})
	if err != nil {
		log.Error().Msgf("Couldn't get item %v: %v\n", id, err)
		return CrowdMessage{}, err
	}
	err = attributevalue.UnmarshalMap(resp.Item, &message)
	if err != nil {
		log.Error().Msgf("Couldn't unmarshal query response. Here's why: %v\n", err)
		return message, err
	}
	return message, nil
}
