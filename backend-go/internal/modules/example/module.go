package example

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type Handler struct{}

func RegisterRoutes(router chi.Router) {
	handler := Handler{}
	router.Get("/example", handler.Show)
}

func (Handler) Show(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"module": "example",
		"status": "ok",
	})
}
