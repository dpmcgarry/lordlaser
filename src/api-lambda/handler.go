package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/dpmcgarry/lordlaser/pkg/logging"
	"github.com/rs/zerolog/log"
)

func HandleRequest(ctx context.Context, event map[string]interface{}) (string, error) {
	logging.ConfigureLogging()
	log.Info().Msgf("Context: %v", ctx)
	log.Info().Msgf("Event: %v", event)
	return "foo", nil
}

func main() {
	lambda.Start(HandleRequest)
}
