package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type LookupFunc func(string) (string, bool)

type Config struct {
	AppEnv          string
	ServiceName     string
	HTTPPort        string
	DatabaseURL     string
	SetupToken      string
	ShutdownTimeout time.Duration
}

func Load() (Config, error) {
	return LoadFromEnv(os.LookupEnv)
}

func LoadFromEnv(lookup LookupFunc) (Config, error) {
	cfg := Config{
		AppEnv:          envOrDefault(lookup, "APP_ENV", "development"),
		ServiceName:     envOrDefault(lookup, "SERVICE_NAME", "gestaoescolar-backend-go"),
		HTTPPort:        envOrDefault(lookup, "APP_PORT", "8080"),
		DatabaseURL:     envOrDefault(lookup, "DATABASE_URL", ""),
		SetupToken:      envOrDefault(lookup, "SETUP_TOKEN", ""),
		ShutdownTimeout: 10 * time.Second,
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	port, err := strconv.Atoi(cfg.HTTPPort)
	if err != nil || port < 1 || port > 65535 {
		return Config{}, fmt.Errorf("APP_PORT must be a valid TCP port")
	}

	if value, ok := lookup("SHUTDOWN_TIMEOUT"); ok && strings.TrimSpace(value) != "" {
		timeout, err := time.ParseDuration(strings.TrimSpace(value))
		if err != nil {
			return Config{}, fmt.Errorf("SHUTDOWN_TIMEOUT must be a valid duration: %w", err)
		}
		cfg.ShutdownTimeout = timeout
	}

	return cfg, nil
}

func (c Config) HTTPAddr() string {
	return ":" + c.HTTPPort
}

func envOrDefault(lookup LookupFunc, key, fallback string) string {
	if value, ok := lookup(key); ok {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	return fallback
}
