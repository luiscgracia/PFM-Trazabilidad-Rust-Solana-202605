/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/logistics_traceability.json`.
 */
export type LogisticsTraceability = {
  "address": "88jtu9fMGP9VMtSiXCvva4xy6W3i9CufnYFXMrvgKtRA",
  "metadata": {
    "name": "logisticsTraceability",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "TFM - Plataforma de Trazabilidad Logistica en Solana"
  },
  "docs": [
    "El módulo #[program] contiene todas las instrucciones públicas",
    "que los clientes pueden invocar.",
    "",
    "Anchor genera automáticamente:",
    "1. El discriminador de instrucción (hash del nombre)",
    "2. La deserialización de parámetros",
    "3. La validación de cuentas (desde las structs Accounts)",
    "4. El manejo de errores"
  ],
  "instructions": [
    {
      "name": "cancelShipment",
      "docs": [
        "Cancela un envío en estado Created."
      ],
      "discriminator": [
        218,
        193,
        79,
        176,
        231,
        134,
        184,
        74
      ],
      "accounts": [
        {
          "name": "shipment",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  104,
                  105,
                  112,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "shipmentId"
              }
            ]
          }
        },
        {
          "name": "senderActor",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "senderWallet"
              }
            ]
          }
        },
        {
          "name": "senderWallet",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "shipmentId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "confirmDelivery",
      "docs": [
        "El destinatario confirma la recepción del envío."
      ],
      "discriminator": [
        11,
        109,
        227,
        53,
        179,
        190,
        88,
        155
      ],
      "accounts": [
        {
          "name": "shipment",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  104,
                  105,
                  112,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "shipmentId"
              }
            ]
          }
        },
        {
          "name": "recipientActor",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "recipientWallet"
              }
            ]
          }
        },
        {
          "name": "recipientWallet",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "shipmentId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createShipment",
      "docs": [
        "Crea un nuevo envío. Solo Senders pueden hacerlo."
      ],
      "discriminator": [
        67,
        64,
        17,
        114,
        30,
        143,
        249,
        247
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Configuración global. Necesitamos actualizarla (mut) para",
            "incrementar los contadores."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "shipment",
          "docs": [
            "El nuevo envío que se va a crear"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  104,
                  105,
                  112,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "shipmentId"
              }
            ]
          }
        },
        {
          "name": "senderActor",
          "docs": [
            "La cuenta Actor del remitente (ya debe existir)",
            "",
            "Constraint: Verificamos que el actor esté activo y sea Sender",
            "Esta es una de las partes más importantes de Anchor:",
            "las validaciones en constraints evitan llamadas inválidas."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "actorWallet"
              }
            ]
          }
        },
        {
          "name": "actorWallet"
        },
        {
          "name": "senderWallet",
          "docs": [
            "La wallet del remitente. Debe firmar y pagar el rent."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "shipmentId",
          "type": "u64"
        },
        {
          "name": "recipient",
          "type": "pubkey"
        },
        {
          "name": "product",
          "type": "string"
        },
        {
          "name": "origin",
          "type": "string"
        },
        {
          "name": "destination",
          "type": "string"
        },
        {
          "name": "requiresColdChain",
          "type": "bool"
        },
        {
          "name": "maxTemperature",
          "type": "i16"
        }
      ]
    },
    {
      "name": "initialize",
      "docs": [
        "Inicializa el sistema. Solo se llama UNA VEZ.",
        "Crea la cuenta de configuración global del programa."
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "La cuenta de configuración global del programa.",
            "",
            "init: Crea la cuenta (falla si ya existe)",
            "seeds: Define el PDA con seed \"config\"",
            "bump: Anchor encuentra el bump automáticamente",
            "payer: Quien paga el rent (el authority)",
            "space: Bytes a reservar"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "El administrador que llama esta instrucción.",
            "mut: Necesario porque su balance de SOL se modifica (paga rent)",
            "Signer: Debe firmar la transacción"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "El SystemProgram es necesario para crear cuentas en Solana.",
            "Anchor lo requiere cuando usas `init`."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "recordCheckpoint",
      "docs": [
        "Registra un checkpoint (evento logístico) en un envío.",
        "La instrucción más frecuente del sistema."
      ],
      "discriminator": [
        247,
        156,
        153,
        92,
        52,
        154,
        167,
        219
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Config global para obtener y actualizar el siguiente checkpoint_id"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "shipment",
          "docs": [
            "El envío al que pertenece este checkpoint.",
            "mut porque incrementamos checkpoint_count"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  104,
                  105,
                  112,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "shipmentId"
              }
            ]
          }
        },
        {
          "name": "checkpoint",
          "docs": [
            "El nuevo checkpoint que se crea"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  104,
                  101,
                  99,
                  107,
                  112,
                  111,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "checkpointId"
              }
            ]
          }
        },
        {
          "name": "actor",
          "docs": [
            "La cuenta Actor del que registra el checkpoint"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "actorWallet"
              }
            ]
          }
        },
        {
          "name": "actorWallet"
        },
        {
          "name": "signerWallet",
          "docs": [
            "La wallet que firma y paga el rent."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "shipmentId",
          "type": "u64"
        },
        {
          "name": "checkpointId",
          "type": "u64"
        },
        {
          "name": "location",
          "type": "string"
        },
        {
          "name": "checkpointType",
          "type": {
            "defined": {
              "name": "checkpointType"
            }
          }
        },
        {
          "name": "metadata",
          "type": "string"
        },
        {
          "name": "temperature",
          "type": "i16"
        },
        {
          "name": "humidity",
          "type": "u8"
        }
      ]
    },
    {
      "name": "registerActor",
      "docs": [
        "Registra un nuevo actor. Solo el authority (admin) puede llamar esto.",
        "actor_wallet: la Pubkey de la wallet del actor a registrar."
      ],
      "discriminator": [
        113,
        25,
        196,
        156,
        92,
        79,
        15,
        151
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Config global — verificamos que quien firma sea el authority"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "actor",
          "docs": [
            "La cuenta Actor que se crea para actor_wallet"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "actorWallet"
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "El admin que registra al actor. Debe ser el authority del programa."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "actorWallet",
          "type": "pubkey"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "role",
          "type": {
            "defined": {
              "name": "actorRole"
            }
          }
        },
        {
          "name": "location",
          "type": "string"
        }
      ]
    },
    {
      "name": "reportIncident",
      "docs": [
        "Reporta una incidencia en un envío activo."
      ],
      "discriminator": [
        126,
        5,
        154,
        89,
        39,
        235,
        130,
        56
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "shipment",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  104,
                  105,
                  112,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "shipmentId"
              }
            ]
          }
        },
        {
          "name": "incident",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  99,
                  105,
                  100,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "incidentId"
              }
            ]
          }
        },
        {
          "name": "reporterActor",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "reporterActorWallet"
              }
            ]
          }
        },
        {
          "name": "reporterActorWallet",
          "writable": true
        },
        {
          "name": "signerWallet",
          "docs": [
            "La wallet que firma y paga el rent."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "shipmentId",
          "type": "u64"
        },
        {
          "name": "incidentId",
          "type": "u64"
        },
        {
          "name": "incidentType",
          "type": {
            "defined": {
              "name": "incidentType"
            }
          }
        },
        {
          "name": "description",
          "type": "string"
        }
      ]
    },
    {
      "name": "resolveIncident",
      "docs": [
        "Marca una incidencia como resuelta."
      ],
      "discriminator": [
        135,
        2,
        35,
        55,
        210,
        7,
        235,
        170
      ],
      "accounts": [
        {
          "name": "incident",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  99,
                  105,
                  100,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "incidentId"
              }
            ]
          }
        },
        {
          "name": "resolverWallet",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "incidentId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "transferAuthority",
      "docs": [
        "Transfiere la administración del programa a una nueva wallet.",
        "IRREVERSIBLE si se pierde acceso a la nueva wallet."
      ],
      "discriminator": [
        48,
        169,
        76,
        72,
        229,
        180,
        55,
        161
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "currentAuthority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updateActorStatus",
      "docs": [
        "Desactiva o reactiva un actor. Solo el authority puede llamar esto."
      ],
      "discriminator": [
        9,
        195,
        182,
        235,
        29,
        215,
        144,
        54
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "actor",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "actorWallet"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "actorWallet",
          "type": "pubkey"
        },
        {
          "name": "isActive",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updateShipmentStatus",
      "docs": [
        "Actualiza manualmente el estado de un envío."
      ],
      "discriminator": [
        1,
        153,
        158,
        123,
        14,
        134,
        60,
        44
      ],
      "accounts": [
        {
          "name": "shipment",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  104,
                  105,
                  112,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "shipmentId"
              }
            ]
          }
        },
        {
          "name": "actor",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "actorWallet"
              }
            ]
          }
        },
        {
          "name": "actorWallet",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "shipmentId",
          "type": "u64"
        },
        {
          "name": "newStatus",
          "type": {
            "defined": {
              "name": "shipmentStatus"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "actor",
      "discriminator": [
        46,
        77,
        47,
        204,
        204,
        54,
        34,
        88
      ]
    },
    {
      "name": "checkpoint",
      "discriminator": [
        199,
        62,
        186,
        186,
        98,
        119,
        211,
        139
      ]
    },
    {
      "name": "incident",
      "discriminator": [
        144,
        81,
        144,
        130,
        200,
        193,
        26,
        111
      ]
    },
    {
      "name": "programConfig",
      "discriminator": [
        196,
        210,
        90,
        231,
        144,
        149,
        140,
        63
      ]
    },
    {
      "name": "shipment",
      "discriminator": [
        3,
        65,
        195,
        72,
        154,
        63,
        211,
        213
      ]
    }
  ],
  "events": [
    {
      "name": "actorRegistered",
      "discriminator": [
        192,
        208,
        105,
        215,
        222,
        240,
        70,
        126
      ]
    },
    {
      "name": "actorStatusChanged",
      "discriminator": [
        88,
        154,
        225,
        113,
        75,
        67,
        78,
        213
      ]
    },
    {
      "name": "authorityTransferred",
      "discriminator": [
        245,
        109,
        179,
        54,
        135,
        92,
        22,
        64
      ]
    },
    {
      "name": "checkpointRecorded",
      "discriminator": [
        157,
        192,
        91,
        196,
        149,
        33,
        47,
        247
      ]
    },
    {
      "name": "deliveryConfirmed",
      "discriminator": [
        225,
        181,
        249,
        139,
        185,
        125,
        219,
        154
      ]
    },
    {
      "name": "incidentReported",
      "discriminator": [
        105,
        191,
        58,
        193,
        50,
        86,
        61,
        103
      ]
    },
    {
      "name": "incidentResolved",
      "discriminator": [
        177,
        41,
        241,
        30,
        24,
        232,
        230,
        37
      ]
    },
    {
      "name": "shipmentCancelled",
      "discriminator": [
        203,
        222,
        158,
        44,
        11,
        88,
        233,
        28
      ]
    },
    {
      "name": "shipmentCreated",
      "discriminator": [
        208,
        238,
        202,
        187,
        110,
        165,
        208,
        89
      ]
    },
    {
      "name": "shipmentStatusChanged",
      "discriminator": [
        158,
        0,
        247,
        163,
        91,
        78,
        5,
        91
      ]
    },
    {
      "name": "tempViolationDetected",
      "discriminator": [
        114,
        206,
        209,
        227,
        229,
        99,
        143,
        44
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "actorNotFound",
      "msg": "Actor no registrado en el sistema"
    },
    {
      "code": 6001,
      "name": "notAuthority",
      "msg": "Solo el administrador puede realizar esta accion"
    },
    {
      "code": 6002,
      "name": "unauthorizedActor",
      "msg": "El actor no tiene permisos para realizar esta operacion"
    },
    {
      "code": 6003,
      "name": "actorInactive",
      "msg": "El actor esta inactivo o suspendido"
    },
    {
      "code": 6004,
      "name": "shipmentNotFound",
      "msg": "Envio no encontrado"
    },
    {
      "code": 6005,
      "name": "notSender",
      "msg": "Solo el remitente puede realizar esta accion"
    },
    {
      "code": 6006,
      "name": "notRecipient",
      "msg": "Solo el destinatario puede confirmar la entrega"
    },
    {
      "code": 6007,
      "name": "shipmentAlreadyClosed",
      "msg": "El envio ya esta en un estado terminal"
    },
    {
      "code": 6008,
      "name": "cannotCancel",
      "msg": "El envio no puede cancelarse en el estado actual"
    },
    {
      "code": 6009,
      "name": "cannotRecordCheckpoint",
      "msg": "Solo transportistas, hubs y destinatarios pueden registrar checkpoints"
    },
    {
      "code": 6010,
      "name": "checkpointShipmentMismatch",
      "msg": "El checkpoint no pertenece al envio indicado"
    },
    {
      "code": 6011,
      "name": "temperatureViolation",
      "msg": "Temperatura fuera del rango permitido para este envio"
    },
    {
      "code": 6012,
      "name": "noColdChainRequired",
      "msg": "Este envio no requiere control de temperatura"
    },
    {
      "code": 6013,
      "name": "invalidName",
      "msg": "El nombre debe tener entre 1 y 128 caracteres"
    },
    {
      "code": 6014,
      "name": "invalidProduct",
      "msg": "El producto debe tener entre 1 y 64 caracteres"
    },
    {
      "code": 6015,
      "name": "invalidLocation",
      "msg": "La ubicacion debe tener entre 1 y 256 caracteres"
    },
    {
      "code": 6016,
      "name": "invalidDescription",
      "msg": "La descripcion debe tener entre 1 y 256 caracteres"
    },
    {
      "code": 6017,
      "name": "invalidHumidity",
      "msg": "La humedad debe estar entre 0 y 100"
    },
    {
      "code": 6018,
      "name": "incidentAlreadyResolved",
      "msg": "Esta incidencia ya fue resuelta"
    },
    {
      "code": 6019,
      "name": "notIncidentReporter",
      "msg": "Solo el reportador de la incidencia puede resolverla"
    }
  ],
  "types": [
    {
      "name": "actor",
      "docs": [
        "Representa a un participante registrado en el sistema",
        "Cada wallet tiene máximo UN Actor account"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "address",
            "docs": [
              "Dirección pública de la wallet del actor"
            ],
            "type": "pubkey"
          },
          {
            "name": "name",
            "docs": [
              "Nombre o empresa del actor (máx 128 chars)"
            ],
            "type": "string"
          },
          {
            "name": "role",
            "docs": [
              "Rol asignado al actor"
            ],
            "type": {
              "defined": {
                "name": "actorRole"
              }
            }
          },
          {
            "name": "location",
            "docs": [
              "Ubicación física o código de hub (máx 256 chars)"
            ],
            "type": "string"
          },
          {
            "name": "isActive",
            "docs": [
              "Si está activo o fue suspendido"
            ],
            "type": "bool"
          },
          {
            "name": "createdAt",
            "docs": [
              "Timestamp Unix de cuando se registró"
            ],
            "type": "i64"
          },
          {
            "name": "shipmentsCreated",
            "docs": [
              "Contadores para estadísticas del actor"
            ],
            "type": "u32"
          },
          {
            "name": "checkpointsRecorded",
            "type": "u32"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed del PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "actorRegistered",
      "docs": [
        "Emitido cuando un actor se registra en el sistema"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "role",
            "type": "string"
          },
          {
            "name": "location",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "actorRole",
      "docs": [
        "Rol de cada actor participante en la cadena logística"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "sender"
          },
          {
            "name": "carrier"
          },
          {
            "name": "hub"
          },
          {
            "name": "recipient"
          },
          {
            "name": "inspector"
          }
        ]
      }
    },
    {
      "name": "actorStatusChanged",
      "docs": [
        "Emitido cuando se cambia el estado de un actor"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "changedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "authorityTransferred",
      "docs": [
        "Emitido cuando se transfiere la autoridad del programa"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oldAuthority",
            "type": "pubkey"
          },
          {
            "name": "newAuthority",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "checkpoint",
      "docs": [
        "Registra un evento puntual en el ciclo de vida del envío",
        "Cada checkpoint es inmutable una vez creado"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "docs": [
              "ID único del checkpoint"
            ],
            "type": "u64"
          },
          {
            "name": "shipmentId",
            "docs": [
              "ID del envío al que pertenece"
            ],
            "type": "u64"
          },
          {
            "name": "actor",
            "docs": [
              "Wallet del actor que registró este checkpoint"
            ],
            "type": "pubkey"
          },
          {
            "name": "location",
            "docs": [
              "Ubicación física donde ocurrió el evento (máx 256 chars)"
            ],
            "type": "string"
          },
          {
            "name": "checkpointType",
            "docs": [
              "Tipo de evento"
            ],
            "type": {
              "defined": {
                "name": "checkpointType"
              }
            }
          },
          {
            "name": "timestamp",
            "docs": [
              "Timestamp del evento (del reloj on-chain de Solana)"
            ],
            "type": "i64"
          },
          {
            "name": "metadata",
            "docs": [
              "Datos adicionales en formato JSON (máx 512 chars)",
              "Ejemplo: {\"operator\": \"hub_01\", \"notes\": \"Good condition\"}"
            ],
            "type": "string"
          },
          {
            "name": "temperature",
            "docs": [
              "Temperatura en Celsius * 10 (permite un decimal)",
              "Ejemplo: 42 = 4.2°C, -50 = -5.0°C",
              "i16: rango -3276.8 a 3276.7, suficiente para temperatura"
            ],
            "type": "i16"
          },
          {
            "name": "humidity",
            "docs": [
              "Humedad relativa en porcentaje (0-100)"
            ],
            "type": "u8"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed del PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "checkpointRecorded",
      "docs": [
        "Emitido cuando se registra un nuevo checkpoint"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "checkpointId",
            "type": "u64"
          },
          {
            "name": "shipmentId",
            "type": "u64"
          },
          {
            "name": "location",
            "type": "string"
          },
          {
            "name": "checkpointType",
            "docs": [
              "Usamos String para el tipo para facilitar lectura en frontend"
            ],
            "type": "string"
          },
          {
            "name": "actor",
            "type": "pubkey"
          },
          {
            "name": "temperature",
            "docs": [
              "Temperatura / 10.0 para mostrar decimales en el evento"
            ],
            "type": "i16"
          },
          {
            "name": "humidity",
            "type": "u8"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "checkpointType",
      "docs": [
        "Tipo de evento registrado en un checkpoint"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pickup"
          },
          {
            "name": "hubIn"
          },
          {
            "name": "hubOut"
          },
          {
            "name": "transit"
          },
          {
            "name": "deliveryAttempt"
          },
          {
            "name": "delivered"
          },
          {
            "name": "sensorData"
          }
        ]
      }
    },
    {
      "name": "deliveryConfirmed",
      "docs": [
        "Emitido cuando el destinatario confirma la entrega"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "shipmentId",
            "type": "u64"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "incident",
      "docs": [
        "Registra una incidencia o problema detectado en el envío"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "docs": [
              "ID único de la incidencia"
            ],
            "type": "u64"
          },
          {
            "name": "shipmentId",
            "docs": [
              "ID del envío afectado"
            ],
            "type": "u64"
          },
          {
            "name": "incidentType",
            "docs": [
              "Tipo de incidencia"
            ],
            "type": {
              "defined": {
                "name": "incidentType"
              }
            }
          },
          {
            "name": "reporter",
            "docs": [
              "Wallet del actor que reportó la incidencia"
            ],
            "type": "pubkey"
          },
          {
            "name": "description",
            "docs": [
              "Descripción detallada (máx 256 chars)"
            ],
            "type": "string"
          },
          {
            "name": "timestamp",
            "docs": [
              "Timestamp del reporte"
            ],
            "type": "i64"
          },
          {
            "name": "resolved",
            "docs": [
              "Si la incidencia fue resuelta"
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed del PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "incidentReported",
      "docs": [
        "Emitido cuando se reporta una incidencia"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "incidentId",
            "type": "u64"
          },
          {
            "name": "shipmentId",
            "type": "u64"
          },
          {
            "name": "incidentType",
            "type": "string"
          },
          {
            "name": "reporter",
            "type": "pubkey"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "incidentResolved",
      "docs": [
        "Emitido cuando se resuelve una incidencia"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "incidentId",
            "type": "u64"
          },
          {
            "name": "shipmentId",
            "type": "u64"
          },
          {
            "name": "resolvedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "incidentType",
      "docs": [
        "Tipo de incidencia que puede ocurrir durante el transporte"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "delay"
          },
          {
            "name": "damage"
          },
          {
            "name": "lost"
          },
          {
            "name": "tempViolation"
          },
          {
            "name": "unauthorized"
          }
        ]
      }
    },
    {
      "name": "programConfig",
      "docs": [
        "Configuración global del programa",
        "Solo existe UNA instancia de esta cuenta (PDA del programa)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Wallet del administrador que puede cambiar configuraciones"
            ],
            "type": "pubkey"
          },
          {
            "name": "nextShipmentId",
            "docs": [
              "Contador para generar IDs únicos de envíos"
            ],
            "type": "u64"
          },
          {
            "name": "nextCheckpointId",
            "docs": [
              "Contador para generar IDs únicos de checkpoints"
            ],
            "type": "u64"
          },
          {
            "name": "nextIncidentId",
            "docs": [
              "Contador para generar IDs únicos de incidencias"
            ],
            "type": "u64"
          },
          {
            "name": "totalShipments",
            "docs": [
              "Estadísticas globales del sistema"
            ],
            "type": "u64"
          },
          {
            "name": "totalCheckpoints",
            "type": "u64"
          },
          {
            "name": "totalIncidents",
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed del PDA (guardado para verificaciones futuras)"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "shipment",
      "docs": [
        "Representa un envío (paquete, contenedor, etc.)",
        "Es la entidad central del sistema de trazabilidad"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "docs": [
              "ID numérico único (generado por ProgramConfig)"
            ],
            "type": "u64"
          },
          {
            "name": "sender",
            "docs": [
              "Wallet del remitente que creó el envío"
            ],
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "docs": [
              "Wallet del destinatario final"
            ],
            "type": "pubkey"
          },
          {
            "name": "product",
            "docs": [
              "Descripción del producto (máx 64 chars)"
            ],
            "type": "string"
          },
          {
            "name": "origin",
            "docs": [
              "Ciudad/dirección de origen (máx 128 chars)"
            ],
            "type": "string"
          },
          {
            "name": "destination",
            "docs": [
              "Ciudad/dirección destino (máx 128 chars)"
            ],
            "type": "string"
          },
          {
            "name": "dateCreated",
            "docs": [
              "Timestamp de creación"
            ],
            "type": "i64"
          },
          {
            "name": "dateDelivered",
            "docs": [
              "Timestamp de entrega (0 si no entregado aún)"
            ],
            "type": "i64"
          },
          {
            "name": "status",
            "docs": [
              "Estado actual del envío"
            ],
            "type": {
              "defined": {
                "name": "shipmentStatus"
              }
            }
          },
          {
            "name": "checkpointCount",
            "docs": [
              "Número de checkpoints registrados"
            ],
            "type": "u32"
          },
          {
            "name": "incidentCount",
            "docs": [
              "Número de incidencias reportadas"
            ],
            "type": "u32"
          },
          {
            "name": "requiresColdChain",
            "docs": [
              "Si requiere control de temperatura (cadena de frío)"
            ],
            "type": "bool"
          },
          {
            "name": "maxTemperature",
            "docs": [
              "Temperatura máxima permitida (Celsius * 10)",
              "Ejemplo: 45 = 4.5°C. Usamos i16 para decimales sin floats."
            ],
            "type": "i16"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed del PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "shipmentCancelled",
      "docs": [
        "Emitido cuando se cancela un envío"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "shipmentId",
            "type": "u64"
          },
          {
            "name": "cancelledBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "shipmentCreated",
      "docs": [
        "Emitido cuando se crea un nuevo envío"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "shipmentId",
            "type": "u64"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "product",
            "type": "string"
          },
          {
            "name": "origin",
            "type": "string"
          },
          {
            "name": "destination",
            "type": "string"
          },
          {
            "name": "requiresColdChain",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "shipmentStatus",
      "docs": [
        "Estado actual de un envío a lo largo de su ciclo de vida"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "created"
          },
          {
            "name": "inTransit"
          },
          {
            "name": "atHub"
          },
          {
            "name": "outForDelivery"
          },
          {
            "name": "delivered"
          },
          {
            "name": "returned"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "shipmentStatusChanged",
      "docs": [
        "Emitido cuando cambia el estado de un envío"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "shipmentId",
            "type": "u64"
          },
          {
            "name": "newStatus",
            "type": "string"
          },
          {
            "name": "actor",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "tempViolationDetected",
      "docs": [
        "Emitido automáticamente cuando se detecta violación de temperatura",
        "Esto es clave para sistemas de alertas automatizadas"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "shipmentId",
            "type": "u64"
          },
          {
            "name": "checkpointId",
            "type": "u64"
          },
          {
            "name": "temperature",
            "docs": [
              "Temperatura registrada (real * 10)"
            ],
            "type": "i16"
          },
          {
            "name": "maxAllowed",
            "docs": [
              "Temperatura máxima permitida (real * 10)"
            ],
            "type": "i16"
          },
          {
            "name": "location",
            "type": "string"
          },
          {
            "name": "actor",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
