package main

import (
	"context"
	"os"

	"github.com/dpmcgarry/lordlaser/pkg/logging"
	"github.com/dpmcgarry/lordlaser/pkg/message"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/translate"
	"github.com/rs/zerolog/log"
)

func HandleRequest(ctx context.Context, event events.SNSEvent) (string, error) {
	logging.ConfigureLogging()
	log.Info().Msgf("Context: %v", ctx)
	messages, err := message.ParseFromLambdaSMS(event.Records)
	if err != nil {
		log.Fatal().Msgf("Error Parsing Messages: %v", err)
		os.Exit(1)
	}
	for _, msg := range messages {
		log.Info().Msgf("Message: %v", msg)
	}

	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatal().Msgf("unable to get SDK config: %v", err)
	}

	ddbClient := dynamodb.NewFromConfig(cfg)
	log.Debug().Msg("DynamoDB Client Created")
	msgTableName, throttleTableName := ddbSetup(ddbClient)
	unThrottleMessages := throttleMessages(messages, ddbClient, throttleTableName)

	translateClient := translate.NewFromConfig(cfg)
	translatedMessages := translateMessages(unThrottleMessages, translateClient)

	written, err := message.PutMessages(translatedMessages, ddbClient, msgTableName)
	if err != nil {
		log.Fatal().Msgf("Error Writing Messages: %v", err)
		os.Exit(1)
	}

	log.Info().Msgf("Wrote %v messages", written)

	return "Great Success", nil
}

func main() {
	lambda.Start(HandleRequest)
}
