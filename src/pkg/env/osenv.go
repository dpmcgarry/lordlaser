package env

import (
	"fmt"
	"os"

	"github.com/rs/zerolog/log"
)

func Get(key string) (string, error) {
	envvar, ok := os.LookupEnv(key)
	if !ok {
		err := fmt.Errorf("OSENV variable %v not present", key)
		log.Error().Msgf("Error reading env var: %v", err)
		return "", err
	}
	return envvar, nil
}
