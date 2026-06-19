// ============================================================
// programs/logistics_traceability/src/instructions/initialize.rs
// ============================================================
// La instrucción `initialize` crea la cuenta de configuración
// global del programa. Solo se ejecuta UNA VEZ por el
// administrador (authority).
//
// CONCEPTOS CLAVE:
//
// PDA (Program Derived Address):
//   Es una dirección de cuenta que se deriva determinísticamente
//   de seeds + program_id. NO tiene clave privada, por lo que
//   solo el PROGRAMA puede firmar por ella.
//
//   Seeds: ["config"]  → siempre la misma dirección
//   Esto garantiza que haya UNA SOLA config global.
//
// init:
//   Crea la cuenta si no existe. Si ya existe, la instrucción
//   falla con AccountAlreadyInitialized.
//
// payer = authority:
//   La wallet del admin paga el rent (alquiler de espacio en
//   la blockchain). En Solana el espacio tiene un costo en SOL
//   que se "deposita" como rent-exempt deposit.
//
// space = ProgramConfig::SPACE:
//   Reserva exactamente los bytes necesarios.
// ============================================================

use anchor_lang::prelude::*;
use crate::state::ProgramConfig;

/// Estructura de cuentas requeridas para `initialize`
/// El macro #[derive(Accounts)] genera toda la validación automáticamente
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// La cuenta de configuración global del programa.
    /// 
    /// init: Crea la cuenta (falla si ya existe)
    /// seeds: Define el PDA con seed "config"
    /// bump: Anchor encuentra el bump automáticamente
    /// payer: Quien paga el rent (el authority)
    /// space: Bytes a reservar
    #[account(
        init,
        seeds = [b"config"],
        bump,
        payer = authority,
        space = ProgramConfig::SPACE
    )]
    pub config: Account<'info, ProgramConfig>,

    /// El administrador que llama esta instrucción.
    /// mut: Necesario porque su balance de SOL se modifica (paga rent)
    /// Signer: Debe firmar la transacción
    #[account(mut)]
    pub authority: Signer<'info>,

    /// El SystemProgram es necesario para crear cuentas en Solana.
    /// Anchor lo requiere cuando usas `init`.
    pub system_program: Program<'info, System>,
}

/// Handler de la instrucción initialize
/// 
/// En Anchor, los handlers son funciones que reciben:
///   - ctx: Context<T> donde T es la struct de Accounts
///   - Parámetros adicionales
/// 
/// y retornan Result<()> (Ok() en éxito, Err() en fallo)
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    // Obtenemos referencia mutable a la cuenta config
    let config = &mut ctx.accounts.config;

    // Inicializamos todos los campos
    config.authority = ctx.accounts.authority.key();
    config.next_shipment_id = 1;    // Los IDs empiezan en 1
    config.next_checkpoint_id = 1;
    config.next_incident_id = 1;
    config.total_shipments = 0;
    config.total_checkpoints = 0;
    config.total_incidents = 0;
    
    // Guardamos el bump para futuras verificaciones PDA
    config.bump = ctx.bumps.config;

    msg!("🚀 Sistema de Trazabilidad Logística inicializado");
    msg!("Authority: {}", config.authority);

    Ok(())
}
