package httpserver

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/ewenunessn/gestaoescolar/backend-go/internal/database"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/auth"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/centralstock"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/contractbalanceentries"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/contractproducts"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/contracts"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/educationmodalities"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/example"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/financialmodalities"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/meals"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/menudemands"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/menupreparations"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/menus"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/preparationproducts"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/preparations"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/products"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/schoolmodalities"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/schools"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/schoolstock"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/suppliers"
)

type ReadinessChecker interface {
	Ping(context.Context) error
}

type RouterConfig struct {
	ServiceName         string
	Database            ReadinessChecker
	TenantTransactor    database.Transactor
	Auth                auth.ServiceContract
	Schools             schools.SchoolService
	EducationModalities educationmodalities.EducationModalityService
	SchoolModalities    schoolmodalities.ServiceContract
	Products            products.ServiceContract
	Suppliers           suppliers.ServiceContract
	Contracts           contracts.ServiceContract
	ContractProducts    contractproducts.ServiceContract
	FinancialModalities financialmodalities.ServiceContract
	ContractBalance     contractbalanceentries.ServiceContract
	Meals               meals.ServiceContract
	Menus               menus.ServiceContract
	MenuPreparations    menupreparations.ServiceContract
	MenuDemands         menudemands.ServiceContract
	Preparations        preparations.ServiceContract
	PreparationProducts preparationproducts.ServiceContract
	CentralStock        centralstock.ServiceContract
	SchoolStock         schoolstock.ServiceContract
}

func NewRouter(cfg RouterConfig) http.Handler {
	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(middleware.Recoverer)
	router.Use(middleware.Timeout(30 * time.Second))

	router.Get("/health", healthHandler(cfg.ServiceName))
	router.Get("/ready", readyHandler(cfg.Database))
	router.Route("/api/v1", func(router chi.Router) {
		if cfg.Auth != nil {
			auth.RegisterRoutes(router, cfg.Auth)
		}
		if cfg.TenantTransactor != nil {
			router.Group(func(router chi.Router) {
				router.Use(tenantMiddleware(cfg.TenantTransactor))
				registerTenantRoutes(router, cfg)
			})
			return
		}
		registerTenantRoutes(router, cfg)
	})

	return router
}

func registerTenantRoutes(router chi.Router, cfg RouterConfig) {
	example.RegisterRoutes(router)
	if cfg.Schools != nil {
		schools.RegisterRoutes(router, cfg.Schools)
	}
	if cfg.EducationModalities != nil {
		educationmodalities.RegisterRoutes(router, cfg.EducationModalities)
	}
	if cfg.SchoolModalities != nil {
		schoolmodalities.RegisterRoutes(router, cfg.SchoolModalities)
	}
	if cfg.Products != nil {
		products.RegisterRoutes(router, cfg.Products)
	}
	if cfg.Suppliers != nil {
		suppliers.RegisterRoutes(router, cfg.Suppliers)
	}
	if cfg.Contracts != nil {
		contracts.RegisterRoutes(router, cfg.Contracts)
	}
	if cfg.ContractProducts != nil {
		contractproducts.RegisterRoutes(router, cfg.ContractProducts)
	}
	if cfg.FinancialModalities != nil {
		financialmodalities.RegisterRoutes(router, cfg.FinancialModalities)
	}
	if cfg.ContractBalance != nil {
		contractbalanceentries.RegisterRoutes(router, cfg.ContractBalance)
	}
	if cfg.Meals != nil {
		meals.RegisterRoutes(router, cfg.Meals)
	}
	if cfg.Menus != nil {
		menus.RegisterRoutes(router, cfg.Menus)
	}
	if cfg.MenuPreparations != nil {
		menupreparations.RegisterRoutes(router, cfg.MenuPreparations)
	}
	if cfg.MenuDemands != nil {
		menudemands.RegisterRoutes(router, cfg.MenuDemands)
	}
	if cfg.Preparations != nil {
		preparations.RegisterRoutes(router, cfg.Preparations)
	}
	if cfg.PreparationProducts != nil {
		preparationproducts.RegisterRoutes(router, cfg.PreparationProducts)
	}
	if cfg.CentralStock != nil {
		centralstock.RegisterRoutes(router, cfg.CentralStock)
	}
	if cfg.SchoolStock != nil {
		schoolstock.RegisterRoutes(router, cfg.SchoolStock)
	}
}

func healthHandler(serviceName string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{
			"service": serviceName,
			"status":  "ok",
		})
	}
}

func readyHandler(db ReadinessChecker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if db == nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{
				"reason": "database_not_configured",
				"status": "unavailable",
			})
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		if err := db.Ping(ctx); err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{
				"reason": "database_unavailable",
				"status": "unavailable",
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{
			"status": "ready",
		})
	}
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}
