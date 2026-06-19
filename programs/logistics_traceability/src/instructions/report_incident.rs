// ============================================================
// programs/logistics_traceability/src/instructions/report_incident.rs
// ============================================================
// Reporta una incidencia en un envío activo.
// Carriers, Hubs, Senders y Recipients pueden reportar.
// ============================================================

use anchor_lang::prelude::*;
use crate::state::{Actor, ActorRole, Incident, IncidentType, ProgramConfig, Shipment, ShipmentStatus};
use crate::error::LogisticsError;
use crate::events::IncidentReported;

#[derive(Accounts)]
#[instruction(shipment_id: u64, incident_id: u64)]
pub struct ReportIncident<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,

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
        init,
        seeds = [b"incident", incident_id.to_le_bytes().as_ref()],
        bump,
        payer = signer_wallet,
        space = Incident::SPACE
    )]
    pub incident: Account<'info, Incident>,

    #[account(
        seeds = [b"actor", reporter_actor_wallet.key().as_ref()],
        bump = reporter_actor.bump,
        constraint = reporter_actor.is_active @ LogisticsError::ActorInactive,
        // Inspectors NO pueden reportar incidencias (solo lectura)
        constraint = reporter_actor.role != ActorRole::Inspector
            @ LogisticsError::UnauthorizedActor
    )]
    pub reporter_actor: Account<'info, Actor>,

    /// CHECK: Solo se usa como seed para el PDA del actor.
    pub reporter_actor_wallet: AccountInfo<'info>,
    /// Wallet que firma y paga el rent.
    #[account(mut)]
    pub signer_wallet: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn report_incident(
    ctx: Context<ReportIncident>,
    shipment_id: u64,
    incident_id: u64,
    incident_type: IncidentType,
    description: String,
) -> Result<()> {
    require!(
        !description.is_empty() && description.len() <= 256,
        LogisticsError::InvalidDescription
    );

    let config = &mut ctx.accounts.config;
    require_eq!(incident_id, config.next_incident_id, LogisticsError::ShipmentNotFound);

    let clock = Clock::get()?;
    let incident = &mut ctx.accounts.incident;

    incident.id = incident_id;
    incident.shipment_id = shipment_id;
    incident.incident_type = incident_type.clone();
    incident.reporter = ctx.accounts.reporter_actor_wallet.key();
    incident.description = description.clone();
    incident.timestamp = clock.unix_timestamp;
    incident.resolved = false;
    incident.resolution_notes = String::new();
    incident.bump = ctx.bumps.incident;

    let shipment = &mut ctx.accounts.shipment;
    shipment.incident_count += 1;

    config.next_incident_id += 1;
    config.total_incidents += 1;

    emit!(IncidentReported {
        incident_id,
        shipment_id,
        incident_type: format!("{:?}", incident_type),
        reporter: incident.reporter,
        description: description.clone(),
        timestamp: clock.unix_timestamp,
    });

    msg!("🚨 Incidencia #{} reportada en envío #{}: {:?}", incident_id, shipment_id, incident_type);
    Ok(())
}
