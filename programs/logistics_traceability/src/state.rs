// ============================================================
// programs/logistics_traceability/src/state.rs
// ============================================================
// Este archivo define la ESTRUCTURA DE DATOS que se almacena
// en la blockchain de Solana.
//
// En Solana, los datos se guardan en "Accounts" (cuentas).
// Cada account es una entrada en el estado global de Solana
// con:
//   - Una dirección (Pubkey de 32 bytes)
//   - Lamports (balance en SOL)
//   - Data (bytes serializados con Borsh)
//   - Owner (el programa que controla esa cuenta)
//
// Anchor simplifica todo esto con el macro #[account] que:
//   1. Serializa/deserializa automáticamente (Borsh)
//   2. Verifica el owner del programa
//   3. Añade un discriminador de 8 bytes al inicio
// ============================================================

use anchor_lang::prelude::*;

// ============================================================
// ENUMS
// Rust usa enums para representar estados discretos.
// AnchorSerialize + AnchorDeserialize permite guardarlos on-chain.
// PartialEq + Eq permite comparar enums con ==
// Clone permite copiar el valor
// ============================================================

/// Estado actual de un envío a lo largo de su ciclo de vida
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum ShipmentStatus {
    Created,         // Envío creado, pendiente de recogida
    InTransit,       // En movimiento entre ubicaciones
    AtHub,           // Estacionado en un hub logístico
    OutForDelivery,  // Última milla, en ruta al destinatario
    Delivered,       // Entregado y confirmado
    Returned,        // Devuelto al remitente
    Cancelled,       // Cancelado antes de la entrega
}

/// Rol de cada actor participante en la cadena logística
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum ActorRole {
    Sender,    // Remitente: crea envíos
    Carrier,   // Transportista: mueve paquetes entre puntos
    Hub,       // Hub logístico: recibe y redistribuye
    Recipient, // Destinatario: confirma la entrega final
    Inspector, // Inspector: solo lectura, auditoría
}

/// Tipo de evento registrado en un checkpoint
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum CheckpointType {
    Pickup,          // Recogida en el origen
    HubIn,           // Llegada a hub intermedio
    HubOut,          // Salida de hub intermedio
    Transit,         // En tránsito entre puntos
    DeliveryAttempt, // Intento de entrega (no exitoso)
    Delivered,       // Entrega exitosa confirmada
    SensorData,      // Lectura de sensor IoT
}

/// Tipo de incidencia que puede ocurrir durante el transporte
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum IncidentType {
    Delay,         // Retraso significativo
    Damage,        // Daño físico detectado
    Lost,          // Envío extraviado
    TempViolation, // Temperatura fuera del rango permitido
    Unauthorized,  // Apertura no autorizada del contenedor
}

// ============================================================
// ACCOUNTS (Cuentas on-chain)
//
// El macro #[account] hace varias cosas automáticamente:
//   1. Añade 8 bytes de discriminador al inicio (para identificar
//      el tipo de cuenta y prevenir confusiones)
//   2. Implementa AnchorSerialize/AnchorDeserialize
//   3. Verifica que el owner es el programa correcto
//
// IMPORTANTE sobre el tamaño (space):
//   Cada account en Solana debe reservar espacio al crearse.
//   El espacio NO puede crecer después (sin migrate).
//   Cálculo: 8 (discriminator) + suma de todos los campos
//
// Pubkey = 32 bytes
// u64 = 8 bytes
// u32 = 4 bytes
// u8 = 1 byte
// i64 = 8 bytes
// i16 = 2 bytes
// bool = 1 byte
// String = 4 bytes (len) + N bytes (contenido)
// ============================================================

/// Configuración global del programa
/// Solo existe UNA instancia de esta cuenta (PDA del programa)
#[account]
pub struct ProgramConfig {
    /// Wallet del administrador que puede cambiar configuraciones
    pub authority: Pubkey,         // 32 bytes
    /// Contador para generar IDs únicos de envíos
    pub next_shipment_id: u64,     // 8 bytes
    /// Contador para generar IDs únicos de checkpoints
    pub next_checkpoint_id: u64,   // 8 bytes
    /// Contador para generar IDs únicos de incidencias
    pub next_incident_id: u64,     // 8 bytes
    /// Estadísticas globales del sistema
    pub total_shipments: u64,      // 8 bytes
    pub total_checkpoints: u64,    // 8 bytes
    pub total_incidents: u64,      // 8 bytes
    /// Bump seed del PDA (guardado para verificaciones futuras)
    pub bump: u8,                  // 1 byte
}

impl ProgramConfig {
    // 8 discriminator + 32 + 8*6 + 1
    pub const SPACE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1;
}

/// Representa a un participante registrado en el sistema
/// Cada wallet tiene máximo UN Actor account
#[account]
pub struct Actor {
    /// Dirección pública de la wallet del actor
    pub address: Pubkey,              // 32 bytes
    /// Nombre o empresa del actor (máx 128 chars)
    pub name: String,                 // 4 + 128 bytes
    /// Rol asignado al actor
    pub role: ActorRole,              // 1 byte (enum)
    /// Ubicación física o código de hub (máx 256 chars)
    pub location: String,             // 4 + 256 bytes
    /// Si está activo o fue suspendido
    pub is_active: bool,              // 1 byte
    /// Timestamp Unix de cuando se registró
    pub created_at: i64,              // 8 bytes
    /// Contadores para estadísticas del actor
    pub shipments_created: u32,       // 4 bytes
    pub checkpoints_recorded: u32,    // 4 bytes
    /// Bump seed del PDA
    pub bump: u8,                     // 1 byte
}

