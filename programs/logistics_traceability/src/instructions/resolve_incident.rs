// ============================================================
// programs/logistics_traceability/src/instructions/resolve_incident.rs
// ============================================================
// Marca una incidencia como resuelta. Solo el actor que la
// reportó puede resolverla (o el authority del programa).
// ============================================================

use anchor_lang::prelude::*;
use crate::state::Incident;
use crate::error::LogisticsError;
use crate::events::IncidentResolved;

#[derive(Accounts)]
#[instruction(incident_id: u64)]
pub struct ResolveIncident<'info> {
    #[account(
        mut,
        seeds = [b"incident", incident_id.to_le_bytes().as_ref()],
        bump = incident.bump,
        constraint = !incident.resolved @ LogisticsError::IncidentAlreadyResolved,
        // Solo quien reportó puede resolver
        constraint = incident.reporter == resolver_wallet.key()
            @ LogisticsError::NotIncidentReporter
    )]
    pub incident: Account<'info, Incident>,

    pub resolver_wallet: Signer<'info>,
}

pub fn resolve_incident(
    ctx: Context<ResolveIncident>,
    incident_id: u64,
    resolution_notes: String,
) -> Result<()> {
    require!(resolution_notes.len() <= 256, LogisticsError::InvalidDescription);
    let incident = &mut ctx.accounts.incident;
    let clock = Clock::get()?;
    incident.resolution_notes = resolution_notes;

    incident.resolved = true;

    emit!(IncidentResolved {
        incident_id,
        shipment_id: incident.shipment_id,
        resolved_by: ctx.accounts.resolver_wallet.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!("✅ Incidencia #{} resuelta", incident_id);
    Ok(())
}
