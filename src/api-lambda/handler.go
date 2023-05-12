package main

import (
	"context"
	"encoding/json"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/dpmcgarry/lordlaser/pkg/logging"
	"github.com/dpmcgarry/lordlaser/pkg/message"
	"github.com/rs/zerolog/log"
)

type genericResponse struct {
	Path string
}

func HandleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	logging.ConfigureLogging()
	respStruct := genericResponse{
		Path: "Not Found",
	}
	b, err := json.Marshal(respStruct)
	if err != nil {
		log.Error().Msgf("Error marshalling: %v", err)
		os.Exit(1)
	}
	resp := events.APIGatewayProxyResponse{
		StatusCode: 501,
		Body:       string(b),
	}
	log.Info().Msgf("Context: %v", ctx)
	log.Info().Msgf("Event: %v", request)
	log.Info().Msgf("HTTP Method: %v", request.HTTPMethod)
	log.Info().Interface("req", request).Send()
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatal().Msgf("unable to get SDK config: %v", err)
	}
	ddbClient := dynamodb.NewFromConfig(cfg)
	log.Debug().Msg("DynamoDB Client Created")
	msgTableName := ddbSetup(ddbClient)
	if request.Resource == "/api" {
		log.Info().Msg("Base API")
		respStruct := genericResponse{
			Path: "Base API",
		}
		b, err := json.Marshal(respStruct)
		if err != nil {
			log.Error().Msgf("Error marshalling: %v", err)
			os.Exit(1)
		}
		resp = events.APIGatewayProxyResponse{
			StatusCode: 200,
			Body:       string(b),
		}
	} else if request.Resource == "/api/{proxy+}" {
		log.Info().Msg("Proxy API")
		proxyParam := request.PathParameters["proxy"]
		log.Info().Msgf("Proxy Param: %v", proxyParam)
		if strings.EqualFold("messages", proxyParam) {
			log.Info().Msg("Messages API")
			messages, err := message.GetMessages(ddbClient, msgTableName)
			if err != nil {
				log.Error().Msgf("Error getting messages: %v", err)
				os.Exit(1)
			}
			log.Info().Interface("messages", messages).Send()
			b, err = json.Marshal(messages)
			if err != nil {
				log.Error().Msgf("Error marshalling: %v", err)
				os.Exit(1)
			}
			resp = events.APIGatewayProxyResponse{
				StatusCode: 200,
				Body:       string(b),
			}
		}
	}

	return resp, nil
}

func main() {
	lambda.Start(HandleRequest)
}
