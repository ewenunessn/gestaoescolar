package tenant

import "context"

type contextKey struct{}

func ContextWithID(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, contextKey{}, tenantID)
}

func IDFromContext(ctx context.Context) (string, bool) {
	tenantID, ok := ctx.Value(contextKey{}).(string)
	return tenantID, ok && tenantID != ""
}
