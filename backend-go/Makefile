.PHONY: dev test fmt tidy

dev:
	go run ./cmd/api

test:
	go test ./...

fmt:
	gofmt -w cmd internal

tidy:
	go mod tidy
