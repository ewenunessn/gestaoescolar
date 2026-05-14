package menudemands

type CalculateRequest struct {
	Competence          string  `json:"competencia"`
	StartDate           string  `json:"data_inicio"`
	EndDate             string  `json:"data_fim"`
	SchoolIDs           []int64 `json:"escola_ids"`
	MenuIDs             []int64 `json:"cardapio_ids"`
	IncludeDetails      *bool   `json:"incluir_detalhes"`
	FallbackAllMenuDays *bool   `json:"usar_todos_dias_se_periodo_vazio"`
}

type CalculateResponse struct {
	Competence                 string                 `json:"competencia"`
	Period                     PeriodResponse         `json:"periodo"`
	MenusFound                 int                    `json:"cardapios_encontrados"`
	Menus                      []MenuSummary          `json:"cardapios"`
	SchoolsTotal               int                    `json:"escolas_total"`
	SchoolModalityCombinations int                    `json:"combinacoes_escola_modalidade"`
	Options                    CalculationOptions     `json:"opcoes"`
	DemandByProduct            []ProductDemand        `json:"demanda_por_produto"`
	DemandBySchool             []SchoolDemand         `json:"demanda_por_escola"`
	Consolidated               []ConsolidatedSchool   `json:"consolidado"`
	Warnings                   []string               `json:"avisos,omitempty"`
	Diagnostics                map[string]interface{} `json:"diagnosticos,omitempty"`
}

type PeriodResponse struct {
	StartDate string `json:"data_inicio"`
	EndDate   string `json:"data_fim"`
}

type CalculationOptions struct {
	IncludeDetails      bool `json:"incluir_detalhes"`
	FallbackAllMenuDays bool `json:"usar_todos_dias_se_periodo_vazio"`
}

type MenuSummary struct {
	ID   int64  `json:"id"`
	Name string `json:"nome"`
}

type ProductDemand struct {
	ProductID        int64          `json:"produto_id"`
	ProductName      string         `json:"produto_nome"`
	Unit             string         `json:"unidade"`
	QuantityKG       float64        `json:"quantidade_total_kg"`
	PackageQuantity  *int64         `json:"quantidade_embalagens,omitempty"`
	PackageWeightG   *float64       `json:"peso_embalagem,omitempty"`
	BySchool         []SchoolAmount `json:"por_escola"`
	OccurrenceCount  int            `json:"ocorrencias"`
	CalculationTrace []TraceLine    `json:"calculo_detalhado,omitempty"`
}

type SchoolAmount struct {
	SchoolID   int64   `json:"escola_id"`
	SchoolName string  `json:"escola_nome,omitempty"`
	QuantityKG float64 `json:"quantidade_kg"`
}

type SchoolDemand struct {
	SchoolID        int64           `json:"escola_id"`
	SchoolName      string          `json:"escola_nome"`
	ModalityID      int64           `json:"modalidade_id"`
	ModalityName    string          `json:"modalidade_nome"`
	StudentCount    int             `json:"numero_alunos"`
	Products        []SchoolProduct `json:"produtos"`
	TotalQuantityKG float64         `json:"quantidade_total_kg"`
}

type SchoolProduct struct {
	ProductID       int64    `json:"produto_id"`
	ProductName     string   `json:"produto_nome"`
	Unit            string   `json:"unidade"`
	QuantityKG      float64  `json:"quantidade_kg"`
	PackageQuantity *int64   `json:"quantidade_embalagens,omitempty"`
	PackageWeightG  *float64 `json:"peso_embalagem,omitempty"`
	OccurrenceCount int      `json:"ocorrencias"`
}

type ConsolidatedSchool struct {
	SchoolID        int64           `json:"escola_id"`
	SchoolName      string          `json:"escola_nome"`
	Modalities      string          `json:"modalidades"`
	StudentCount    int             `json:"numero_alunos"`
	Products        []SchoolProduct `json:"produtos"`
	TotalQuantityKG float64         `json:"quantidade_total_kg"`
}

type TraceLine struct {
	SchoolID          int64    `json:"escola_id"`
	SchoolName        string   `json:"escola_nome,omitempty"`
	ModalityID        int64    `json:"modalidade_id"`
	ModalityName      string   `json:"modalidade_nome,omitempty"`
	Students          int      `json:"alunos"`
	PerCapitaOriginal float64  `json:"per_capita_original"`
	PerCapitaGrams    float64  `json:"per_capita_gramas"`
	CorrectionFactor  float64  `json:"fator_correcao"`
	PerCapitaGross    float64  `json:"per_capita_bruto"`
	Occurrences       int      `json:"ocorrencias"`
	Days              []int    `json:"dias"`
	QuantityKG        float64  `json:"quantidade_kg"`
	Formula           string   `json:"formula"`
	MenuIDs           []int64  `json:"cardapio_ids,omitempty"`
	MenuNames         []string `json:"cardapios,omitempty"`
}

type SchoolModality struct {
	SchoolID     int64
	SchoolName   string
	ModalityID   int64
	ModalityName string
	StudentCount int
}

type ProductOccurrence struct {
	ModalityID       int64
	ProductID        int64
	ProductName      string
	Unit             string
	PackageWeight    *float64
	CorrectionFactor float64
	PerCapita        float64
	MeasureType      string
	Occurrences      int
	Days             []int
	MenuIDs          []int64
	MenuNames        []string
}
