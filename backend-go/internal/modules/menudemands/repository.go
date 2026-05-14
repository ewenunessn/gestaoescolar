package menudemands

import (
	"context"
	"strconv"
	"strings"

	"github.com/ewenunessn/gestaoescolar/backend-go/internal/database"
)

type Repository struct{ db database.DBTX }

func NewRepository(db database.DBTX) *Repository { return &Repository{db: db} }

func (r *Repository) ListMenus(ctx context.Context, input QueryInput) ([]MenuSummary, error) {
	const query = `
		SELECT DISTINCT m.id, m.name
		FROM menus m
		INNER JOIN menu_preparations mp ON mp.tenant_id = m.tenant_id AND mp.menu_id = m.id
		INNER JOIN menu_education_modalities mem ON mem.tenant_id = m.tenant_id AND mem.menu_id = m.id
		WHERE m.tenant_id = current_setting('app.tenant_id', true)::uuid
		  AND m.active = true
		  AND mp.active = true
		  AND m.year = $1
		  AND m.month = $2
		  AND (cardinality($3::bigint[]) = 0 OR m.id = ANY($3::bigint[]))
		ORDER BY m.name, m.id
	`
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, query, input.Year, input.Month, input.MenuIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []MenuSummary{}
	for rows.Next() {
		var item MenuSummary
		if err := rows.Scan(&item.ID, &item.Name); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ListSchoolModalities(ctx context.Context, input QueryInput) ([]SchoolModality, error) {
	const query = `
		SELECT
			e.id,
			e.name,
			sem.education_modality_id,
			em.name,
			sem.student_count
		FROM school_education_modalities sem
		INNER JOIN schools e ON e.tenant_id = sem.tenant_id AND e.id = sem.school_id
		INNER JOIN education_modalities em ON em.tenant_id = sem.tenant_id AND em.id = sem.education_modality_id
		WHERE sem.tenant_id = current_setting('app.tenant_id', true)::uuid
		  AND sem.active = true
		  AND e.active = true
		  AND COALESCE(sem.student_count, 0) > 0
		  AND (cardinality($1::bigint[]) = 0 OR sem.school_id = ANY($1::bigint[]))
		ORDER BY e.name, em.name
	`
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, query, input.SchoolIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []SchoolModality{}
	for rows.Next() {
		var item SchoolModality
		if err := rows.Scan(&item.SchoolID, &item.SchoolName, &item.ModalityID, &item.ModalityName, &item.StudentCount); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ListProductOccurrences(ctx context.Context, input QueryInput) ([]ProductOccurrence, error) {
	dateFilter := "AND menu_date BETWEEN $3::date AND $4::date"
	if input.WithoutDateFilter {
		dateFilter = ""
	}
	query := `
		WITH scoped AS (
			SELECT
				m.id AS cardapio_id,
				m.name AS cardapio_nome,
				mem.education_modality_id AS modalidade_id,
				mp.day AS dia,
				CASE
					WHEN mp.day BETWEEN 1 AND EXTRACT(DAY FROM (date_trunc('month', make_date(m.year, m.month, 1)) + interval '1 month - 1 day'))::int
					THEN make_date(m.year, m.month, mp.day)
				END AS menu_date,
				pp.product_id AS produto_id,
				p.name AS produto_nome,
				p.unit AS unidade,
				NULL::text AS peso_embalagem,
				COALESCE(p.fator_correcao, 1.0)::text AS fator_correcao,
				pp.per_capita_amount::text AS per_capita,
				pp.per_capita_unit AS tipo_medida
			FROM menus m
			INNER JOIN menu_education_modalities mem ON mem.tenant_id = m.tenant_id AND mem.menu_id = m.id
			INNER JOIN menu_preparations mp ON mp.tenant_id = m.tenant_id AND mp.menu_id = m.id
			INNER JOIN preparation_products pp ON pp.tenant_id = m.tenant_id AND pp.preparation_id = mp.preparation_id
			INNER JOIN products p ON p.tenant_id = pp.tenant_id AND p.id = pp.product_id
			WHERE m.tenant_id = current_setting('app.tenant_id', true)::uuid
			  AND m.active = true
			  AND mp.active = true
			  AND pp.active = true
			  AND (pp.education_modality_id = mem.education_modality_id OR pp.education_modality_id IS NULL)
			  AND NOT (
			    pp.education_modality_id IS NULL
			    AND EXISTS (
			      SELECT 1
			      FROM preparation_products specific
			      WHERE specific.tenant_id = pp.tenant_id
			        AND specific.preparation_id = pp.preparation_id
			        AND specific.product_id = pp.product_id
			        AND specific.education_modality_id = mem.education_modality_id
			        AND specific.active = true
			    )
			  )
			  AND m.year = $1
			  AND m.month = $2
			  AND (cardinality($5::bigint[]) = 0 OR m.id = ANY($5::bigint[]))
		)
		SELECT
			modalidade_id,
			produto_id,
			produto_nome,
			unidade,
			peso_embalagem,
			fator_correcao,
			per_capita,
			tipo_medida,
			COUNT(*)::int,
			STRING_AGG(dia::text, ',' ORDER BY dia),
			STRING_AGG(DISTINCT cardapio_id::text, ',' ORDER BY cardapio_id::text),
			STRING_AGG(DISTINCT cardapio_nome, '||' ORDER BY cardapio_nome)
		FROM scoped
		WHERE menu_date IS NOT NULL
		` + dateFilter + `
		GROUP BY modalidade_id, produto_id, produto_nome, unidade, peso_embalagem, fator_correcao, per_capita, tipo_medida
		ORDER BY produto_nome, modalidade_id
	`
	db := database.ExecutorFromContext(ctx, r.db)
	rows, err := db.Query(ctx, query, input.Year, input.Month, dateString(input.StartDate), dateString(input.EndDate), input.MenuIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []ProductOccurrence{}
	for rows.Next() {
		var item ProductOccurrence
		var packageWeight, correctionFactor, perCapita *string
		var days, menuIDs, menuNames string
		if err := rows.Scan(
			&item.ModalityID,
			&item.ProductID,
			&item.ProductName,
			&item.Unit,
			&packageWeight,
			&correctionFactor,
			&perCapita,
			&item.MeasureType,
			&item.Occurrences,
			&days,
			&menuIDs,
			&menuNames,
		); err != nil {
			return nil, err
		}
		item.PackageWeight = parseOptionalFloat(packageWeight)
		item.CorrectionFactor = parseFloatOr(correctionFactor, 1)
		item.PerCapita = parseFloatOr(perCapita, 0)
		item.Days = parseIntList(days)
		item.MenuIDs = parseInt64List(menuIDs)
		item.MenuNames = parseStringList(menuNames, "||")
		items = append(items, item)
	}
	return items, rows.Err()
}

func parseOptionalFloat(value *string) *float64 {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil
	}
	parsed, err := strconv.ParseFloat(strings.TrimSpace(*value), 64)
	if err != nil {
		return nil
	}
	return &parsed
}

func parseFloatOr(value *string, fallback float64) float64 {
	parsed := parseOptionalFloat(value)
	if parsed == nil {
		return fallback
	}
	return *parsed
}

func parseIntList(value string) []int {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	out := make([]int, 0, len(parts))
	for _, part := range parts {
		n, err := strconv.Atoi(strings.TrimSpace(part))
		if err == nil {
			out = append(out, n)
		}
	}
	return out
}

func parseInt64List(value string) []int64 {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	out := make([]int64, 0, len(parts))
	for _, part := range parts {
		n, err := strconv.ParseInt(strings.TrimSpace(part), 10, 64)
		if err == nil {
			out = append(out, n)
		}
	}
	return out
}

func parseStringList(value string, sep string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, sep)
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
