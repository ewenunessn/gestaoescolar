package auth

import "github.com/go-chi/chi/v5"

func RegisterRoutes(router chi.Router, service ServiceContract) {
	h := NewHandler(service)
	router.Route("/auth", func(router chi.Router) {
		router.Post("/organizations", h.CreateOrganization)
		router.Post("/invites/accept", h.AcceptInvite)
		router.Post("/login", h.Login)
		router.Post("/refresh", h.Refresh)
		router.Post("/logout", h.Logout)
		router.Get("/me", h.Me)
		router.Post("/invites", h.InviteUser)
		router.Put("/users/{userId}/schools", h.SetUserSchools)
	})
}
