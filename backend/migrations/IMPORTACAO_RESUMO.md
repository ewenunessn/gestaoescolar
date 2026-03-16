# Resumo da Importação de Contratos

## Data: 15/03/2026

### ✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO

## Estatísticas

- **Produtos cadastrados**: 2 novos produtos
- **Fornecedores criados**: 2 novos fornecedores
- **Contratos criados**: 9 contratos
- **Produtos adicionados aos contratos**: 45 itens

## Detalhes

### Produtos Cadastrados
1. MILHO PARA PIPOCA (PACOTE) - ID: 192
2. CEREL EM PÓ DE ARROZ E AVEIA (PACOTE) - ID: 193

### Fornecedores Criados
1. RAMOS COMERCIO LTDA - ID: 78
2. AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA - ID: 79

### Contratos Criados

| Número | Fornecedor | ID | Produtos |
|--------|-----------|-----|----------|
| 252 | RAMOS COMERCIO LTDA | 20 | 1 |
| 66 | RAMOS COMERCIO LTDA | 21 | 1 |
| 369 | RAMOS COMERCIO LTDA | 22 | 1 |
| 368 | DISTRIBUIDORA MESQUITA LTDA | 23 | 8 |
| 64 | DISTRIBUIDORA MESQUITA LTDA | 24 | 18 |
| 253 | DISTRIBUIDORA MESQUITA LTDA | 25 | 6 |
| 250 | AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA | 26 | 8 |
| 62 | AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA | 27 | 4 |
| 367 | AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA | 28 | 1 |

### Produtos por Contrato

#### Contrato 252 - RAMOS COMERCIO LTDA
- BISCOITO CREAM CRACKER (TRIGOLNO) - 25.500 PACOTE @ R$ 4,16

#### Contrato 66 - RAMOS COMERCIO LTDA
- LEITE DE COCO (FREDÃO) - 6.000 GARRAFA @ R$ 2,41

#### Contrato 369 - RAMOS COMERCIO LTDA
- MASSA DE SÊMOLA ARGOLINHA (RICOSA) - 3.200 PACOTE @ R$ 4,69

#### Contrato 368 - DISTRIBUIDORA MESQUITA LTDA
- ARROZ (ACOSTUMADO) - 44.783 KG @ R$ 5,03
- CARNE BOVINA ACÉM (MAFRINORTE) - 11.680 KG @ R$ 27,90
- FILÉ DE PEITO DE FRANGO (AMERICANO) - 24.179 KG @ R$ 20,90
- MANTEIGA SEM LACTOSE (TOURINHO) - 300 UNIDADE @ R$ 17,20
- POLPA DE FRUTA (AÇAÍ) (NUTRIN POLPAS) - 11.500 KG @ R$ 18,99
- ALHO (ALHOBEL) - 2.240 PACOTE @ R$ 14,20
- AÇÚCAR CRISTAL (ITAMARATI) - 24.000 KG @ R$ 4,08
- BISCOITO TIPO MAIZENA (TRIGOLINO) - 3.429 PACOTE @ R$ 4,78

#### Contrato 64 - DISTRIBUIDORA MESQUITA LTDA (18 produtos)
Inclui diversos produtos como biscoitos, cereais, carnes, ovos, etc.

#### Contrato 253 - DISTRIBUIDORA MESQUITA LTDA
- BISCOITO MARIA TRADICIONAL (POTY) - 8.250 PACOTE @ R$ 3,23
- BISCOITO MARIA DE CHOCOLATE (TRIGOLINO) - 5.750 PACOTE @ R$ 4,12
- MILHO PARA PIPOCA (MARIZA) - 5.200 PACOTE @ R$ 5,00
- ÓLEO DE SOJA (CONCÓRDIA) - 5.222 GARRAFA @ R$ 9,40
- POLPA DE FRUTA (ACEROLA) (NUTRIN POLPAS) - 8.000 KG @ R$ 8,40
- POLPA DE FRUTA (GOIABA) (NUTRIN POLPAS) - 20.000 KG @ R$ 8,60

#### Contrato 250 - AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA
- AZEITE DE DENDÊ (MARIZA) - 2.500 GARRAFA @ R$ 4,49
- BATATA (IN NATURA) - 10.600 KG @ R$ 5,62
- BISCOITO ROSCA SABOR LEITE INTEGRAL (TRIGOLINO) - 9.400 PACOTE @ R$ 4,83
- BISCOITO ROSCA SEM LACTOSE CHOCOLATE (TRIGOLINO) - 2.800 PACOTE @ R$ 4,85
- CEREAL EM PÓ DE ARROZ (TRIGOLINO) - 11.111 PACOTE @ R$ 4,37
- CEBOLA BRANCA (IN NATURA) - 20.000 KG @ R$ 3,14
- MILHO BRANCO (MARIZA) - 6.400 PACOTE 500G @ R$ 5,69
- POLPA DE FRUTA (CAJU) (PETRUZ) - 11.000 KG @ R$ 10,39

#### Contrato 62 - AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA
- FARINHA DE TRIGO COM FERMENTO (MIRELLA) - 2.000 KG @ R$ 5,28
- FARINHA DE TRIGO SEM FERMENTO (MIRELLA) - 1.000 KG @ R$ 5,12
- LEITE EM PÓ SEM LACTOSE (ITAMBE) - 4.500 PACOTE @ R$ 18,99
- PÃO DE HAMBÚRGUER (MASSALEVE) - 210.630 UNIDADE @ R$ 0,69

#### Contrato 367 - AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA
- CEREL EM PÓ DE ARROZ E AVEIA (MARATÁ) - 5.556 PACOTE @ R$ 5,76

## Observações

- Todos os contratos foram criados com vigência de 01/01/2025 a 31/12/2025
- Todos os contratos foram criados como tipo "Pregão Eletrônico"
- Todas as marcas foram preservadas conforme a lista original
- Nenhum erro ocorreu durante a importação
- A importação foi feita apenas no banco Neon (Vercel)

## Scripts Utilizados

1. `cadastrar-produtos-faltantes.js` - Cadastrou os 2 produtos que faltavam
2. `import-contratos-data.js` - Importou fornecedores, contratos e produtos

## Próximos Passos

Se necessário ajustar:
- Datas de vigência dos contratos
- Tipo de licitação
- CNPJ dos fornecedores (atualmente com valor padrão)
- Outras informações específicas dos contratos
