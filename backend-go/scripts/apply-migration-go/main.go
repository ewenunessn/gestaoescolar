package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: go run ./scripts/apply-migration-go <migration-file>")
		os.Exit(1)
	}
	databaseURL, err := databaseURLFromEnv(".env")
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	sql, err := os.ReadFile(os.Args[1])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	conn, err := pgx.Connect(ctx, databaseURL)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer conn.Close(ctx)
	if _, err := conn.Exec(ctx, string(sql)); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Printf("{\"applied\":%q}\n", os.Args[1])
}

func databaseURLFromEnv(path string) (string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	for _, line := range strings.Split(string(content), "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "DATABASE_URL=") {
			value := strings.TrimSpace(strings.TrimPrefix(line, "DATABASE_URL="))
			if value != "" {
				return value, nil
			}
		}
	}
	return "", fmt.Errorf("DATABASE_URL not found in %s", path)
}
