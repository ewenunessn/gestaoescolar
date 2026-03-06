#!/bin/bash

echo "========================================"
echo "  SUITE COMPLETA DE TESTES"
echo "========================================"
echo ""

echo "[1/3] Populando dados de teste..."
node seed-test-data.js
if [ $? -ne 0 ]; then
    echo "ERRO ao popular dados!"
    exit 1
fi

echo ""
echo "[2/3] Executando testes de performance..."
node test-performance.js
if [ $? -ne 0 ]; then
    echo "ERRO nos testes de performance!"
    exit 1
fi

echo ""
echo "[3/3] Verificando estoque..."
node verificar-estoque-atual.js
if [ $? -ne 0 ]; then
    echo "ERRO ao verificar estoque!"
    exit 1
fi

echo ""
echo "========================================"
echo "  TODOS OS TESTES CONCLUIDOS!"
echo "========================================"
echo ""
echo "Verifique os relatorios gerados:"
echo "  - docs/RELATORIO-PERFORMANCE.md"
echo "  - docs/TESTE-IDS-VALIDOS.md"
echo ""
