use anchor_lang::prelude::*;

#[error_code]
pub enum LogisticsError {
    // Actor
    #[msg("Actor no registrado en el sistema")]
    ActorNotFound,
    #[msg("Solo el administrador puede realizar esta accion")]
    NotAuthority,
    #[msg("El actor no tiene permisos para realizar esta operacion")]
    UnauthorizedActor,
    #[msg("El actor esta inactivo o suspendido")]
    ActorInactive,
    // Envio
    #[msg("Envio no encontrado")]
    ShipmentNotFound,
    #[msg("Solo el remitente puede realizar esta accion")]
    NotSender,
    #[msg("Solo el destinatario puede confirmar la entrega")]
    NotRecipient,
    #[msg("El envio ya esta en un estado terminal")]
    ShipmentAlreadyClosed,
    #[msg("El envio no puede cancelarse en el estado actual")]
    CannotCancel,
    // Checkpoint
    #[msg("Solo transportistas, hubs y destinatarios pueden registrar checkpoints")]
    CannotRecordCheckpoint,
    #[msg("El checkpoint no pertenece al envio indicado")]
    CheckpointShipmentMismatch,
    // Temperatura
    #[msg("Temperatura fuera del rango permitido para este envio")]
    TemperatureViolation,
    #[msg("Este envio no requiere control de temperatura")]
    NoColdChainRequired,
    // Validacion
    #[msg("El nombre debe tener entre 1 y 128 caracteres")]
    InvalidName,
    #[msg("El producto debe tener entre 1 y 64 caracteres")]
    InvalidProduct,
    #[msg("La ubicacion debe tener entre 1 y 256 caracteres")]
    InvalidLocation,
    #[msg("La descripcion debe tener entre 1 y 256 caracteres")]
    InvalidDescription,
    #[msg("La humedad debe estar entre 0 y 100")]
    InvalidHumidity,
    // Incidencia
    #[msg("Esta incidencia ya fue resuelta")]
    IncidentAlreadyResolved,
    #[msg("Solo quien reportó la incidencia puede resolverla")]
    NotIncidentReporter,
}
