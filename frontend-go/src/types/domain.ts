export type School = {
  id: number;
  name: string;
  code: string;
  address?: string;
  city: string;
  mapsAddress?: string;
  phone?: string;
  email?: string;
  managerName?: string;
  administrationType?: string;
  totalStudents: number;
  modalities: string[];
  active: boolean;
};

export type EducationModality = {
  id: number;
  name: string;
  description?: string;
  active: boolean;
};

export type SchoolEducationModality = {
  id: number;
  schoolId: number;
  educationModalityId: number;
  educationModalityName: string;
  studentCount: number;
  active: boolean;
};

export type Product = {
  id: number;
  name: string;
  description?: string;
  unit: string;
  category: string;
  fator_correcao: number;
  active: boolean;
};

export type Supplier = {
  id: number;
  name: string;
  document: string;
  supplierType: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  active: boolean;
};

export type Contract = {
  id: number;
  number: string;
  supplierId: number;
  supplierName?: string;
  startDate: string;
  endDate: string;
  totalAmount: string;
  status: string;
  contractType: string;
  notes?: string;
  active: boolean;
};

export type ContractProduct = {
  id: number;
  contractId: number;
  productId: number;
  productName?: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  notes?: string;
  active: boolean;
};

export type Preparation = {
  id: number;
  name: string;
  description?: string;
  preparationType: string;
  active: boolean;
};

export type PreparationProduct = {
  id: number;
  preparationId: number;
  productId: number;
  productName?: string;
  educationModalityId?: number;
  educationModalityName?: string;
  perCapitaAmount: string;
  perCapitaUnit: string;
  active: boolean;
};

export type Meal = {
  id: number;
  name: string;
  code: string;
  sortOrder: number;
  active: boolean;
};

export type Menu = {
  id: number;
  name: string;
  description?: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  educationModalityIds?: number[] | null;
  active: boolean;
};

export type MenuPreparation = {
  id: number;
  menuId: number;
  day: number;
  mealId: number;
  mealName: string;
  preparationId: number;
  preparationName: string;
  notes?: string;
  active: boolean;
};

export type DemandResponse = {
  competencia: string;
  cardapios_encontrados: number;
  escolas_total: number;
  combinacoes_escola_modalidade: number;
  demanda_por_produto: Array<{
    produto_id: number;
    produto_nome: string;
    unidade: string;
    quantidade_total_kg: number;
    ocorrencias: number;
  }>;
  consolidado: Array<{
    escola_id: number;
    escola_nome: string;
    modalidades: string;
    numero_alunos: number;
    quantidade_total_kg: number;
  }>;
  avisos?: string[];
};

export type StockMovement = {
  id: number;
  schoolId?: number;
  schoolName?: string;
  productId: number;
  productName: string;
  productUnit: string;
  movementType: string;
  quantity: string;
  quantityDelta: string;
  occurredAt: string;
  description?: string;
  referenceDocument?: string;
  sourceSchoolId?: number;
  sourceSchool?: string;
  destinationSchoolId?: number;
  destinationSchool?: string;
  transferGroupId?: string;
  createdAt: string;
};

export type CentralStockBalance = {
  productId: number;
  productName: string;
  productUnit: string;
  quantity: string;
};

export type SchoolStockBalance = CentralStockBalance & {
  schoolId: number;
  schoolName: string;
};
