package menudemands

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"
)

var ErrNoMenus = errors.New("no active menus found")

type ValidationError struct{ Fields map[string]string }

func (e ValidationError) Error() string { return "validation failed" }

type Store interface {
	ListMenus(context.Context, QueryInput) ([]MenuSummary, error)
	ListSchoolModalities(context.Context, QueryInput) ([]SchoolModality, error)
	ListProductOccurrences(context.Context, QueryInput) ([]ProductOccurrence, error)
}

type QueryInput struct {
	Year              int
	Month             int
	Competence        string
	StartDate         time.Time
	EndDate           time.Time
	SchoolIDs         []int64
	MenuIDs           []int64
	WithoutDateFilter bool
}

type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }

func (s *Service) Calculate(ctx context.Context, req CalculateRequest) (CalculateResponse, error) {
	input, opts, err := normalizeRequest(req)
	if err != nil {
		return CalculateResponse{}, err
	}

	menus, err := s.store.ListMenus(ctx, input)
	if err != nil {
		return CalculateResponse{}, err
	}
	if len(menus) == 0 {
		return CalculateResponse{}, ErrNoMenus
	}

	schools, err := s.store.ListSchoolModalities(ctx, input)
	if err != nil {
		return CalculateResponse{}, err
	}

	occurrences, err := s.store.ListProductOccurrences(ctx, input)
	if err != nil {
		return CalculateResponse{}, err
	}

	warnings := []string{}
	if len(occurrences) == 0 && opts.FallbackAllMenuDays {
		fallback := input
		fallback.WithoutDateFilter = true
		occurrences, err = s.store.ListProductOccurrences(ctx, fallback)
		if err != nil {
			return CalculateResponse{}, err
		}
		if len(occurrences) > 0 {
			warnings = append(warnings, "Nenhuma refeicao encontrada no periodo informado; calculo feito com todos os dias dos cardapios selecionados.")
		}
	}

	return buildResponse(input, opts, menus, schools, occurrences, warnings), nil
}

func normalizeRequest(req CalculateRequest) (QueryInput, CalculationOptions, error) {
	fields := map[string]string{}
	competence, year, month, ok := normalizeCompetence(req.Competence)
	if !ok {
		fields["competencia"] = "competencia must use YYYY-MM and have a valid month"
	}
	start, err := parseDate(req.StartDate)
	if err != nil {
		fields["data_inicio"] = "data_inicio must use YYYY-MM-DD"
	}
	end, err := parseDate(req.EndDate)
	if err != nil {
		fields["data_fim"] = "data_fim must use YYYY-MM-DD"
	}
	if !start.IsZero() && !end.IsZero() && end.Before(start) {
		fields["data_fim"] = "data_fim must be greater than or equal to data_inicio"
	}
	if len(fields) > 0 {
		return QueryInput{}, CalculationOptions{}, ValidationError{Fields: fields}
	}

	opts := CalculationOptions{
		IncludeDetails:      boolValue(req.IncludeDetails, true),
		FallbackAllMenuDays: boolValue(req.FallbackAllMenuDays, false),
	}
	return QueryInput{
		Year:       year,
		Month:      month,
		Competence: competence,
		StartDate:  start,
		EndDate:    end,
		SchoolIDs:  positiveIDs(req.SchoolIDs),
		MenuIDs:    positiveIDs(req.MenuIDs),
	}, opts, nil
}

