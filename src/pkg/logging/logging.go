package logging

import (
	"os"
	"strconv"
	"strings"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

type Logger struct {
	*zerolog.Logger
}

func ConfigureLogging() *Logger {

	zerolog.CallerMarshalFunc = func(pc uintptr, file string, line int) string {
		short := file
		for i := len(file) - 1; i > 0; i-- {
			if file[i] == '/' {
				short = file[i+1:]
				break
			}
		}
		file = short
		return file + ":" + strconv.Itoa(line)
	}

	logger := zerolog.New(os.Stderr).With().Timestamp().Logger()
	// Adds the ability to change the logging level using an environment variable
	level := strings.ToUpper(os.Getenv("LOGLEVEL"))
	switch level {
	case "TRACE":
		log.Logger = zerolog.New(os.Stderr).
			Level(zerolog.TraceLevel).
			With().
			Timestamp().
			Caller().
			Logger()
	case "DEBUG":
		log.Logger = zerolog.New(os.Stderr).
			Level(zerolog.DebugLevel).
			With().
			Timestamp().
			Caller().
			Logger()
	case "INFO":
		log.Logger = zerolog.New(os.Stderr).
			Level(zerolog.InfoLevel).
			With().
			Timestamp().
			Caller().
			Logger()
	case "WARN":
		log.Logger = zerolog.New(os.Stderr).
			Level(zerolog.WarnLevel).
			With().
			Timestamp().
			Caller().
			Logger()
	case "ERROR":
		log.Logger = zerolog.New(os.Stderr).
			Level(zerolog.ErrorLevel).
			With().
			Timestamp().
			Caller().
			Logger()
	default: // Default to debug level
		log.Logger = zerolog.New(os.Stderr).
			Level(zerolog.DebugLevel).
			With().
			Timestamp().
			Caller().
			Logger()
	}

	return &Logger{
		Logger: &logger,
	}
}
