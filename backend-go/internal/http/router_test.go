package httpserver

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

type fakeReadinessChecker struct {
	err error
}

func (f fakeReadinessChecker) Ping(context.Context) error {
	return f.err
}

func TestHealthReturnsServiceStatus(t *testing.T) {
	router := NewRouter(RouterConfig{
		ServiceName: "test-service",
		Database:    fakeReadinessChecker{},
	})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
	}

	var body map[string]string
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatalf("decode health response: %v", err)
	}
	if body["status"] != "ok" {
		t.Fatalf("status body = %q, want ok", body["status"])
	}
	if body["service"] != "test-service" {
		t.Fatalf("service body = %q, want test-service", body["service"])
	}
}

func TestReadyReturnsUnavailableWhenDatabasePingFails(t *testing.T) {
	router := NewRouter(RouterConfig{
		ServiceName: "test-service",
		Database:    fakeReadinessChecker{err: errors.New("database down")},
	})

	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusServiceUnavailable)
	}
}
