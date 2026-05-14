package menudemands

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct {
	menus       []MenuSummary
	schools     []SchoolModality
	occurrences []ProductOccurrence
	queries     []QueryInput
}

func (f *fakeStore) ListMenus(ctx context.Context, input QueryInput) ([]MenuSummary, error) {
	f.queries = append(f.queries, input)
	return f.menus, nil
}

func (f *fakeStore) ListSchoolModalities(ctx context.Context, input QueryInput) ([]SchoolModality, error) {
	f.queries = append(f.queries, input)
	return f.schools, nil
}

func (f *fakeStore) ListProductOccurrences(ctx context.Context, input QueryInput) ([]ProductOccurrence, error) {
	f.queries = append(f.queries, input)
	return f.occurrences, nil
}

func TestCalculateAppliesCorrectionFactorAndAggregatesByProductAndSchool(t *testing.T) {
	packageWeight := 500.0
	store := &fakeStore{
		menus: []MenuSummary{{ID: 9, Name: "Maio"}},
		schools: []SchoolModality{
			{SchoolID: 1, SchoolName: "Escola A", ModalityID: 10, ModalityName: "Fundamental", StudentCount: 100},
			{SchoolID: 2, SchoolName: "Escola B", ModalityID: 10, ModalityName: "Fundamental", StudentCount: 50},
		},
		occurrences: []ProductOccurrence{{
			ModalityID:       10,
			ProductID:        77,
			ProductName:      "Arroz",
			Unit:             "UN",
			PackageWeight:    &packageWeight,
			CorrectionFactor: 1.1,
			PerCapita:        80,
			MeasureType:      "g",
			Occurrences:      2,
			Days:             []int{1, 8},
		}},
	}

	result, err := NewService(store).Calculate(context.Background(), CalculateRequest{
		Competence: "2026-05",
		StartDate:  "2026-05-01",
		EndDate:    "2026-05-15",
	})
	if err != nil {
		t.Fatalf("Calculate returned error: %v", err)
	}
	if len(result.DemandByProduct) != 1 {
		t.Fatalf("products=%d, want 1", len(result.DemandByProduct))
	}
	product := result.DemandByProduct[0]
	if product.QuantityKG != 26.4 {
		t.Fatalf("quantity=%v, want 26.4", product.QuantityKG)
	}
	if product.PackageQuantity == nil || *product.PackageQuantity != 53 {
		t.Fatalf("package quantity=%v, want 53", product.PackageQuantity)
	}
	if len(product.BySchool) != 2 {
		t.Fatalf("by school=%d, want 2", len(product.BySchool))
	}
}

func TestCalculateAlwaysAppliesCorrectionFactor(t *testing.T) {
	store := &fakeStore{
		menus:       []MenuSummary{{ID: 1, Name: "Maio"}},
		schools:     []SchoolModality{{SchoolID: 1, SchoolName: "Escola A", ModalityID: 10, ModalityName: "Fundamental", StudentCount: 100}},
		occurrences: []ProductOccurrence{{ModalityID: 10, ProductID: 1, ProductName: "Feijao", Unit: "kg", CorrectionFactor: 2, PerCapita: 100, MeasureType: "g", Occurrences: 1}},
	}

	result, err := NewService(store).Calculate(context.Background(), CalculateRequest{
		Competence: "2026-05",
		StartDate:  "2026-05-01",
		EndDate:    "2026-05-31",
	})
	if err != nil {
		t.Fatalf("Calculate returned error: %v", err)
	}
	if got := result.DemandByProduct[0].QuantityKG; got != 20 {
		t.Fatalf("quantity=%v, want 20", got)
	}
}

func TestCalculateValidatesRequest(t *testing.T) {
	_, err := NewService(&fakeStore{}).Calculate(context.Background(), CalculateRequest{})
	var ve ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("want validation error, got %v", err)
	}
	for _, field := range []string{"competencia", "data_inicio", "data_fim"} {
		if ve.Fields[field] == "" {
			t.Fatalf("missing validation for %s", field)
		}
	}
}
