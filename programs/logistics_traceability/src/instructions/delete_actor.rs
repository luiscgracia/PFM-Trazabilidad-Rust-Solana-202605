// ============================================================
// delete_actor.rs
// ============================================================
// Elimina permanentemente la cuenta Actor de una wallet.
// Solo el authority (admin) puede eliminar actores.
//
// En Solana, "eliminar" una cuenta significa cerrarla:
//   - Los datos se borran
//   - El rent (SOL depositado) se devuelve al admin
//   - La PDA queda libre para ser creada de nuevo
//
// Esto permite registrar la misma wallet con un rol diferente.
//
// close = authority:
//   Este constraint de Anchor hace todo automaticamente:
//   1. Transfiere el rent de la cuenta al authority
//   2. Pone los datos a cero
//   3. Cambia el owner a SystemProgram (cuenta muerta)
// ============================================================

use anchor_lang::prelude::*;
use crate::state::{Actor, ProgramConfig};
use crate::error::LogisticsError;
use crate::events::ActorDeleted;

#[derive(Accounts)]
#[instruction(actor_wallet: Pubkey)]
pub struct DeleteActor<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.authority == authority.key() @ LogisticsError::NotAuthority
    )]
    pub config: Account<'info, ProgramConfig>,

    /// close = authority devuelve el rent al admin y cierra la cuenta
    #[account(
        mut,
        seeds = [b"actor", actor_wallet.as_ref()],
        bump = actor.bump,
        close = authority
    )]
    pub actor: Account<'info, Actor>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn delete_actor(
    ctx: Context<DeleteActor>,
    _actor_wallet: Pubkey,
) -> Result<()> {
    let actor = &ctx.accounts.actor;
    let clock = Clock::get()?;

    emit!(ActorDeleted {
        address: actor.address,
        name: actor.name.clone(),
        deleted_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!("Actor eliminado: {} ({})", actor.name, actor.address);
    Ok(())
}
