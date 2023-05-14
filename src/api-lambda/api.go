package main

import (
	"encoding/json"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/dpmcgarry/lordlaser/pkg/message"
	"github.com/rs/zerolog/log"
)

func baseGET() events.APIGatewayProxyResponse {
	log.Info().Msg("Base API")
	respStruct := genericResponse{
		Path: "Base API",
	}
	b, err := json.Marshal(respStruct)
	if err != nil {
		log.Error().Msgf("Error marshalling: %v", err)
		os.Exit(1)
	}
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       string(b),
	}
}

func messagesGET(ddbClient *dynamodb.Client, msgTableName string) events.APIGatewayProxyResponse {
	log.Info().Msg("Messages API")
	messages, err := message.GetMessages(ddbClient, msgTableName)
	if err != nil {
		log.Error().Msgf("Error getting messages: %v", err)
		os.Exit(1)
	}
	log.Info().Interface("messages", messages).Send()
	b, err := json.Marshal(messages)
	if err != nil {
		log.Error().Msgf("Error marshalling: %v", err)
		os.Exit(1)
	}
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       string(b),
	}
}

func messageGET(ddbClient *dynamodb.Client, msgTableName string, msgID string) events.APIGatewayProxyResponse {
	log.Info().Msg("Message GET")
	message, err := message.GetMessage(ddbClient, msgTableName, msgID)
	if err != nil {
		log.Error().Msgf("Error getting message: %v", err)
		os.Exit(1)
	}
	log.Info().Interface("message", message).Send()
	b, err := json.Marshal(message)
	if err != nil {
		log.Error().Msgf("Error marshalling: %v", err)
		os.Exit(1)
	}
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       string(b),
	}
}

func messagePUT(ddbClient *dynamodb.Client, msgTableName string, msg message.CrowdMessage) events.APIGatewayProxyResponse {
	log.Info().Msg("Message PUT")
	err := message.PutMessage(msg, ddbClient, msgTableName)
	if err != nil {
		log.Error().Msgf("Error putting message: %v", err)
		os.Exit(1)
	}
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
	}
}
