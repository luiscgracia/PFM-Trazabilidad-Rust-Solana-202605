// ============================================================
// programs/logistics_traceability/src/events.rs
// ============================================================
// Los eventos en Anchor/Solana son datos emitidos durante la
// ejecución de una transacción que quedan grabados en los
// LOGS de la transacción (no en accounts).
//
// Son fundamentales para:
//   1. Indexar datos off-chain eficientemente
//   2. Notificaciones en tiempo real con WebSocket
//   3. Estadísticas y analytics
//   4. El frontend puede suscribirse con onLogs()
//
// Los eventos se leen así en el cliente:
//   program.addEventListener('ShipmentCreated', (event) => {
//     console.log(event.shipmentId, event.product);
//   });
//
// NOTA: Los eventos NO se pueden leer desde el programa,
// solo desde fuera (cliente). Son "escritura solamente".
// ============================================================

use anchor_lang::prelude::*;

/// Emitido cuando se crea un nuevo envío
#[event]
pub struct ShipmentCreated {
    pub shipment_id: u64,
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub product: String,
    pub origin: String,
    pub destination: String,
    pub requires_cold_chain: bool,
    pub timestamp: i64,
}

/// Emitido cuando se registra un nuevo checkpoint
#[event]
pub struct CheckpointRecorded {
    pub checkpoint_id: u64,
    pub shipment_id: u64,
    pub location: String,
    /// Usamos String para el tipo para facilitar lectura en frontend
    pub checkpoint_type: String,
    pub actor: Pubkey,
    /// Temperatura / 10.0 para mostrar decimales en el evento
    pub temperature: i16,
    pub humidity: u8,
    pub timestamp: i64,
}

/// Emitido cuando cambia el estado de un envío
#[event]
pub struct ShipmentStatusChanged {
    pub shipment_id: u64,
    pub new_status: String,
    pub actor: Pubkey,
    pub timestamp: i64,
}

/// Emitido cuando el destinatario confirma la entrega
#[event]
pub struct DeliveryConfirmed {
    pub shipment_id: u64,
    pub recipient: Pubkey,
    pub timestamp: i64,
}

/// Emitido cuando se reporta una incidencia
#[event]
pub struct IncidentReported {
    pub incident_id: u64,
    pub shipment_id: u64,
    pub incident_type: String,
    pub reporter: Pubkey,
    pub description: String,
    pub timestamp: i64,
}

/// Emitido cuando se resuelve una incidencia
#[event]
pub struct IncidentResolved {
    pub incident_id: u64,
    pub shipment_id: u64,
    pub resolved_by: Pubkey,
    pub timestamp: i64,
}

/// Emitido automáticamente cuando se detecta violación de temperatura
/// Esto es clave para sistemas de alertas automatizadas
#[event]
pub struct TempViolationDetected {
    pub shipment_id: u64,
    pub checkpoint_id: u64,
    /// Temperatura registrada (real * 10)
    pub temperature: i16,
    /// Temperatura máxima permitida (real * 10)
    pub max_allowed: i16,
    pub location: String,
    pub actor: Pubkey,
    pub timestamp: i64,
}

/// Emitido cuando se cancela un envío
#[event]
pub struct ShipmentCancelled {
    pub shipment_id: u64,
    pub cancelled_by: Pubkey,
    pub timestamp: i64,
}

/// Emitido cuando un actor se registra en el sistema
#[event]
pub struct ActorRegistered {
    pub address: Pubkey,
    pub name: String,
    pub role: String,
    pub location: String,
    pub timestamp: i64,
}

/// Emitido cuando se cambia el estado de un actor
#[event]
pub struct ActorStatusChanged {
    pub address: Pubkey,
    pub is_active: bool,
    pub changed_by: Pubkey,
    pub timestamp: i64,
}

/// Emitido cuando se transfiere la autoridad del programa
#[event]
pub struct AuthorityTransferred {
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
    pub timestamp: i64,
}
