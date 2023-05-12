package main

import (
	"os"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/dpmcgarry/lordlaser/pkg/constants"
	"github.com/dpmcgarry/lordlaser/pkg/ddb"
	"github.com/dpmcgarry/lordlaser/pkg/env"
	"github.com/rs/zerolog/log"
)

func ddbSetup(ddbClient *dynamodb.Client) string {
	msgTableName, err := env.Get(constants.MessageTableOSEnv)
	if err != nil {
		os.Exit(1)
	}

	log.Info().Msgf("Message Table: %v", msgTableName)

	_, err = ddb.TableExists(ddbClient, msgTableName)
	if err != nil {
		log.Fatal().Msgf("Table Exists Error for %v: %v", msgTableName, err)
		os.Exit(1)
	}
	return msgTableName
}
