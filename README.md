# LogiChain — Sistema de Trazabilidad Logística en Blockchain Solana

[![Solana](https://img.shields.io/badge/Solana-Localnet-14F195?logo=solana)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.31.1-512BD4)](https://www.anchor-lang.com)
[![Rust](https://img.shields.io/badge/Rust-1.75+-orange?logo=rust)](https://www.rust-lang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org)

## Tabla de contenidos

1. [Descripcion general](#1-descripcion-general)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Stack tecnologico](#3-stack-tecnologico)
4. [Estructura del repositorio](#4-estructura-del-repositorio)
5. [Modelo de datos on-chain](#5-modelo-de-datos-on-chain)
6. [Instrucciones del programa Rust/Anchor](#6-instrucciones-del-programa-rustanchor)
7. [Frontend Next.js](#7-frontend-nextjs)
8. [Gestion de actores](#8-gestion-de-actores)
9. [Flujo operativo](#9-flujo-operativo)
10. [Restricciones de roles y validaciones](#10-restricciones-de-roles-y-validaciones)
11. [IDL y compatibilidad Anchor 0.31](#11-idl-y-compatibilidad-anchor-031)
12. [Requisitos e instalacion](#12-requisitos-e-instalacion)
13. [Despliegue y configuracion](#13-despliegue-y-configuracion)
14. [Scripts de inicializacion y demo](#14-scripts-de-inicializacion-y-demo)
15. [Variables y constantes clave](#15-variables-y-constantes-clave)
16. [Limitaciones conocidas](#16-limitaciones-conocidas)
17. [Decisiones de diseno](#17-decisiones-de-diseno)

---

## 1. Descripcion general

**LogiChain** es un sistema de trazabilidad logistica construido sobre la blockchain **Solana**, desarrollado como Trabajo de Fin de Master (TFM). Permite registrar y verificar de forma inmutable el ciclo de vida completo de un envio: desde su creacion por un remitente hasta su entrega al destinatario, incluyendo cada checkpoint de transporte, incidencias reportadas y su resolucion con notas de acciones tomadas.

### Caracteristicas principales

- **Inmutabilidad**: todos los eventos quedan registrados on-chain y no pueden modificarse retroactivamente.
- **Roles diferenciados**: Sender, Carrier, Hub, Recipient e Inspector con permisos especificos para cada operacion.
- **Cadena de frio**: soporte para envios con requisitos de temperatura controlada con registro de sensor.
- **Trazabilidad completa**: timeline de checkpoints con tipo, ubicacion, timestamp y metadata JSON.
- **Gestion de incidencias**: reporte, seguimiento y resolucion con notas de acciones tomadas on-chain.
- **Ciclo cerrado de entrega**: un envio ENTREGADO no puede recibir nuevos checkpoints ni incidencias.
- **Exportacion PDF**: documento de trazabilidad con todos los eventos para comunicacion con clientes.
- **Pagina de inicio**: dashboard con accesos directos, busqueda de envios y estado del sistema en tiempo real.
- **Frontend reactivo**: estados de envios inferidos automaticamente al cargar, persistentes entre pestanas.

---

## 2. Arquitectura del sistema

```
+-------------------------------------------------------------+
|                        CLIENTE WEB                          |
|                    Next.js 14 + TypeScript                  |
|  +-----------+  +-------------+  +----------+  +---------+ |
|  |  Inicio   |  |  ActorsTab  |  | Shipments|  | /pdf    | |
|  | Dashboard |  | (actores)   |  | Tab      |  | Exportar| |
|  +-----------+  +-------------+  +----------+  +---------+ |
|         Wallet Adapter — Backpack                           |
|         @coral-xyz/anchor 0.31.0                           |
+---------------------------|----------------------------------+
                            | RPC http://localhost:8899
+---------------------------|----------------------------------+
|              SOLANA LOCALNET — solana-test-validator        |
|  Program ID: 88jtu9fMGP9VMtSiXCvva4xy6W3i9CufnYFXMrvgKtRA |
|  PDAs: config / actor / shipment / checkpoint / incident    |
+-------------------------------------------------------------+
```

---

## 3. Stack tecnologico

| Componente | Version | Uso |
|-----------|---------|-----|
| Rust | 1.75+ | Programa on-chain |
| Anchor Framework | 0.31.1 | Framework para programas Solana |
| anchor-lang | 0.31.0 | Macros y abstracciones |
| Next.js | 14.2.0 | Framework React con SSR |
| TypeScript | 5.x | Tipado estatico |
| @coral-xyz/anchor | 0.31.0 | Cliente Anchor browser |
| @solana/web3.js | 1.91.x | SDK Solana JavaScript |
| Backpack Wallet | - | Wallet principal |
| solana-test-validator | 1.18.x | Nodo local de desarrollo |

---

## 4. Estructura del repositorio

```
PFM-Rust-Solana-LCGP-202605/
+-- programs/logistics_traceability/src/
|   +-- lib.rs                    # Punto de entrada Anchor
|   +-- state.rs                  # Structs on-chain
|   +-- error.rs                  # Codigos de error
|   +-- events.rs                 # Eventos emitidos
|   +-- instructions/
|       +-- initialize.rs
|       +-- register_actor.rs
|       +-- update_actor.rs
|       +-- toggle_actor.rs
|       +-- create_shipment.rs    # actor_wallet separado de sender_wallet
|       +-- record_checkpoint.rs  # actor_wallet separado de signer_wallet
|       +-- report_incident.rs    # reporter_actor_wallet separado de signer_wallet
|       +-- resolve_incident.rs   # con resolution_notes
|       +-- transfer_authority.rs
+-- app/src/
|   +-- pages/
|   |   +-- index.tsx             # Dashboard principal con 3 pestanas
|   |   +-- pdf.tsx               # Pagina de exportacion PDF
|   |   +-- _app.tsx              # Configuracion global, favicon
|   +-- components/
|   |   +-- actors/ActorsTab.tsx  # Gestion de actores
|   |   +-- shipments/ShipmentsTab.tsx  # Envios, detalle, checkpoints, incidencias
|   |   +-- LocationSearch.tsx    # Buscador municipios Colombia
|   |   +-- WalletProvider.tsx    # Wallet adapter
|   |   +-- styles.tsx            # Temas claro/oscuro
|   +-- lib/
|       +-- actors.ts             # Deserializacion actores
|       +-- logistics.ts          # Deserializacion Borsh envios/CPK/INC
|       +-- municipios.ts         # 1116 municipios colombianos
|       +-- program.ts            # loadProgram() y fetchConfig()
+-- scripts/
|   +-- init.ts                   # Inicializacion y registro de actores
|   +-- demo-data.ts              # 10 envios de demostracion
+-- app/public/
    +-- idl.json                  # IDL formato compatible browser
    +-- icono_TFM2_solana.png     # Logo de la aplicacion
    +-- icono_TFM2_solana.ico     # Favicon
    +-- ADMIN.svg                 # Icono badge admin
```

---

## 5. Modelo de datos on-chain

### ProgramConfig — PDA: `[b"config"]`

```rust
pub struct ProgramConfig {
    pub authority: Pubkey,         // Admin del programa
    pub next_shipment_id: u64,
    pub next_checkpoint_id: u64,
    pub next_incident_id: u64,
    pub bump: u8,
}
```

### Actor — PDA: `[b"actor", wallet_pubkey]`

```rust
pub struct Actor {
    pub address: Pubkey,
    pub name: String,              // max 128 chars
    pub role: ActorRole,           // Sender=0 Carrier=1 Hub=2 Recipient=3 Inspector=4
    pub location: String,          // max 256 chars
    pub is_active: bool,
    pub registered_at: i64,
    pub shipments_created: u32,
    pub checkpoints_recorded: u32,
    pub bump: u8,
}
```

### Shipment — PDA: `[b"shipment", id_le_u64]`

```rust
pub struct Shipment {
    pub id: u64,
    pub sender: Pubkey,            // address registrada del actor (no la efimera)
    pub recipient: Pubkey,
    pub product: String,           // max 64 chars
    pub origin: String,
    pub destination: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub status: ShipmentStatus,
    pub checkpoint_count: u32,
    pub incident_count: u32,
    pub requires_cold_chain: bool,
    pub max_temperature: i16,      // x10 (45 = 4.5 C)
    pub bump: u8,
}
```

### Checkpoint — PDA: `[b"checkpoint", id_le_u64]`

```rust
pub struct Checkpoint {
    pub id: u64,
    pub shipment_id: u64,
    pub actor: Pubkey,
    pub location: String,
    pub checkpoint_type: CheckpointType,
    // Pickup=0 HubIn=1 HubOut=2 Transit=3 DeliveryAttempt=4 Delivered=5 SensorData=6
    pub metadata: String,          // JSON max 256 chars
    pub temperature: i16,          // x10
    pub humidity: u8,
    pub timestamp: i64,
    pub bump: u8,
}
```

### Incident — PDA: `[b"incident", id_le_u64]`

```rust
pub struct Incident {
    pub id: u64,
    pub shipment_id: u64,
    pub incident_type: IncidentType,
    // Delay=0 Damage=1 Lost=2 TempViolation=3 Unauthorized=4
    pub reporter: Pubkey,
    pub description: String,       // max 256 chars
    pub timestamp: i64,
    pub resolved: bool,
    pub resolution_notes: String,  // max 256 chars — acciones tomadas
    pub bump: u8,
}
// SPACE: 8 + 8 + 8 + 1 + 32 + 260 + 8 + 1 + 260 + 1 = 587 bytes
```

---

## 6. Instrucciones del programa Rust/Anchor

### `initialize`
Inicializa `ProgramConfig`. Solo se ejecuta una vez.

### `register_actor`
Registra un actor. Solo la authority puede llamarlo.
Parametros: `actor_wallet`, `name`, `role`, `location`

### `create_shipment`
Crea un envio. El actor debe ser Sender activo.

**Separacion actor_wallet / sender_wallet**: `actor_wallet` es `AccountInfo` (solo se usa como seed del PDA del actor) y `sender_wallet` es `Signer` (firma y paga el rent). Esto resuelve el problema de claves efimeras de Backpack: la wallet de firma puede ser diferente a la registrada como actor.

```
Cuentas: config(mut) shipment(init) sender_actor(mut) actor_wallet(AccountInfo) sender_wallet(Signer) system_program
```

### `record_checkpoint`
Registra un checkpoint. Solo Carrier(1), Hub(2) y Recipient(3) pueden registrar.
- `Delivered` solo lo puede registrar el Recipient del envio.
- El envio no puede estar en estado terminal (Delivered/Returned/Cancelled).

**Separacion**: `actor_wallet: AccountInfo` (seed) + `signer_wallet: Signer` (paga)

### `report_incident`
Reporta una incidencia. Solo Carrier, Hub y Recipient pueden reportar.
- Inspector(4) no puede reportar — solo lectura.

**Separacion**: `reporter_actor_wallet: AccountInfo` (seed, address del reporter) + `signer_wallet: Signer`

### `resolve_incident`
Resuelve una incidencia con notas de acciones tomadas.
- **Constraint**: solo quien reporto puede resolver (`incident.reporter == resolver_wallet.key()`)
- Parametros: `incident_id`, `resolution_notes: String` (max 256 chars)

### `transfer_authority`
Transfiere la administracion del programa.

### `toggle_actor` / `update_actor`
Activan/desactivan o actualizan actores. Solo la authority.

---

## 7. Frontend Next.js

### Estructura de navegacion

```
Header
+-- Logo (icono_TFM2_solana.png)
+-- Nav: [Inicio] [Actores] [Envios]
+-- Badge ADMIN (si la wallet conectada es admin)
+-- Boton de cuenta Backpack

Paginas:
+-- / (index.tsx) — Dashboard principal
+-- /pdf          — Exportar PDF de cualquier envio
```

### Pagina de inicio (Home)

La pagina de inicio muestra:
- Logo e identidad del proyecto
- Grid de accesos directos: ACTORES | CREAR ENVIO | BUSCAR ENVIO | OPERACIONES | TRAZABILIDAD
- Buscador de envio por ID con validacion de existencia antes de redirigir
- Panel de estado del sistema con 5 indicadores en tiempo real
- Footer con informacion del TFM

Los indicadores del sistema no se muestran en las otras pestanas para evitar duplicacion.

### Indicadores del sistema

| Indicador | Descripcion |
|-----------|-------------|
| Actores | Total de actores registrados |
| Envios | Total de envios en cadena |
| En transito | Envios con estado InTransit/AtHub/OutForDelivery |
| Incidencias | Total de incidencias activas |
| Entregados | Envios con estado Delivered |

Los estados se infieren leyendo los checkpoints de cada envio al cargar. No dependen del campo `status` on-chain.

### Gestion del estado

```
index.tsx (siempre montado, usa display:none para pestanas)
+-- stats: { actors, shipments, inTransit, incidents, delivered }
+-- isAdmin: boolean
+-- searchShipmentId: number | null  (busqueda desde Home)
+-- openCreate: boolean              (abrir formulario desde Home)
+
+-- ShipmentsTab (display:none al cambiar pestana — NO se desmonta)
    +-- shipments: ShipmentData[]    (con openIncidentCount calculado)
    +-- inferredStatusMap: Map<id, status>
    +-- view: "list" | "detail" | "create"
```

### Inferencia de estado

El campo `status` on-chain siempre es `Created` (no se actualiza al registrar checkpoints para mantener bajo el costo de `record_checkpoint`). El estado real se infiere en el frontend:

```typescript
const cpTypeToStatus = {
  Pickup:          "InTransit",
  HubIn:           "AtHub",
  HubOut:          "InTransit",
  Transit:         "InTransit",
  DeliveryAttempt: "OutForDelivery",
  Delivered:       "Delivered",
};
```

Los estados se calculan al cargar la lista de envios, al visitar un detalle, y al hacer clic en el boton de actualizar (cooldown 30s).

### Badge de incidencias en la lista

El badge cambia segun el estado de las incidencias:
- **Rojo ⚠**: hay una o mas incidencias sin resolver (`openIncidentCount > 0`)
- **Verde ✓**: todas las incidencias estan resueltas (`openIncidentCount === 0`)
- **0**: no hay incidencias

### Ciclo cerrado de entrega

Cuando `inferredStatus === "Delivered"` (o Returned/Cancelled), los botones `+ Checkpoint` y `+ Incidencia` desaparecen del detalle del envio. Un envio entregado no puede recibir nuevos eventos.

### Transaccion manual para createShipment

Para garantizar que `actor_wallet` llegue correctamente al programa (resolviendo el problema de claves efimeras de Backpack), `createShipment` construye la transaccion manualmente:

```typescript
const disc = Buffer.from([67, 64, 17, 114, 30, 143, 249, 247]); // sha256("global:create_shipment")[0:8]

const ix = new TransactionInstruction({
  programId: PROGRAM_ID,
  keys: [
    { pubkey: configPda,      isSigner: false, isWritable: true  },
    { pubkey: shipmentPda,    isSigner: false, isWritable: true  },
    { pubkey: senderActorPda, isSigner: false, isWritable: true  },
    { pubkey: actorWalletPk,  isSigner: false, isWritable: false }, // address registrada
    { pubkey: publicKey,      isSigner: true,  isWritable: true  }, // firmante efimero
    { pubkey: SystemProgram,  isSigner: false, isWritable: false },
  ],
  data, // args serializados manualmente en Borsh
});
```

### Exportacion PDF (/pdf)

Pagina independiente que permite generar un PDF de trazabilidad de cualquier envio ingresando su ID. El documento incluye:
- Datos del envio (producto, ruta, remitente, destinatario, cadena de frio)
- Timeline completo de checkpoints
- Tabla de incidencias con estado y notas de resolucion
- Generado automaticamente en el browser con `window.print()`
- Tamano carta, margenes 1cm, fuente Arial 11px

---

## 8. Gestion de actores

### Roles y permisos

| Rol | Valor | Crear envio | Checkpoint | Incidencia | Entregar |
|-----|-------|-------------|------------|------------|---------|
| Sender | 0 | SI | NO | NO | NO |
| Carrier | 1 | NO | SI | SI | NO |
| Hub | 2 | NO | SI | SI | NO |
| Recipient | 3 | NO | SI | SI | SI (solo su envio) |
| Inspector | 4 | NO | NO | NO | NO |

### Actores registrados (localnet)

| Actor | Rol | Ultimas 4 | Ubicacion |
|-------|-----|-----------|-----------|
| SENDER 1 | Sender | 75yP | Bogota, D.C. |
| CARRIER 1 | Carrier | 85gv | Bogota, D.C. |
| HUB 1 | Hub | 98Fy | Bogota, D.C. |
| RECIPIENT 1 | Recipient | FetC | Cali, Valle del Cauca |
| SENDER 2 | Sender | mJXa | Bogota, D.C. |
| CARRIER 2 | Carrier | GD7 | Bogota, D.C. |
| HUB 2 | Hub | rgGc | Facatativa, Cundinamarca |
| RECIPIENT 2 | Recipient | sNc | Medellin, Antioquia |
| INSPECTOR 1 | Inspector | 5T9 | Bogota, D.C. |

---

## 9. Flujo operativo

### Ciclo de vida de un envio

```
[SENDER] Crea envio --> status: Created
    |
[CARRIER] Pickup --> InTransit
    |
[CARRIER/HUB] Transit / HubIn / HubOut --> InTransit / AtHub
    |
[CARRIER] DeliveryAttempt --> OutForDelivery
    |
[RECIPIENT] Delivered --> Delivered (CIERRE: no mas eventos)
```

### Restricciones de entrega

1. Solo el Recipient del envio puede registrar `Delivered`
2. No puede haber incidencias abiertas para entregar
3. Una vez ENTREGADO, el envio se cierra — no acepta checkpoints ni incidencias

### Resolucion de incidencias

- Solo quien reporto la incidencia puede resolverla (verificado on-chain y en frontend)
- Al resolver se registra on-chain `resolution_notes` con las acciones tomadas
- El frontend verifica el reporter leyendo la address del PDA del actor:

```typescript
const actorInfo = await connection.getAccountInfo(actorPda);
const actorAddress = new PublicKey(actorInfo.data.slice(8, 40)).toString();
if (actorAddress !== inc.reporter) { /* denegar */ }
```

---

## 10. Restricciones de roles y validaciones

### Validaciones on-chain (Rust/Anchor)

```rust
// Ejemplo: create_shipment
#[account(
    seeds = [b"actor", actor_wallet.key().as_ref()],
    constraint = sender_actor.is_active @ LogisticsError::ActorInactive,
    constraint = sender_actor.role == ActorRole::Sender @ LogisticsError::UnauthorizedActor
)]
pub sender_actor: Account<'info, Actor>,
pub actor_wallet: AccountInfo<'info>,     // seed — no necesita firmar
#[account(mut)]
pub sender_wallet: Signer<'info>,         // firma y paga
```

### Validaciones en frontend (pre-firma)

| Operacion | Validacion antes de firmar |
|-----------|---------------------------|
| Crear envio | Busca actor Sender activo; si no existe, rechaza |
| Abrir checkpoint | Verifica rol Carrier/Hub/Recipient |
| Registrar Delivered | Verifica publicKey == recipient del envio |
| Registrar Delivered | Lee incidencias on-chain; bloquea si hay abiertas |
| Abrir incidencia | Verifica rol Carrier/Hub/Recipient (no Sender ni Inspector) |
| Resolver incidencia | Lee address del PDA del actor y compara con inc.reporter |
| Cualquier op en envio ENTREGADO | Botones ocultos — no es posible |

---

## 11. IDL y compatibilidad Anchor 0.31

El IDL en `app/public/idl.json` se mantiene en formato compatible con Anchor 0.29/0.30 porque el cliente browser `@coral-xyz/anchor@0.31.0` falla con el formato nativo 0.31 (`size` error en `BorshAccountsCoder`).

Modificaciones manuales necesarias tras redespliegue:

```bash
# 1. Copiar IDL nuevo
cp target/idl/logistics_traceability.json app/public/idl.json

# 2. Ajustes de formato
python3 << 'EOF'
import json
idl = json.load(open('app/public/idl.json'))
idl['name'] = 'logistics_traceability'
idl['accounts'] = []  # evita error "size"
for ix in idl['instructions']:
    for a in ix.get('args', []):
        if a.get('type') == 'pubkey': a['type'] = 'publicKey'
json.dump(idl, open('app/public/idl.json', 'w'), indent=2)
EOF

# 3. Para create_shipment, record_checkpoint, report_incident:
#    añadir manualmente actor_wallet/signer_wallet en la lista de accounts
```

---

## 12. Requisitos e instalacion

### Requisitos

- Ubuntu 22.04+ / macOS 13+
- Rust 1.75+ (`rustup`)
- Node.js 20+, Yarn 1.22+
- Solana CLI 1.18.x
- Anchor CLI 0.31.1
- Backpack Wallet (extension Chrome/Brave)

### Instalacion

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.26/install)"

# Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.31.1 && avm use 0.31.1

# Dependencias del proyecto
cargo build
cd app && yarn install
```

---

## 13. Despliegue y configuracion

### Inicio del entorno

```bash
# Terminal 1 — Nodo Solana local
solana-test-validator --reset

# Terminal 2 — Compilar, desplegar e inicializar
cargo build-sbf --manifest-path programs/logistics_traceability/Cargo.toml
anchor deploy --provider.cluster localnet
npx ts-node scripts/init.ts

# Terminal 3 — Frontend
cd app && yarn dev
# Acceso: http://localhost:3000
```

### Cuando reiniciar el validator

Necesario con `--reset` cuando:
- Cambia el `SPACE` de algun struct (tamano de cuenta on-chain)
- Se quiere estado limpio para demostracion

No necesario cuando:
- Solo cambia la logica de instrucciones sin modificar structs

### Constantes del sistema

| Constante | Valor |
|-----------|-------|
| Program ID | `88jtu9fMGP9VMtSiXCvva4xy6W3i9CufnYFXMrvgKtRA` |
| Config PDA | `6Fdy3CnFFrRTpTNCDRhMVey5b9AhA6e1rDXhyWAgpzMy` |
| Admin Backpack | `6irouK8iDnxD22trbKddM3s1KhfHgF3CYHPPG8zy6tfp` |
| RPC URL | `http://localhost:8899` |
| Frontend | `http://localhost:3000` |
| Keypair programa | `target/deploy/logistics_traceability-keypair.json` (NO BORRAR) |

---

## 14. Scripts de inicializacion y demo

### `scripts/init.ts`

Inicializa el programa y registra los 9 actores con wallets de Backpack. Es idempotente — si los actores ya existen, los omite.

```bash
npx ts-node scripts/init.ts
```

Salida esperada:
```
Registrados: 9, omitidos: 0
Admin on-chain: 6irouK8...
Conecta Backpack en el frontend.
```

### `scripts/demo-data.ts`

Genera 10 envios de demostracion con checkpoints e incidencias cubriendo todos los estados posibles:

```bash
npx ts-node scripts/demo-data.ts
```

| Envio | Producto | Estado | CPK | INC |
|-------|---------|--------|-----|-----|
| #01 | Vacunas COVID-19 | ENTREGADO | 6 | 0 |
| #02 | Equipos medicos | EN TRANSITO | 2 | 1 abierta |
| #03 | Muestras laboratorio | EN HUB | 3 | 0 (sensor) |
| #04 | Tablets educativas | EN HUB | 2 | 1 abierta |
| #05 | Insulina refrigerada | ENTREGADO | 7 | 0 |
| #06 | Documentos legales | EN REPARTO | 4 | 0 |
| #07 | Repuestos industriales | EN TRANSITO | 1 | 0 |
| #08 | Obra de arte | ENTREGADO | 5 | 0 |
| #09 | Alimentos perecederos | EN TRANSITO | 2 | 2 abiertas |
| #10 | Carga mixta | EN TRANSITO | 4 | 1 abierta |

**Nota**: las resoluciones de incidencias deben hacerse desde el frontend para la demostracion, ya que el programa verifica que quien resuelve es quien reporto.

---

## 15. Variables y constantes clave

### Discriminadores de instrucciones

```
create_shipment:    [67, 64, 17, 114, 30, 143, 249, 247]
```

Los demas se calculan automaticamente por Anchor.

### Offsets Borsh para lectura directa

```
ProgramConfig:
  [0:8]   discriminador Anchor
  [8:40]  authority (Pubkey)
  [40:48] next_shipment_id (u64 LE)
  [48:56] next_checkpoint_id (u64 LE)
  [56:64] next_incident_id (u64 LE)

Actor:
  [8:40]  address (Pubkey)
  [40:44] name_len (u32 LE)
  [44:44+N] name (UTF-8)
  [44+N]  role (u8)

Incident:
  [25:57] reporter (Pubkey)
  [57:61] description_len (u32 LE)
  ...
  [?]     resolved (bool)
  [?]     resolution_notes_len + resolution_notes
```

### Tipos enumerados

```rust
ActorRole:      Sender=0, Carrier=1, Hub=2, Recipient=3, Inspector=4
ShipmentStatus: Created=0, InTransit=1, AtHub=2, OutForDelivery=3,
                Delivered=4, Returned=5, Cancelled=6
CheckpointType: Pickup=0, HubIn=1, HubOut=2, Transit=3,
                DeliveryAttempt=4, Delivered=5, SensorData=6
IncidentType:   Delay=0, Damage=1, Lost=2, TempViolation=3, Unauthorized=4
```

---

## 16. Limitaciones conocidas

### Claves efimeras de Backpack

Backpack genera claves de sesion derivadas para firmar. Esto causa:
- `shipments_created` y `checkpoints_recorded` en los actores no se actualizan — estas columnas se eliminaron de la tabla de actores.
- La verificacion de rol en checkpoints e incidencias funciona correctamente porque Backpack reutiliza la misma clave efimera en la sesion activa.

**Solucion implementada para createShipment**: transaccion manual que pasa `actor_wallet` (address registrada) como `AccountInfo` separado de `sender_wallet` (firmante efimero). El campo `shipment.sender` queda con la address correcta del actor.

**La misma separacion** se aplica a `record_checkpoint` y `report_incident`, permitiendo que los scripts de inicializacion y demostracion funcionen correctamente sin las claves privadas de Backpack.

### Estado del envio on-chain

El campo `status` del struct `Shipment` siempre es `Created` on-chain. El estado real se infiere en el frontend desde los checkpoints y se mantiene en `inferredStatusMap` durante la sesion. Al recargar la pagina, los estados se recalculan automaticamente al cargar la lista de envios.

### Compatibilidad IDL browser

El IDL debe mantenerse en formato 0.29/0.30 manualmente. Cada cambio en instrucciones requiere actualizar `app/public/idl.json` a mano.

---

## 17. Decisiones de diseno

### Por que Solana y no Ethereum

- **Throughput**: hasta 65,000 TPS vs ~15 TPS de Ethereum.
- **Costos**: fracciones de centavo por transaccion vs varios dolares en Ethereum mainnet.
- **Confirmacion**: ~400ms vs 12-15 segundos.
- **PDAs**: modelo de cuentas idoneo para entidades logisticas con seeds predecibles.

### Por que Anchor Framework

- Reduce el boilerplate en ~70%.
- Constraints declarativos para validaciones de acceso.
- Generacion automatica de IDL.
- Verificacion de discriminadores previene ataques de confusion.

### Por que estados inferidos en frontend

Actualizar `shipment.status` on-chain al registrar un checkpoint requeriria pasar el PDA del shipment como cuenta mutable en `record_checkpoint`, aumentando el costo de cada transaccion (~5000 lamports adicionales) y la complejidad del IDL. Para el volumen del TFM, la inferencia en frontend es mas eficiente.

### display:none vs desmontaje de componentes

`ShipmentsTab` no se desmonta al cambiar de pestana (usa `display:none`) para preservar:
- `inferredStatusMap` con los estados calculados
- El estado de carga (`initialized`)
- Los datos ya descargados de la blockchain

### Ciclo cerrado de entrega

Una vez que un envio alcanza el estado `Delivered`, `Returned` o `Cancelled`, los botones de operacion desaparecen del detalle. Esto es coherente con la inmutabilidad de la blockchain: un evento de entrega es definitivo.

---

## Licencia

Trabajo de Fin de Master (TFM) — uso academico.

---

*LogiChain — Trazabilidad Logistica en Blockchain Solana · Rust/Anchor · Next.js · TypeScript*