func buildResponse(input QueryInput, opts CalculationOptions, menus []MenuSummary, schools []SchoolModality, occurrences []ProductOccurrence, warnings []string) CalculateResponse {
	occByModality := map[int64][]ProductOccurrence{}
	for _, occurrence := range occurrences {
		occByModality[occurrence.ModalityID] = append(occByModality[occurrence.ModalityID], occurrence)
	}

	productTotals := map[int64]*ProductDemand{}
	schoolDemands := map[string]*SchoolDemand{}
	consolidated := map[int64]*ConsolidatedSchool{}

	for _, school := range schools {
		if _, ok := consolidated[school.SchoolID]; !ok {
			consolidated[school.SchoolID] = &ConsolidatedSchool{SchoolID: school.SchoolID, SchoolName: school.SchoolName}
		}
		cons := consolidated[school.SchoolID]
		cons.StudentCount += school.StudentCount
		appendModalityName(cons, school.ModalityName)

		for _, occurrence := range occByModality[school.ModalityID] {
			qtyKG, perCapitaGrams, perCapitaGross := calculateQuantityKG(school.StudentCount, occurrence)
			if qtyKG <= 0 {
				continue
			}

			if _, ok := productTotals[occurrence.ProductID]; !ok {
				productTotals[occurrence.ProductID] = &ProductDemand{
					ProductID:       occurrence.ProductID,
					ProductName:     occurrence.ProductName,
					Unit:            outputUnit(occurrence.Unit, occurrence.PackageWeight),
					PackageWeightG:  occurrence.PackageWeight,
					BySchool:        []SchoolAmount{},
					OccurrenceCount: occurrence.Occurrences,
				}
			}
			total := productTotals[occurrence.ProductID]
			total.QuantityKG += qtyKG
			total.OccurrenceCount += occurrence.Occurrences
			addSchoolAmount(total, school, qtyKG)
			if opts.IncludeDetails {
				total.CalculationTrace = append(total.CalculationTrace, traceLine(school, occurrence, qtyKG, perCapitaGrams, perCapitaGross))
			}

			key := fmt.Sprintf("%d:%d", school.SchoolID, school.ModalityID)
			if _, ok := schoolDemands[key]; !ok {
				schoolDemands[key] = &SchoolDemand{
					SchoolID:     school.SchoolID,
					SchoolName:   school.SchoolName,
					ModalityID:   school.ModalityID,
					ModalityName: school.ModalityName,
					StudentCount: school.StudentCount,
					Products:     []SchoolProduct{},
				}
			}
			addSchoolProduct(&schoolDemands[key].Products, occurrence, qtyKG)
			schoolDemands[key].TotalQuantityKG += qtyKG
			addSchoolProduct(&cons.Products, occurrence, qtyKG)
			cons.TotalQuantityKG += qtyKG
		}
	}

	products := make([]ProductDemand, 0, len(productTotals))
	for _, item := range productTotals {
		item.QuantityKG = round(item.QuantityKG, 3)
		item.PackageQuantity = packageQuantity(item.QuantityKG, item.PackageWeightG, item.Unit)
		sortSchoolAmounts(item.BySchool)
		for i := range item.BySchool {
			item.BySchool[i].QuantityKG = round(item.BySchool[i].QuantityKG, 3)
		}
		products = append(products, *item)
	}
	sort.Slice(products, func(i, j int) bool {
		if products[i].QuantityKG == products[j].QuantityKG {
			return products[i].ProductName < products[j].ProductName
		}
		return products[i].QuantityKG > products[j].QuantityKG
	})

	bySchool := make([]SchoolDemand, 0, len(schoolDemands))
	for _, item := range schoolDemands {
		finalizeSchoolProducts(item.Products)
		item.TotalQuantityKG = round(item.TotalQuantityKG, 3)
		bySchool = append(bySchool, *item)
	}
	sort.Slice(bySchool, func(i, j int) bool {
		if bySchool[i].SchoolName == bySchool[j].SchoolName {
			return bySchool[i].ModalityName < bySchool[j].ModalityName
		}
		return bySchool[i].SchoolName < bySchool[j].SchoolName
	})

	consolidatedItems := make([]ConsolidatedSchool, 0, len(consolidated))
	for _, item := range consolidated {
		finalizeSchoolProducts(item.Products)
		item.TotalQuantityKG = round(item.TotalQuantityKG, 3)
		consolidatedItems = append(consolidatedItems, *item)
	}
	sort.Slice(consolidatedItems, func(i, j int) bool { return consolidatedItems[i].SchoolName < consolidatedItems[j].SchoolName })

	return CalculateResponse{
		Competence:                 input.Competence,
		Period:                     PeriodResponse{StartDate: dateString(input.StartDate), EndDate: dateString(input.EndDate)},
		MenusFound:                 len(menus),
		Menus:                      menus,
		SchoolsTotal:               len(consolidated),
		SchoolModalityCombinations: len(schools),
		Options:                    opts,
		DemandByProduct:            products,
		DemandBySchool:             bySchool,
		Consolidated:               consolidatedItems,
		Warnings:                   warnings,
		Diagnostics: map[string]interface{}{
			"linhas_agregadas_cardapio": len(occurrences),
			"algoritmo":                 "sql_aggregate_by_menu_modality_product_then_school_consolidation",
		},
	}
}

func calculateQuantityKG(students int, occurrence ProductOccurrence) (float64, float64, float64) {
	perCapitaGrams := normalizeToGrams(occurrence.PerCapita, occurrence.MeasureType)
	correctionFactor := occurrence.CorrectionFactor
	if correctionFactor <= 0 {
		correctionFactor = 1
	}
	perCapitaGross := perCapitaGrams * correctionFactor
	return float64(students) * perCapitaGross * float64(occurrence.Occurrences) / 1000, perCapitaGrams, perCapitaGross
}

func traceLine(school SchoolModality, occurrence ProductOccurrence, qtyKG float64, perCapitaGrams float64, perCapitaGross float64) TraceLine {
	return TraceLine{
		SchoolID:          school.SchoolID,
		SchoolName:        school.SchoolName,
		ModalityID:        school.ModalityID,
		ModalityName:      school.ModalityName,
		Students:          school.StudentCount,
		PerCapitaOriginal: occurrence.PerCapita,
		PerCapitaGrams:    round(perCapitaGrams, 4),
		CorrectionFactor:  occurrence.CorrectionFactor,
		PerCapitaGross:    round(perCapitaGross, 4),
		Occurrences:       occurrence.Occurrences,
		Days:              occurrence.Days,
		QuantityKG:        round(qtyKG, 3),
		Formula:           fmt.Sprintf("%d alunos x %.4gg x %d ocorrencias = %.3fkg", school.StudentCount, perCapitaGross, occurrence.Occurrences, qtyKG),
		MenuIDs:           occurrence.MenuIDs,
		MenuNames:         occurrence.MenuNames,
	}
}

