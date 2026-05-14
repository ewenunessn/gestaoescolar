package config

import (
	"strings"
	"testing"
	"time"
)

func TestLoadFromEnvUsesDefaultsAndDatabaseURL(t *testing.T) {
	env := map[string]string{
		"DATABASE_URL": "postgres://postgres:postgres@localhost:5432/gestaoescolar?sslmode=disable",
	}

	cfg, err := LoadFromEnv(func(key string) (string, bool) {
		value, ok := env[key]
		return value, ok
	})

	if err != nil {
		t.Fatalf("LoadFromEnv returned error: %v", err)
	}
	if cfg.AppEnv != "development" {
		t.Fatalf("AppEnv = %q, want development", cfg.AppEnv)
	}
	if cfg.ServiceName != "gestaoescolar-backend-go" {
		t.Fatalf("ServiceName = %q, want gestaoescolar-backend-go", cfg.ServiceName)
	}
	if cfg.HTTPPort != "8080" {
		t.Fatalf("HTTPPort = %q, want 8080", cfg.HTTPPort)
	}
	if cfg.DatabaseURL != env["DATABASE_URL"] {
		t.Fatalf("DatabaseURL = %q, want %q", cfg.DatabaseURL, env["DATABASE_URL"])
	}
	if cfg.ShutdownTimeout != 10*time.Second {
		t.Fatalf("ShutdownTimeout = %v, want 10s", cfg.ShutdownTimeout)
	}
}

func TestLoadFromEnvRequiresDatabaseURL(t *testing.T) {
	_, err := LoadFromEnv(func(string) (string, bool) {
		return "", false
	})

	if err == nil {
		t.Fatal("LoadFromEnv returned nil error, want missing DATABASE_URL error")
	}
	if !strings.Contains(err.Error(), "DATABASE_URL") {
		t.Fatalf("error = %q, want mention DATABASE_URL", err.Error())
	}
}

func TestLoadFromEnvRejectsInvalidPort(t *testing.T) {
	env := map[string]string{
		"APP_PORT":     "abc",
		"DATABASE_URL": "postgres://postgres:postgres@localhost:5432/gestaoescolar?sslmode=disable",
	}

	_, err := LoadFromEnv(func(key string) (string, bool) {
		value, ok := env[key]
		return value, ok
	})

	if err == nil {
		t.Fatal("LoadFromEnv returned nil error, want invalid APP_PORT error")
	}
	if !strings.Contains(err.Error(), "APP_PORT") {
		t.Fatalf("error = %q, want mention APP_PORT", err.Error())
	}
}
