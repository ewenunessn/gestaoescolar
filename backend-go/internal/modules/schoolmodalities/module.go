package schoolmodalities

import "github.com/go-chi/chi/v5"

func RegisterRoutes(router chi.Router, service ServiceContract) {
	handler := NewHandler(service)
	router.Route("/schools/{schoolId}/education-modalities", func(router chi.Router) {
		router.Get("/", handler.List)
		router.Post("/", handler.Create)
		router.Put("/{id}", handler.Update)
		router.Delete("/{id}", handler.Delete)
	})
}
