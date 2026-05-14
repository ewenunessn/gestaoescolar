package menus

import "github.com/go-chi/chi/v5"

func RegisterRoutes(router chi.Router, service ServiceContract) {
	h := NewHandler(service)
	router.Route("/menus", func(router chi.Router) {
		router.Get("/", h.List)
		router.Post("/", h.Create)
		router.Get("/{id}", h.Get)
		router.Put("/{id}", h.Update)
		router.Delete("/{id}", h.Delete)
	})
}
