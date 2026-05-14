package contractbalanceentries

import "github.com/go-chi/chi/v5"

func RegisterRoutes(router chi.Router, service ServiceContract) {
	h := NewHandler(service)
	router.Get("/contracts/{contractId}/balance-summary", h.Summary)
	router.Route("/contracts/{contractId}/balance-entries", func(router chi.Router) {
		router.Get("/", h.List)
		router.Post("/", h.Create)
		router.Get("/{id}", h.Get)
	})
}