func addSchoolAmount(product *ProductDemand, school SchoolModality, qtyKG float64) {
	for i := range product.BySchool {
		if product.BySchool[i].SchoolID == school.SchoolID {
			product.BySchool[i].QuantityKG += qtyKG
			return
		}
	}
	product.BySchool = append(product.BySchool, SchoolAmount{SchoolID: school.SchoolID, SchoolName: school.SchoolName, QuantityKG: qtyKG})
}

func addSchoolProduct(products *[]SchoolProduct, occurrence ProductOccurrence, qtyKG float64) {
	for i := range *products {
		if (*products)[i].ProductID == occurrence.ProductID {
			(*products)[i].QuantityKG += qtyKG
			(*products)[i].OccurrenceCount += occurrence.Occurrences
			return
		}
	}
	*products = append(*products, SchoolProduct{
		ProductID:       occurrence.ProductID,
		ProductName:     occurrence.ProductName,
		Unit:            outputUnit(occurrence.Unit, occurrence.PackageWeight),
		QuantityKG:      qtyKG,
		PackageWeightG:  occurrence.PackageWeight,
		OccurrenceCount: occurrence.Occurrences,
	})
}

func finalizeSchoolProducts(products []SchoolProduct) {
	for i := range products {
		products[i].QuantityKG = round(products[i].QuantityKG, 3)
		products[i].PackageQuantity = packageQuantity(products[i].QuantityKG, products[i].PackageWeightG, products[i].Unit)
	}
	sort.Slice(products, func(i, j int) bool { return products[i].ProductName < products[j].ProductName })
}

func packageQuantity(quantityKG float64, packageWeightG *float64, unit string) *int64 {
	if packageWeightG == nil || *packageWeightG <= 0 || isKGUnit(unit) {
		return nil
	}
	qty := int64(math.Ceil(quantityKG * 1000 / *packageWeightG))
	return &qty
}

func outputUnit(unit string, packageWeightG *float64) string {
	unit = strings.TrimSpace(unit)
	if unit == "" {
		return "kg"
	}
	if packageWeightG != nil && *packageWeightG > 0 && !isKGUnit(unit) {
		return unit
	}
	return "kg"
}

func normalizeToGrams(value float64, measureType string) float64 {
	switch strings.ToLower(strings.TrimSpace(measureType)) {
	case "mg", "miligrama", "miligramas":
		return value / 1000
	default:
		return value
	}
}

func appendModalityName(school *ConsolidatedSchool, name string) {
	if name == "" {
		return
	}
	if school.Modalities == "" {
		school.Modalities = name
		return
	}
	for _, current := range strings.Split(school.Modalities, ", ") {
		if current == name {
			return
		}
	}
	school.Modalities += ", " + name
}

func normalizeCompetence(value string) (string, int, int, bool) {
	parts := strings.Split(strings.TrimSpace(value), "-")
	if len(parts) != 2 {
		return "", 0, 0, false
	}
	year, errYear := strconv.Atoi(parts[0])
	month, errMonth := strconv.Atoi(parts[1])
	if errYear != nil || errMonth != nil || year < 1 || month < 1 || month > 12 {
		return "", 0, 0, false
	}
	return fmt.Sprintf("%04d-%02d", year, month), year, month, true
}

func parseDate(value string) (time.Time, error) {
	return time.Parse("2006-01-02", strings.TrimSpace(value))
}

func dateString(value time.Time) string { return value.Format("2006-01-02") }

func boolValue(value *bool, fallback bool) bool {
	if value == nil {
		return fallback
	}
	return *value
}

func positiveIDs(ids []int64) []int64 {
	out := make([]int64, 0, len(ids))
	seen := map[int64]bool{}
	for _, id := range ids {
		if id > 0 && !seen[id] {
			out = append(out, id)
			seen[id] = true
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i] < out[j] })
	return out
}

func round(value float64, precision int) float64 {
	pow := math.Pow10(precision)
	return math.Round(value*pow) / pow
}

func isKGUnit(unit string) bool {
	switch strings.ToLower(strings.TrimSpace(unit)) {
	case "", "kg", "quilo", "kilo", "quilograma", "quilogramas":
		return true
	default:
		return false
	}
}

func sortSchoolAmounts(items []SchoolAmount) {
	sort.Slice(items, func(i, j int) bool { return items[i].SchoolName < items[j].SchoolName })
}
