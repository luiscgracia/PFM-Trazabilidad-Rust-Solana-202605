// ============================================================
// register_actor.rs
// ============================================================
// Solo el AUTHORITY (admin que llamo initialize) puede registrar
// actores. Esto se verifica con un constraint que compara
// config.authority con la wallet que firma.
//
// La cuenta Actor se crea con seeds [b"actor", actor_wallet]
// donde actor_wallet es la wallet DEL ACTOR (no del admin).
// Esto permite que cada wallet tenga a lo sumo un Actor account.
//
// El admin paga el rent de la cuenta Actor. En produccion se
// podria hacer que el propio actor pague, pero requeriria que
// el admin primero le transfiera SOL.
// ============================================================

use anchor_lang::prelude::*;
use crate::state::{Actor, ActorRole, ProgramConfig};
use crate::error::LogisticsError;
use crate::events::ActorRegistered;

#[derive(Accounts)]
#[instruction(actor_wallet: Pubkey)]
pub struct RegisterActor<'info> {
    /// Config global — verificamos que quien firma sea el authority
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.authority == authority.key() @ LogisticsError::NotAuthority
    )]
    pub config: Account<'info, ProgramConfig>,

    /// La cuenta Actor que se crea para actor_wallet
    #[account(
        init,
        seeds = [b"actor", actor_wallet.as_ref()],
        bump,
        payer = authority,
        space = Actor::SPACE
    )]
    pub actor: Account<'info, Actor>,

    /// El admin que registra al actor. Debe ser el authority del programa.
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn register_actor(
    ctx: Context<RegisterActor>,
    actor_wallet: Pubkey,
    name: String,
    role: ActorRole,
    location: String,
) -> Result<()> {
    require!(!name.is_empty() && name.len() <= 128, LogisticsError::InvalidName);
    require!(!location.is_empty() && location.len() <= 256, LogisticsError::InvalidLocation);

    let actor = &mut ctx.accounts.actor;
    let clock = Clock::get()?;

    actor.address = actor_wallet;
    actor.name = name.clone();
    actor.role = role.clone();
    actor.location = location.clone();
    actor.is_active = true;
    actor.created_at = clock.unix_timestamp;
    actor.shipments_created = 0;
    actor.checkpoints_recorded = 0;
    actor.bump = ctx.bumps.actor;

    emit!(ActorRegistered {
        address: actor.address,
        name: actor.name.clone(),
        role: format!("{:?}", actor.role),
        location: actor.location.clone(),
        timestamp: clock.unix_timestamp,
    });

    msg!("Actor registrado: {} ({:?}) por admin", actor.name, actor.role);
    Ok(())
}
