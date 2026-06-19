// ============================================================
// programs/logistics_traceability/src/instructions/cancel_shipment.rs
// ============================================================
// Cancela un envío. Solo el remitente puede cancelar, y solo
// si el envío está en estado Created (no ha salido aún).
// ============================================================

use anchor_lang::prelude::*;
use crate::state::{Actor, ActorRole, Shipment, ShipmentStatus};
use crate::error::LogisticsError;
use crate::events::ShipmentCancelled;

#[derive(Accounts)]
#[instruction(shipment_id: u64)]
pub struct CancelShipment<'info> {
    #[account(
        mut,
        seeds = [b"shipment", shipment_id.to_le_bytes().as_ref()],
        bump = shipment.bump,
        // Solo si el envío fue recién creado puede cancelarse
        constraint = shipment.status == ShipmentStatus::Created
            @ LogisticsError::CannotCancel,
        // Solo el sender original puede cancelar
        constraint = shipment.sender == sender_wallet.key()
            @ LogisticsError::NotSender
    )]
    pub shipment: Account<'info, Shipment>,

    #[account(
        seeds = [b"actor", sender_wallet.key().as_ref()],
        bump = sender_actor.bump,
        constraint = sender_actor.role == ActorRole::Sender
            @ LogisticsError::UnauthorizedActor
    )]
    pub sender_actor: Account<'info, Actor>,

    pub sender_wallet: Signer<'info>,
}

pub fn cancel_shipment(
    ctx: Context<CancelShipment>,
    shipment_id: u64,
) -> Result<()> {
    let shipment = &mut ctx.accounts.shipment;
    let clock = Clock::get()?;

    shipment.status = ShipmentStatus::Cancelled;

    emit!(ShipmentCancelled {
        shipment_id,
        cancelled_by: ctx.accounts.sender_wallet.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!("❌ Envío #{} cancelado", shipment_id);
    Ok(())
}
