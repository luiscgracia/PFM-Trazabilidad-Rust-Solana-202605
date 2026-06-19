// ============================================================
// programs/logistics_traceability/src/instructions/record_checkpoint.rs
// ============================================================
// Registra un evento (checkpoint) en el ciclo de vida del envío.
// Esta es la instrucción más usada del sistema - cada evento
// logístico llama a esta instrucción.
//
// PERMISOS:
//   - Carriers: pueden registrar cualquier checkpoint
//   - Hubs: pueden registrar cualquier checkpoint  
//   - Recipients: solo pueden registrar Delivered
//   - Senders: NO pueden registrar checkpoints
//   - Inspectors: NO pueden registrar checkpoints
//
// DETECCIÓN DE VIOLACIÓN DE TEMPERATURA:
//   Si el envío requiere cadena de frío (requires_cold_chain = true)
//   y la temperatura registrada supera max_temperature, el programa:
//   1. Registra el checkpoint normalmente
//   2. Emite un evento TempViolationDetected adicional
//   3. El frontend puede mostrar alertas en tiempo real
//
// SEEDS DEL CHECKPOINT:
//   [b"checkpoint", checkpoint_id.to_le_bytes()]
//   Similar a los envíos, se usa un ID numérico global único.
// ============================================================

use anchor_lang::prelude::*;
use crate::state::{Actor, ActorRole, Checkpoint, CheckpointType, ProgramConfig, Shipment, ShipmentStatus};
use crate::error::LogisticsError;
use crate::events::{CheckpointRecorded, TempViolationDetected};

#[derive(Accounts)]
#[instruction(shipment_id: u64, checkpoint_id: u64)]
pub struct RecordCheckpoint<'info> {
    /// Config global para obtener y actualizar el siguiente checkpoint_id
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,

    /// El envío al que pertenece este checkpoint.
    /// mut porque incrementamos checkpoint_count
    #[account(
        mut,
        seeds = [b"shipment", shipment_id.to_le_bytes().as_ref()],
        bump = shipment.bump,
        // El envío no puede estar en estado terminal
        constraint = shipment.status != ShipmentStatus::Delivered 
            && shipment.status != ShipmentStatus::Cancelled 
            && shipment.status != ShipmentStatus::Returned
            @ LogisticsError::ShipmentAlreadyClosed
    )]
    pub shipment: Account<'info, Shipment>,

    /// El nuevo checkpoint que se crea
    #[account(
        init,
        seeds = [b"checkpoint", checkpoint_id.to_le_bytes().as_ref()],
        bump,
        payer = signer_wallet,
        space = Checkpoint::SPACE
    )]
    pub checkpoint: Account<'info, Checkpoint>,

    /// La cuenta Actor del que registra el checkpoint
    #[account(
        seeds = [b"actor", actor_wallet.key().as_ref()],
        bump = actor.bump,
        constraint = actor.is_active @ LogisticsError::ActorInactive
    )]
    pub actor: Account<'info, Actor>,

    /// CHECK: Solo se usa como seed para el PDA del actor.
    pub actor_wallet: AccountInfo<'info>,
    /// Wallet que firma y paga el rent.
    #[account(mut)]
    pub signer_wallet: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn record_checkpoint(
    ctx: Context<RecordCheckpoint>,
    shipment_id: u64,
    checkpoint_id: u64,
    location: String,
    checkpoint_type: CheckpointType,
    metadata: String,
    temperature: i16,  // Celsius * 10
    humidity: u8,
) -> Result<()> {
    // ====== VALIDACIONES ======
    require!(
        !location.is_empty() && location.len() <= 256,
        LogisticsError::InvalidLocation
    );
    require!(
        humidity <= 100,
        LogisticsError::InvalidHumidity
    );

    // Verificar que el ID de checkpoint es el correcto
    let config = &mut ctx.accounts.config;
    require_eq!(
        checkpoint_id,
        config.next_checkpoint_id,
        LogisticsError::CheckpointShipmentMismatch
    );

    // ====== VERIFICAR PERMISOS DEL ACTOR ======
    let actor = &ctx.accounts.actor;
    let shipment = &ctx.accounts.shipment;

    let can_record = match actor.role {
        ActorRole::Carrier | ActorRole::Hub => true,
        ActorRole::Recipient => {
            // El destinatario solo puede registrar "Delivered"
            // Y solo para envíos donde es el recipient
            actor.address == shipment.recipient 
                && checkpoint_type == CheckpointType::Delivered
        }
        ActorRole::Sender | ActorRole::Inspector => false,
    };

    require!(can_record, LogisticsError::CannotRecordCheckpoint);

    // ====== DETECTAR VIOLACIÓN DE TEMPERATURA ======
    let clock = Clock::get()?;
    let temp_violation = shipment.requires_cold_chain 
        && temperature > shipment.max_temperature;

    if temp_violation {
        // Emitimos alerta de violación ANTES del checkpoint
        // para que el cliente la reciba primero
        emit!(TempViolationDetected {
            shipment_id,
            checkpoint_id,
            temperature,
            max_allowed: shipment.max_temperature,
            location: location.clone(),
            actor: actor.address,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "⚠️ VIOLACIÓN DE TEMPERATURA en envío #{}: {}°C (máx: {}°C)",
            shipment_id,
            temperature as f64 / 10.0,
            shipment.max_temperature as f64 / 10.0
        );
    }

    // ====== ESCRIBIR EL CHECKPOINT ======
    let checkpoint = &mut ctx.accounts.checkpoint;
    checkpoint.id = checkpoint_id;
    checkpoint.shipment_id = shipment_id;
    checkpoint.actor = actor.address;
    checkpoint.location = location.clone();
    checkpoint.checkpoint_type = checkpoint_type.clone();
    checkpoint.timestamp = clock.unix_timestamp;
    checkpoint.metadata = metadata;
    checkpoint.temperature = temperature;
    checkpoint.humidity = humidity;
    checkpoint.bump = ctx.bumps.checkpoint;

    // ====== ACTUALIZAR CONTADORES ======
    let shipment = &mut ctx.accounts.shipment;
    shipment.checkpoint_count += 1;

    // Si el tipo es Delivered, actualizar el estado del envío
    if checkpoint_type == CheckpointType::Delivered {
        shipment.status = ShipmentStatus::Delivered;
        shipment.date_delivered = clock.unix_timestamp;
    }

    config.next_checkpoint_id += 1;
    config.total_checkpoints += 1;

    let actor = &mut ctx.accounts.actor;
    actor.checkpoints_recorded += 1;

    // ====== EMITIR EVENTO ======
    emit!(CheckpointRecorded {
        checkpoint_id,
        shipment_id,
        location: location.clone(),
        checkpoint_type: format!("{:?}", checkpoint.checkpoint_type),
        actor: actor.address,
        temperature,
        humidity,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "📍 Checkpoint #{} registrado en envío #{}: {:?} @ {}",
        checkpoint_id, shipment_id, checkpoint.checkpoint_type, location
    );

    Ok(())
}
