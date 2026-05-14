package menudemands

import "github.com/go-chi/chi/v5"

func RegisterRoutes(router chi.Router, service ServiceContract) {
	h := NewHandler(service)
	router.Route("/menu-demands", func(router chi.Router) {
		router.Post("/calculate", h.Calculate)
	})
}
