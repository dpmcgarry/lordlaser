package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"os"
	"regexp"
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
	msgR, err := regexp.Compile("messages/[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$")
	log.Info().Msg("Regex Created")
	if err != nil {
		log.Error().Msgf("Error creating regex: %v", err)
		os.Exit(1)
	}
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatal().Msgf("unable to get SDK config: %v", err)
	}
	ddbClient := dynamodb.NewFromConfig(cfg)
	log.Debug().Msg("DynamoDB Client Created")
	msgTableName := ddbSetup(ddbClient)
	if request.Resource == "/api" {
		resp = baseGET()
	} else if request.Resource == "/api/{proxy+}" {
		log.Info().Msg("Proxy API")
		proxyParam := request.PathParameters["proxy"]
		log.Info().Msgf("Proxy Param: %v", proxyParam)
		if strings.EqualFold("messages", proxyParam) {
			log.Info().Msg("Messages GET API")
			resp = messagesGET(ddbClient, msgTableName)
		} else if msgR.MatchString(proxyParam) {
			log.Info().Msg("Message API")
			msgID := strings.Split(proxyParam, "/")[1]
			switch request.HTTPMethod {
			case "GET":
				resp = messageGET(ddbClient, msgTableName, msgID)
			case "PUT":
				var b []byte
				if request.IsBase64Encoded {
					log.Info().Msg("Base64 Encoded")
					b, err = base64.StdEncoding.DecodeString(request.Body)
					if err != nil {
						log.Error().Msgf("Error decoding Base64: %v", err)
						os.Exit(1)
					}
				} else {
					log.Info().Msg("Not Base64 Encoded")
					b = []byte(request.Body)
				}

				var msg message.CrowdMessage
				err := json.Unmarshal(b, &msg)
				if err != nil {
					log.Error().Msgf("Error unmarshalling PUT Body: %v", err)
					os.Exit(1)
				}
				resp = messagePUT(ddbClient, msgTableName, msg)
			}
		}
	}

	return resp, nil
}

func main() {
	lambda.Start(HandleRequest)
}
