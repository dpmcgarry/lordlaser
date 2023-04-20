package main

import (
	"context"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/translate"
	"github.com/dpmcgarry/lordlaser/pkg/constants"
	"github.com/dpmcgarry/lordlaser/pkg/ddb"
	"github.com/dpmcgarry/lordlaser/pkg/env"
	"github.com/dpmcgarry/lordlaser/pkg/message"
	"github.com/rs/zerolog/log"
)

func ddbSetup(ddbClient *dynamodb.Client) (string, string) {
	msgTableName, err := env.Get(constants.MessageTableOSEnv)
	if err != nil {
		os.Exit(1)
	}

	log.Info().Msgf("Message Table: %v", msgTableName)

	throttleTableName, err := env.Get(constants.ThrottleTableOSEnv)
	if err != nil {
		os.Exit(1)
	}

	log.Info().Msgf("Throttle Table: %v", throttleTableName)

	_, err = ddb.TableExists(ddbClient, msgTableName)
	if err != nil {
		log.Fatal().Msgf("Table Exists Error for %v: %v", msgTableName, err)
		os.Exit(1)
	}
	_, err = ddb.TableExists(ddbClient, throttleTableName)
	if err != nil {
		log.Fatal().Msgf("Table Exists Error for %v: %v", throttleTableName, err)
		os.Exit(1)
	}
	return msgTableName, throttleTableName
}

func throttleMessages(rawMessages []message.CrowdMessage, ddbClient *dynamodb.Client, throttleTableName string) []message.CrowdMessage {
	log.Info().Msg("Getting Throttles")
	throttles, err := ddb.GetThrottles(ddbClient, throttleTableName)
	if err != nil {
		log.Fatal().Msgf("GetThrottles Error: %v", err)
		os.Exit(1)
	}

	log.Info().Msgf("Got %v Throttles", len(throttles))

	for _, throttle := range throttles {
		log.Info().Msgf("Throttle Type: %v", throttle.ThrottleType)
		for _, throttleValue := range throttle.ThrottleValueList {
			log.Info().Msgf("Throttle Value: %v", throttleValue)
		}
	}
	var unThrottleMessages []message.CrowdMessage
	for _, throttle := range throttles {
		if throttle.ThrottleType == "smsnumber" {
			unThrottleMessages, err = message.ProcessSMSThrottle(rawMessages, throttle)
			if err != nil {
				log.Fatal().Msgf("Error Processing SMS Throttle: %v", err)
				os.Exit(1)
			}
		} else {
			log.Warn().Msgf("Unknown Throttle Type: %v", throttle.ThrottleType)
		}
	}

	log.Info().Msgf("UnThrottle Messages: %v", len(unThrottleMessages))
	return unThrottleMessages
}

func translateMessages(messages []message.CrowdMessage, translateClient *translate.Client) []message.CrowdMessage {
	var translatedMessages []message.CrowdMessage
	for _, msg := range messages {
		resp, err := translateClient.TranslateText(context.TODO(), &translate.TranslateTextInput{
			SourceLanguageCode: aws.String("auto"),
			TargetLanguageCode: aws.String("en"),
			Text:               aws.String(msg.Body),
		})
		if err != nil {
			log.Fatal().Msgf("Error translating text: %v", err)
			os.Exit(1)
		}
		log.Debug().Msgf("Detected Language: %v", *resp.SourceLanguageCode)
		msg.Language = *resp.SourceLanguageCode
		msg.TranslatedBody = *resp.TranslatedText
		translatedMessages = append(translatedMessages, msg)
	}
	return translatedMessages
}
