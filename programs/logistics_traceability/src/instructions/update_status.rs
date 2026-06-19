// ============================================================
// programs/logistics_traceability/src/instructions/update_status.rs
// ============================================================
// Permite actualizar manualmente el estado de un envío.
// Solo carriers y hubs pueden cambiar el estado.
// ============================================================

use anchor_lang::prelude::*;
use crate::state::{Actor, ActorRole, Shipment, ShipmentStatus};
use crate::error::LogisticsError;
use crate::events::ShipmentStatusChanged;

#[derive(Accounts)]
#[instruction(shipment_id: u64)]
pub struct UpdateShipmentStatus<'info> {
    #[account(
        mut,
        seeds = [b"shipment", shipment_id.to_le_bytes().as_ref()],
        bump = shipment.bump,
        constraint = shipment.status != ShipmentStatus::Delivered 
            && shipment.status != ShipmentStatus::Cancelled
            @ LogisticsError::ShipmentAlreadyClosed
    )]
    pub shipment: Account<'info, Shipment>,

    #[account(
        seeds = [b"actor", actor_wallet.key().as_ref()],
        bump = actor.bump,
        constraint = actor.is_active @ LogisticsError::ActorInactive,
        // Solo Carriers y Hubs pueden cambiar el estado
        constraint = actor.role == ActorRole::Carrier || actor.role == ActorRole::Hub
            @ LogisticsError::UnauthorizedActor
    )]
    pub actor: Account<'info, Actor>,

    pub actor_wallet: Signer<'info>,
}

pub fn update_shipment_status(
    ctx: Context<UpdateShipmentStatus>,
    shipment_id: u64,
    new_status: ShipmentStatus,
) -> Result<()> {
    let shipment = &mut ctx.accounts.shipment;
    let clock = Clock::get()?;

    shipment.status = new_status.clone();

    emit!(ShipmentStatusChanged {
        shipment_id,
        new_status: format!("{:?}", new_status),
        actor: ctx.accounts.actor.address,
        timestamp: clock.unix_timestamp,
    });

    msg!("🔄 Estado del envío #{} actualizado a {:?}", shipment_id, new_status);
    Ok(())
}
