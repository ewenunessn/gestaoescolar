package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/joho/godotenv"

	"github.com/ewenunessn/gestaoescolar/backend-go/internal/config"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/database"
	httpserver "github.com/ewenunessn/gestaoescolar/backend-go/internal/http"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/auth"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/centralstock"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/contractbalanceentries"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/contractproducts"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/contracts"
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/modules/educationmodalities"
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
	"github.com/ewenunessn/gestaoescolar/backend-go/internal/platform/logger"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "api stopped: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	log := logger.New(cfg.AppEnv)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer db.Close()

	router := httpserver.NewRouter(httpserver.RouterConfig{
		ServiceName:      cfg.ServiceName,
		Database:         db,
		TenantTransactor: db,
		Auth:             auth.NewService(auth.NewRepository(db), cfg.SetupToken),
		Schools:          schools.NewService(schools.NewRepository(db)),
		EducationModalities: educationmodalities.NewService(
			educationmodalities.NewRepository(db),
		),
		SchoolModalities: schoolmodalities.NewService(
			schoolmodalities.NewRepository(db),
		),
		Products:  products.NewService(products.NewRepository(db)),
		Suppliers: suppliers.NewService(suppliers.NewRepository(db)),
		Contracts: contracts.NewService(
			contracts.NewRepository(db),
		),
		ContractProducts: contractproducts.NewService(
			contractproducts.NewRepository(db),
		),
		FinancialModalities: financialmodalities.NewService(
			financialmodalities.NewRepository(db),
		),
		ContractBalance: contractbalanceentries.NewService(
			contractbalanceentries.NewRepository(db),
		),
		Meals: meals.NewService(
			meals.NewRepository(db),
		),
		Menus: menus.NewService(
			menus.NewRepository(db),
		),
		MenuPreparations: menupreparations.NewService(
			menupreparations.NewRepository(db),
		),
		MenuDemands: menudemands.NewService(
			menudemands.NewRepository(db),
		),
		Preparations: preparations.NewService(
			preparations.NewRepository(db),
		),
		PreparationProducts: preparationproducts.NewService(
			preparationproducts.NewRepository(db),
		),
		CentralStock: centralstock.NewService(
			centralstock.NewRepository(db),
		),
		SchoolStock: schoolstock.NewService(
			schoolstock.NewRepository(db),
		),
	})

	server := httpserver.NewServer(cfg.HTTPAddr(), router)
	serverErrors := make(chan error, 1)

	go func() {
		log.Info("api listening", "addr", server.Addr, "env", cfg.AppEnv)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErrors <- err
			return
		}
		serverErrors <- nil
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()
		log.Info("api shutting down")
		return server.Shutdown(shutdownCtx)
	case err := <-serverErrors:
		return err
	}
}
