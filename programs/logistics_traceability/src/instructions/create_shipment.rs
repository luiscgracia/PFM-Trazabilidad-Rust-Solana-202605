// ============================================================
// programs/logistics_traceability/src/instructions/create_shipment.rs
// ============================================================
// Crea un nuevo envío en el sistema. Solo actores con rol
// Sender pueden crear envíos.
//
// PATRÓN PDA CON ID NUMÉRICO:
//   seeds = [b"shipment", shipment_id.to_le_bytes()]
//
//   A diferencia del Actor (1 por wallet), los envíos necesitan
//   múltiples por remitente. Usamos un ID numérico como seed.
//
//   Le_bytes() = Little Endian bytes (formato estándar en Solana)
//   Ejemplo: ID 42 → bytes [42, 0, 0, 0, 0, 0, 0, 0]
//
// FLUJO:
//   1. Verificar que el remitente existe y es Sender
//   2. Obtener el siguiente ID del config
//   3. Crear la cuenta Shipment con ese ID
//   4. Incrementar el contador global
//   5. Emitir evento ShipmentCreated
// ============================================================

use anchor_lang::prelude::*;
use crate::state::{Actor, ActorRole, ProgramConfig, Shipment, ShipmentStatus};
use crate::error::LogisticsError;
use crate::events::ShipmentCreated;

#[derive(Accounts)]
#[instruction(shipment_id: u64)]  // Anchor necesita esto para usar el parámetro en seeds
pub struct CreateShipment<'info> {
    /// Configuración global. Necesitamos actualizarla (mut) para
    /// incrementar los contadores.
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,

    /// El nuevo envío que se va a crear
    #[account(
        init,
        // El ID del envío es parte del seed para garantizar unicidad
        seeds = [b"shipment", shipment_id.to_le_bytes().as_ref()],
        bump,
        payer = sender_wallet,
        space = Shipment::SPACE
    )]
    pub shipment: Account<'info, Shipment>,

    /// La cuenta Actor del remitente (ya debe existir)
    /// 
    /// Constraint: Verificamos que el actor esté activo y sea Sender
    /// Esta es una de las partes más importantes de Anchor:
    /// las validaciones en constraints evitan llamadas inválidas.
    #[account(
        seeds = [b"actor", actor_wallet.key().as_ref()],
        bump = sender_actor.bump,
        constraint = sender_actor.is_active @ LogisticsError::ActorInactive,
        constraint = sender_actor.role == ActorRole::Sender @ LogisticsError::UnauthorizedActor
    )]
    pub sender_actor: Account<'info, Actor>,
    /// CHECK: Solo se usa como seed para el PDA del actor.
    pub actor_wallet: AccountInfo<'info>,

    /// La wallet del remitente. Debe firmar y pagar el rent.
    #[account(mut)]
    pub sender_wallet: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_shipment(
    ctx: Context<CreateShipment>,
    shipment_id: u64,
    recipient: Pubkey,
    product: String,
    origin: String,
    destination: String,
    requires_cold_chain: bool,
    max_temperature: i16,  // Celsius * 10. Ej: 45 = 4.5°C
) -> Result<()> {
    // ====== VALIDACIONES ======
    require!(
        !product.is_empty() && product.len() <= 64,
        LogisticsError::InvalidProduct
    );
    require!(
        !origin.is_empty() && origin.len() <= 128,
        LogisticsError::InvalidLocation
    );
    require!(
        !destination.is_empty() && destination.len() <= 128,
        LogisticsError::InvalidLocation
    );

    // Verificar que el ID coincide con el contador del config
    // Esto previene que alguien cree envíos con IDs arbitrarios
    let config = &mut ctx.accounts.config;
    require_eq!(
        shipment_id,
        config.next_shipment_id,
        LogisticsError::ShipmentNotFound
    );

    // ====== ESCRIBIR DATOS DEL ENVÍO ======
    let shipment = &mut ctx.accounts.shipment;
    let clock = Clock::get()?;

    shipment.id = shipment_id;
    shipment.sender = ctx.accounts.actor_wallet.key();
    shipment.recipient = recipient;
    shipment.product = product.clone();
    shipment.origin = origin.clone();
    shipment.destination = destination.clone();
    shipment.date_created = clock.unix_timestamp;
    shipment.date_delivered = 0; // 0 significa "no entregado aún"
    shipment.status = ShipmentStatus::Created;
    shipment.checkpoint_count = 0;
    shipment.incident_count = 0;
    shipment.requires_cold_chain = requires_cold_chain;
    shipment.max_temperature = if requires_cold_chain { max_temperature } else { i16::MAX };
    shipment.bump = ctx.bumps.shipment;

    // ====== ACTUALIZAR CONTADORES GLOBALES ======
    config.next_shipment_id += 1;
    config.total_shipments += 1;

    // Actualizar estadísticas del actor
    let sender_actor = &mut ctx.accounts.sender_actor;
    sender_actor.shipments_created += 1;

    // ====== EMITIR EVENTO ======
    emit!(ShipmentCreated {
        shipment_id,
        sender: shipment.sender,
        recipient: shipment.recipient,
        product: product.clone(),
        origin: origin.clone(),
        destination: destination.clone(),
        requires_cold_chain,
        timestamp: clock.unix_timestamp,
    });

    msg!("📦 Envío #{} creado: {} → {}", shipment_id, origin, destination);

    Ok(())
}
