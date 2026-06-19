use anchor_lang::prelude::*;
use crate::state::ProgramConfig;
use crate::error::LogisticsError;
use crate::events::AuthorityTransferred;

#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.authority == current_authority.key() @ LogisticsError::NotAuthority
    )]
    pub config: Account<'info, ProgramConfig>,
    pub current_authority: Signer<'info>,
}

pub fn transfer_authority(
    ctx: Context<TransferAuthority>,
    new_authority: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let clock = Clock::get()?;
    let old = config.authority;
    config.authority = new_authority;
    emit!(AuthorityTransferred {
        old_authority: old,
        new_authority,
        timestamp: clock.unix_timestamp,
    });
    msg!("Authority transferida de {} a {}", old, new_authority);
    Ok(())
}
