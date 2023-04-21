package main

import (
	"context"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/dpmcgarry/lordlaser/pkg/logging"
	"github.com/rs/zerolog/log"
)

func HandleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	logging.ConfigureLogging()
	log.Info().Msgf("Context: %v", ctx)
	log.Info().Msgf("Event: %v", request)
	log.Info().Msgf("HTTP Method: %v", request.HTTPMethod)
	log.Info().Interface("req", request).Send()
	return events.APIGatewayProxyResponse{StatusCode: 200}, nil
}

func main() {
	lambda.Start(HandleRequest)
}
