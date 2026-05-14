package database

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type DBTX interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

type Transactor interface {
	Begin(context.Context) (pgx.Tx, error)
}

type txContextKey struct{}

func ContextWithTx(ctx context.Context, tx pgx.Tx) context.Context {
	return context.WithValue(ctx, txContextKey{}, tx)
}

func ExecutorFromContext(ctx context.Context, fallback DBTX) DBTX {
	tx, ok := ctx.Value(txContextKey{}).(pgx.Tx)
	if ok && tx != nil {
		return tx
	}
	return fallback
}
