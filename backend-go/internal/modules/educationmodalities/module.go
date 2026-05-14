package educationmodalities

import "github.com/go-chi/chi/v5"

func RegisterRoutes(router chi.Router, service EducationModalityService) {
	handler := NewHandler(service)
	router.Route("/education-modalities", func(router chi.Router) {
		router.Get("/", handler.List)
		router.Post("/", handler.Create)
		router.Get("/{id}", handler.Get)
		router.Put("/{id}", handler.Update)
		router.Delete("/{id}", handler.Delete)
	})
}
