package httpserver

import (
	"net/http"
	"regexp"

	"github.com/ewenunessn/gestaoescolar/backend-go/internal/database"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/tenant"
)

const tenantHeader = "X-Tenant-ID"

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)

func tenantMiddleware(transactor database.Transactor) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tenantID := r.Header.Get(tenantHeader)
			if !uuidPattern.MatchString(tenantID) {
				writeJSON(w, http.StatusBadRequest, map[string]any{
					"error": map[string]string{
						"code":    "invalid_tenant",
						"message": "X-Tenant-ID header must be a valid UUID",
					},
				})
				return
			}

			tx, err := transactor.Begin(r.Context())
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{
					"error": map[string]string{
						"code":    "tenant_transaction_failed",
						"message": "Could not start tenant-scoped transaction",
					},
				})
				return
			}

			committed := false
			defer func() {
				if !committed {
					_ = tx.Rollback(r.Context())
				}
			}()

			if _, err := tx.Exec(r.Context(), "select set_config('app.tenant_id', $1, true)", tenantID); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{
					"error": map[string]string{
						"code":    "tenant_context_failed",
						"message": "Could not set tenant context",
					},
				})
				return
			}

			recorder := &statusRecorder{ResponseWriter: w, statusCode: http.StatusOK}
			ctx := database.ContextWithTx(tenant.ContextWithID(r.Context(), tenantID), tx)
			next.ServeHTTP(recorder, r.WithContext(ctx))

			if recorder.statusCode >= http.StatusInternalServerError {
				return
			}
			if err := tx.Commit(r.Context()); err != nil {
				return
			}
			committed = true
		})
	}
}

type statusRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (r *statusRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}
