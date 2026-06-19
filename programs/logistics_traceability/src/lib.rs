// ============================================================
// programs/logistics_traceability/src/lib.rs
// ============================================================
// Este es el PUNTO DE ENTRADA del programa Solana.
// 
// El macro #[program] genera el "entrypoint" de Solana, que
// es la función que el runtime de Solana llama cuando alguien
// envía una transacción a este programa.
//
// Anchor usa el nombre de la función (en snake_case) y lo
// mapea al discriminador de 8 bytes que identifica qué
// instrucción ejecutar.
//
// El ID del programa (declare_id!) debe coincidir con el que
// aparece en Anchor.toml. Anchor actualiza ambos al hacer:
//   anchor build
//   anchor deploy
// ============================================================

use anchor_lang::prelude::*;

// Declaramos los módulos del programa
pub mod state;
pub mod error;
pub mod events;
pub mod instructions;

// Re-exportamos los tipos necesarios
use instructions::*;
use state::*;

// El ID real generado por tu keypair local (actualizado por anchor keys sync)
declare_id!("88jtu9fMGP9VMtSiXCvva4xy6W3i9CufnYFXMrvgKtRA");

/// El módulo #[program] contiene todas las instrucciones públicas
/// que los clientes pueden invocar.
///
/// Anchor genera automáticamente:
///   1. El discriminador de instrucción (hash del nombre)
///   2. La deserialización de parámetros
///   3. La validación de cuentas (desde las structs Accounts)
///   4. El manejo de errores
#[program]
pub mod logistics_traceability {
    use super::*;

    /// Inicializa el sistema. Solo se llama UNA VEZ.
    /// Crea la cuenta de configuración global del programa.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::initialize(ctx)
    }

    /// Registra un nuevo actor. Solo el authority (admin) puede llamar esto.
    /// actor_wallet: la Pubkey de la wallet del actor a registrar.
    pub fn register_actor(
        ctx: Context<RegisterActor>,
        actor_wallet: Pubkey,
        name: String,
        role: ActorRole,
        location: String,
    ) -> Result<()> {
        instructions::register_actor::register_actor(ctx, actor_wallet, name, role, location)
    }

    /// Transfiere la administración del programa a una nueva wallet.
    /// IRREVERSIBLE si se pierde acceso a la nueva wallet.
    pub fn transfer_authority(
        ctx: Context<TransferAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        instructions::transfer_authority::transfer_authority(ctx, new_authority)
    }

    /// Desactiva o reactiva un actor. Solo el authority puede llamar esto.
    pub fn update_actor_status(
        ctx: Context<UpdateActorStatus>,
        actor_wallet: Pubkey,
        is_active: bool,
    ) -> Result<()> {
        instructions::update_actor_status::update_actor_status(ctx, actor_wallet, is_active)
    }

    /// Crea un nuevo envío. Solo Senders pueden hacerlo.
    pub fn create_shipment(
        ctx: Context<CreateShipment>,
        shipment_id: u64,
        recipient: Pubkey,
        product: String,
        origin: String,
        destination: String,
        requires_cold_chain: bool,
        max_temperature: i16,
    ) -> Result<()> {
        instructions::create_shipment::create_shipment(
            ctx, shipment_id, recipient, product, origin, destination,
            requires_cold_chain, max_temperature
        )
    }

    /// Registra un checkpoint (evento logístico) en un envío.
    /// La instrucción más frecuente del sistema.
    pub fn record_checkpoint(
        ctx: Context<RecordCheckpoint>,
        shipment_id: u64,
        checkpoint_id: u64,
        location: String,
        checkpoint_type: CheckpointType,
        metadata: String,
        temperature: i16,
        humidity: u8,
    ) -> Result<()> {
        instructions::record_checkpoint::record_checkpoint(
            ctx, shipment_id, checkpoint_id, location, checkpoint_type,
            metadata, temperature, humidity
        )
    }

    /// Actualiza manualmente el estado de un envío.
    pub fn update_shipment_status(
        ctx: Context<UpdateShipmentStatus>,
        shipment_id: u64,
        new_status: ShipmentStatus,
    ) -> Result<()> {
        instructions::update_status::update_shipment_status(ctx, shipment_id, new_status)
    }

    /// El destinatario confirma la recepción del envío.
    pub fn confirm_delivery(
        ctx: Context<ConfirmDelivery>,
        shipment_id: u64,
    ) -> Result<()> {
        instructions::confirm_delivery::confirm_delivery(ctx, shipment_id)
    }

    /// Reporta una incidencia en un envío activo.
    pub fn report_incident(
        ctx: Context<ReportIncident>,
        shipment_id: u64,
        incident_id: u64,
        incident_type: IncidentType,
        description: String,
    ) -> Result<()> {
        instructions::report_incident::report_incident(
            ctx, shipment_id, incident_id, incident_type, description
        )
    }

    /// Marca una incidencia como resuelta.
    pub fn resolve_incident(
        ctx: Context<ResolveIncident>,
        incident_id: u64,
        resolution_notes: String,
    ) -> Result<()> {
        instructions::resolve_incident::resolve_incident(ctx, incident_id, resolution_notes)
    }

    /// Cancela un envío en estado Created.
    pub fn cancel_shipment(
        ctx: Context<CancelShipment>,
        shipment_id: u64,
    ) -> Result<()> {
        instructions::cancel_shipment::cancel_shipment(ctx, shipment_id)
    }
}