impl Actor {
    // 8 + 32 + (4+128) + 1 + (4+256) + 1 + 8 + 4 + 4 + 1
    pub const SPACE: usize = 8 + 32 + 132 + 1 + 260 + 1 + 8 + 4 + 4 + 1;
}

/// Representa un envío (paquete, contenedor, etc.)
/// Es la entidad central del sistema de trazabilidad
#[account]
pub struct Shipment {
    /// ID numérico único (generado por ProgramConfig)
    pub id: u64,                      // 8 bytes
    /// Wallet del remitente que creó el envío
    pub sender: Pubkey,               // 32 bytes
    /// Wallet del destinatario final
    pub recipient: Pubkey,            // 32 bytes
    /// Descripción del producto (máx 64 chars)
    pub product: String,              // 4 + 64 bytes
    /// Ciudad/dirección de origen (máx 128 chars)
    pub origin: String,               // 4 + 128 bytes
    /// Ciudad/dirección destino (máx 128 chars)
    pub destination: String,          // 4 + 128 bytes
    /// Timestamp de creación
    pub date_created: i64,            // 8 bytes
    /// Timestamp de entrega (0 si no entregado aún)
    pub date_delivered: i64,          // 8 bytes
    /// Estado actual del envío
    pub status: ShipmentStatus,       // 1 byte (enum)
    /// Número de checkpoints registrados
    pub checkpoint_count: u32,        // 4 bytes
    /// Número de incidencias reportadas
    pub incident_count: u32,          // 4 bytes
    /// Si requiere control de temperatura (cadena de frío)
    pub requires_cold_chain: bool,    // 1 byte
    /// Temperatura máxima permitida (Celsius * 10)
    /// Ejemplo: 45 = 4.5°C. Usamos i16 para decimales sin floats.
    pub max_temperature: i16,         // 2 bytes
    /// Bump seed del PDA
    pub bump: u8,                     // 1 byte
}

impl Shipment {
    // 8 + 8 + 32 + 32 + (4+64) + (4+128) + (4+128) + 8 + 8 + 1 + 4 + 4 + 1 + 2 + 1
    pub const SPACE: usize = 8 + 8 + 32 + 32 + 68 + 132 + 132 + 8 + 8 + 1 + 4 + 4 + 1 + 2 + 1;
}

/// Registra un evento puntual en el ciclo de vida del envío
/// Cada checkpoint es inmutable una vez creado
#[account]
pub struct Checkpoint {
    /// ID único del checkpoint
    pub id: u64,                      // 8 bytes
    /// ID del envío al que pertenece
    pub shipment_id: u64,             // 8 bytes
    /// Wallet del actor que registró este checkpoint
    pub actor: Pubkey,                // 32 bytes
    /// Ubicación física donde ocurrió el evento (máx 256 chars)
    pub location: String,             // 4 + 256 bytes
    /// Tipo de evento
    pub checkpoint_type: CheckpointType, // 1 byte
    /// Timestamp del evento (del reloj on-chain de Solana)
    pub timestamp: i64,               // 8 bytes
    /// Datos adicionales en formato JSON (máx 512 chars)
    /// Ejemplo: {"operator": "hub_01", "notes": "Good condition"}
    pub metadata: String,             // 4 + 512 bytes
    /// Temperatura en Celsius * 10 (permite un decimal)
    /// Ejemplo: 42 = 4.2°C, -50 = -5.0°C
    /// i16: rango -3276.8 a 3276.7, suficiente para temperatura
    pub temperature: i16,             // 2 bytes
    /// Humedad relativa en porcentaje (0-100)
    pub humidity: u8,                 // 1 byte
    /// Bump seed del PDA
    pub bump: u8,                     // 1 byte
}

impl Checkpoint {
    // 8 + 8 + 8 + 32 + (4+256) + 1 + 8 + (4+512) + 2 + 1 + 1
    pub const SPACE: usize = 8 + 8 + 8 + 32 + 260 + 1 + 8 + 516 + 2 + 1 + 1;
}

/// Registra una incidencia o problema detectado en el envío
#[account]
pub struct Incident {
    /// ID único de la incidencia
    pub id: u64,                      // 8 bytes
    /// ID del envío afectado
    pub shipment_id: u64,             // 8 bytes
    /// Tipo de incidencia
    pub incident_type: IncidentType,  // 1 byte
    /// Wallet del actor que reportó la incidencia
    pub reporter: Pubkey,             // 32 bytes
    /// Descripción detallada (máx 256 chars)
    pub description: String,          // 4 + 256 bytes
    /// Timestamp del reporte
    pub timestamp: i64,               // 8 bytes
    /// Si la incidencia fue resuelta
    pub resolved: bool,               // 1 byte
    /// Notas de resolución (máx 256 chars)
    pub resolution_notes: String,     // 4 + 256 bytes
    /// Bump seed del PDA
    pub bump: u8,                     // 1 byte
}

impl Incident {
    // 8 + 8 + 8 + 1 + 32 + (4+256) + 8 + 1 + (4+256) + 1
    pub const SPACE: usize = 8 + 8 + 8 + 1 + 32 + 260 + 8 + 1 + 260 + 1;
}
