/**
 * EXEMPLO DE USO DO COMPONENTE TableFilter
 * 
 * Este arquivo mostra como implementar o filtro padronizado em suas páginas
 */

import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import { FilterList as FilterIcon } from '@mui/icons-material';
import TableFilter, { FilterField } from './TableFilter';

// ============================================
// EXEMPLO 1: Filtro para Produtos
// ============================================
export const ExemploProdutos = () => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Definir os campos de filtro específicos para produtos
  const filterFields: FilterField[] = [
    {
      type: 'select',
      label: 'Categoria',
      key: 'categoria',
      options: [
        { value: 'cereais', label: 'Cereais' },
        { value: 'carnes', label: 'Carnes' },
        { value: 'hortifruti', label: 'Hortifruti' },
      ],
    },
    {
      type: 'select',
      label: 'Status',
      key: 'status',
      options: [
        { value: 'ativo', label: 'Ativo' },
        { value: 'inativo', label: 'Inativo' },
      ],
    },
    {
      type: 'select',
      label: 'Tipo de Processamento',
      key: 'tipo_processamento',
      options: [
        { value: 'in_natura', label: 'In Natura' },
        { value: 'minimamente_processado', label: 'Minimamente Processado' },
        { value: 'processado', label: 'Processado' },
        { value: 'ultraprocessado', label: 'Ultraprocessado' },
      ],
    },
  ];

  const handleApplyFilters = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
    console.log('Filtros aplicados:', newFilters);
    // Aqui você aplicaria os filtros na sua lista
  };

  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={<FilterIcon />}
        onClick={() => setFilterOpen(true)}
      >
        Filtros
      </Button>

      <TableFilter
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={handleApplyFilters}
        fields={filterFields}
        initialValues={filters}
        showSearch={true}
        searchPlaceholder="Buscar produtos..."
      />
    </Box>
  );
};

// ============================================
// EXEMPLO 2: Filtro para Escolas
// ============================================
export const ExemploEscolas = () => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields: FilterField[] = [
    {
      type: 'select',
      label: 'Município',
      key: 'municipio',
      options: [
        { value: 'sao_paulo', label: 'São Paulo' },
        { value: 'campinas', label: 'Campinas' },
      ],
    },
    {
      type: 'select',
      label: 'Administração',
      key: 'administracao',
      options: [
        { value: 'municipal', label: 'Municipal' },
        { value: 'estadual', label: 'Estadual' },
        { value: 'federal', label: 'Federal' },
        { value: 'particular', label: 'Particular' },
      ],
    },
    {
      type: 'select',
      label: 'Status',
      key: 'status',
      options: [
        { value: 'ativo', label: 'Ativa' },
        { value: 'inativo', label: 'Inativa' },
      ],
    },
  ];

  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={<FilterIcon />}
        onClick={() => setFilterOpen(true)}
      >
        Filtros
      </Button>

      <TableFilter
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
        fields={filterFields}
        initialValues={filters}
        showSearch={true}
        searchPlaceholder="Buscar escolas..."
      />
    </Box>
  );
};

// ============================================
// EXEMPLO 3: Filtro com Range de Data
// ============================================
export const ExemploCompras = () => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields: FilterField[] = [
    {
      type: 'dateRange',
      label: 'Período',
      key: 'data',
    },
    {
      type: 'select',
      label: 'Status',
      key: 'status',
      options: [
        { value: 'pendente', label: 'Pendente' },
        { value: 'aprovado', label: 'Aprovado' },
        { value: 'concluido', label: 'Concluído' },
        { value: 'cancelado', label: 'Cancelado' },
      ],
    },
    {
      type: 'select',
      label: 'Fornecedor',
      key: 'fornecedor',
      options: [
        { value: '1', label: 'Fornecedor A' },
        { value: '2', label: 'Fornecedor B' },
      ],
    },
  ];

  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={<FilterIcon />}
        onClick={() => setFilterOpen(true)}
      >
        Filtros
      </Button>

      <TableFilter
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
        fields={filterFields}
        initialValues={filters}
        showSearch={true}
        searchPlaceholder="Buscar por número do pedido..."
      />
    </Box>
  );
};

// ============================================
// EXEMPLO 4: Filtro Customizado
// ============================================
export const ExemploCustomizado = () => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields: FilterField[] = [
    {
      type: 'select',
      label: 'Status',
      key: 'status',
      options: [
        { value: 'ativo', label: 'Ativo' },
        { value: 'inativo', label: 'Inativo' },
      ],
    },
    {
      type: 'custom',
      label: 'Filtro Personalizado',
      key: 'custom',
      customRender: (value, onChange) => (
        <Box>
          {/* Aqui você pode colocar qualquer componente customizado */}
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Campo customizado..."
            style={{ width: '100%', padding: '8px' }}
          />
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={<FilterIcon />}
        onClick={() => setFilterOpen(true)}
      >
        Filtros
      </Button>

      <TableFilter
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
        fields={filterFields}
        initialValues={filters}
        showSearch={false} // Desabilitar busca por palavra-chave
      />
    </Box>
  );
};

// ============================================
// COMO INTEGRAR NA SUA PÁGINA
// ============================================
/*

1. Importe o componente:
   import TableFilter, { FilterField } from '../components/TableFilter';

2. Adicione os estados:
   const [filterOpen, setFilterOpen] = useState(false);
   const [filters, setFilters] = useState<Record<string, any>>({});

3. Defina os campos de filtro:
   const filterFields: FilterField[] = [
     {
       type: 'select',
       label: 'Status',
       key: 'status',
       options: [
         { value: 'ativo', label: 'Ativo' },
         { value: 'inativo', label: 'Inativo' },
       ],
     },
     // ... mais campos
   ];

4. Substitua o botão de filtros existente:
   <Button
     variant="outlined"
     startIcon={<FilterIcon />}
     onClick={() => setFilterOpen(true)}
   >
     Filtros
   </Button>

5. Adicione o componente TableFilter:
   <TableFilter
     open={filterOpen}
     onClose={() => setFilterOpen(false)}
     onApply={(newFilters) => {
       setFilters(newFilters);
       // Aplicar filtros na sua lista
     }}
     fields={filterFields}
     initialValues={filters}
     showSearch={true}
     searchPlaceholder="Buscar..."
   />

6. Use os filtros na sua lógica de filtragem:
   const filteredData = useMemo(() => {
     return data.filter(item => {
       if (filters.search && !item.nome.toLowerCase().includes(filters.search.toLowerCase())) {
         return false;
       }
       if (filters.status && item.status !== filters.status) {
         return false;
       }
       // ... mais filtros
       return true;
     });
   }, [data, filters]);

*/
