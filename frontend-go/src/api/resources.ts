import { GoApi } from "./client";
import { Contract, EducationModality, Meal, Menu, Preparation, Product, School, Supplier } from "../types/domain";

export function listSchools(api: GoApi) {
  return api.get<School[]>("/schools/?limit=100");
}

export function listEducationModalities(api: GoApi) {
  return api.get<EducationModality[]>("/education-modalities/?limit=100");
}

export function listProducts(api: GoApi) {
  return api.get<Product[]>("/products/?limit=100");
}

export function listSuppliers(api: GoApi) {
  return api.get<Supplier[]>("/suppliers/?limit=100");
}

export function listContracts(api: GoApi) {
  return api.get<Contract[]>("/contracts/?limit=100");
}

export function listPreparations(api: GoApi) {
  return api.get<Preparation[]>("/preparations/?limit=100");
}

export function listMeals(api: GoApi) {
  return api.get<Meal[]>("/meals/?limit=100");
}

export function listMenus(api: GoApi) {
  return api.get<Menu[]>("/menus/?limit=100");
}

export async function loadWorkspaceLists(api: GoApi) {
  const [schools, modalities, products, suppliers, contracts, preparations, meals, menus] = await Promise.allSettled([
    listSchools(api),
    listEducationModalities(api),
    listProducts(api),
    listSuppliers(api),
    listContracts(api),
    listPreparations(api),
    listMeals(api),
    listMenus(api),
  ]);

  return {
    schools: schools.status === "fulfilled" ? schools.value : [],
    modalities: modalities.status === "fulfilled" ? modalities.value : [],
    products: products.status === "fulfilled" ? products.value : [],
    suppliers: suppliers.status === "fulfilled" ? suppliers.value : [],
    contracts: contracts.status === "fulfilled" ? contracts.value : [],
    preparations: preparations.status === "fulfilled" ? preparations.value : [],
    meals: meals.status === "fulfilled" ? meals.value : [],
    menus: menus.status === "fulfilled" ? menus.value : [],
  };
}
