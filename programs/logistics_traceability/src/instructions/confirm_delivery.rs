// ============================================================
// programs/logistics_traceability/src/instructions/confirm_delivery.rs
// ============================================================
// El destinatario confirma que recibió el envío.
// Esta es la instrucción final del flujo happy path.
//
// SEGURIDAD CRÍTICA:
//   Solo la wallet registrada como recipient del envío puede
//   confirmar la entrega. Verificamos esto con el constraint:
//   actor.address == shipment.recipient
//
// Esto evita que cualquier carrier marque como entregado sin
// que el destinatario real lo confirme.
// ============================================================

use anchor_lang::prelude::*;
use crate::state::{Actor, ActorRole, Shipment, ShipmentStatus};
use crate::error::LogisticsError;
use crate::events::DeliveryConfirmed;

#[derive(Accounts)]
#[instruction(shipment_id: u64)]
pub struct ConfirmDelivery<'info> {
    #[account(
        mut,
        seeds = [b"shipment", shipment_id.to_le_bytes().as_ref()],
        bump = shipment.bump,
        // Solo si está OutForDelivery puede confirmarse
        constraint = shipment.status == ShipmentStatus::OutForDelivery
            || shipment.status == ShipmentStatus::InTransit
            @ LogisticsError::ShipmentAlreadyClosed,
        // El que confirma debe ser el destinatario registrado
        constraint = shipment.recipient == recipient_wallet.key()
            @ LogisticsError::NotRecipient
    )]
    pub shipment: Account<'info, Shipment>,

    #[account(
        seeds = [b"actor", recipient_wallet.key().as_ref()],
        bump = recipient_actor.bump,
        constraint = recipient_actor.is_active @ LogisticsError::ActorInactive,
        constraint = recipient_actor.role == ActorRole::Recipient
            @ LogisticsError::UnauthorizedActor
    )]
    pub recipient_actor: Account<'info, Actor>,

    pub recipient_wallet: Signer<'info>,
}

pub fn confirm_delivery(
    ctx: Context<ConfirmDelivery>,
    shipment_id: u64,
) -> Result<()> {
    let shipment = &mut ctx.accounts.shipment;
    let clock = Clock::get()?;

    shipment.status = ShipmentStatus::Delivered;
    shipment.date_delivered = clock.unix_timestamp;

    emit!(DeliveryConfirmed {
        shipment_id,
        recipient: ctx.accounts.recipient_wallet.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!("✅ Entrega del envío #{} confirmada por el destinatario", shipment_id);
    Ok(())
}
