#!/bin/bash
# deploy.sh — Script completo de deploy para desarrollo local
# Uso: ./deploy.sh
# Hace: build + sync + deploy + actualiza IDL + inicializa

set -e  # Detener si hay error

echo "======================================"
echo "  ChainTrack — Deploy Local"
echo "======================================"

# 1. Compilar el programa
echo ""
echo "1/5 Compilando programa Rust..."
anchor build

# 2. Sincronizar el Program ID en lib.rs y Anchor.toml
echo ""
echo "2/5 Sincronizando Program ID..."
anchor keys sync

# 3. Recompilar con el ID correcto (necesario si keys sync cambio algo)
echo ""
echo "3/5 Recompilando con ID sincronizado..."
anchor build

# 4. Desplegar en localnet
echo ""
echo "4/5 Desplegando en localnet..."
anchor deploy --provider.cluster localnet

# 5. Obtener el Program ID actual
PROGRAM_ID=$(grep "logistics_traceability" Anchor.toml | head -1 | awk -F'"' '{print $2}')
echo ""
echo "Program ID: $PROGRAM_ID"

# 6. Actualizar .env.local del frontend
echo "NEXT_PUBLIC_PROGRAM_ID=$PROGRAM_ID" > app/.env.local
echo "NEXT_PUBLIC_RPC_ENDPOINT=http://localhost:8899" >> app/.env.local
echo "5/5 .env.local actualizado"

# 7. Copiar IDL al frontend
cp target/idl/logistics_traceability.json app/public/idl.json
echo "      IDL copiado a app/public/idl.json"

# 8. Inicializar programa y transferir admin a Backpack
echo ""
echo "Inicializando programa..."
npx ts-node scripts/init.ts

echo ""
echo "======================================"
echo "  Deploy completado"
echo "  Program ID: $PROGRAM_ID"
echo "  Ahora ejecuta: cd app && yarn dev"
echo "======================================"
