package schoolstock

import "github.com/go-chi/chi/v5"

func RegisterRoutes(router chi.Router, service ServiceContract) {
	h := NewHandler(service)
	router.Route("/schools/{schoolId}/stock", func(router chi.Router) {
		router.Get("/movements", h.List)
		router.Post("/movements", h.Create)
		router.Get("/movements/{id}", h.Get)
		router.Get("/balances", h.Balances)
	})
}
