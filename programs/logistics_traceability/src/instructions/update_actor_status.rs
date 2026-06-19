use anchor_lang::prelude::*;
use crate::state::{Actor, ProgramConfig};
use crate::error::LogisticsError;
use crate::events::ActorStatusChanged;

#[derive(Accounts)]
#[instruction(actor_wallet: Pubkey)]
pub struct UpdateActorStatus<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.authority == authority.key() @ LogisticsError::NotAuthority
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(
        mut,
        seeds = [b"actor", actor_wallet.as_ref()],
        bump = actor.bump,
    )]
    pub actor: Account<'info, Actor>,

    pub authority: Signer<'info>,
}

pub fn update_actor_status(
    ctx: Context<UpdateActorStatus>,
    _actor_wallet: Pubkey,
    is_active: bool,
) -> Result<()> {
    let actor = &mut ctx.accounts.actor;
    let clock = Clock::get()?;
    actor.is_active = is_active;
    emit!(ActorStatusChanged {
        address: actor.address,
        is_active,
        changed_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });
    msg!("Actor {} {}", actor.name, if is_active { "reactivado" } else { "desactivado" });
    Ok(())
}
