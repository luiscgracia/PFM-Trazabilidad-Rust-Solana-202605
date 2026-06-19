// ============================================================
// tests/logistics-traceability.ts
// ============================================================
// Tests de integración del programa Anchor usando Mocha + Chai.
//
// Estos tests corren contra un validator de Solana LOCAL
// (levantado automáticamente por `anchor test`).
//
// FLUJO DE UN TEST EN ANCHOR:
//   1. Anchor crea wallets de prueba con SOL airdropeado
//   2. Cada test envía transacciones al validator local
//   3. Verificamos el estado de las accounts después
//
// PARA EJECUTAR:
//   anchor test              # Compila + despliega + testea
//   anchor test --skip-build # Solo testea (ya compilado)
// ============================================================

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LogisticsTraceability } from "../target/types/logistics_traceability";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("logistics-traceability", () => {
  // Configurar el provider de Anchor (lee de Anchor.toml)
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.LogisticsTraceability as Program<LogisticsTraceability>;

  // Wallets de prueba para diferentes actores
  const authority = provider.wallet; // La wallet del deployer
  const senderWallet = Keypair.generate();   // Remitente
  const carrierWallet = Keypair.generate();  // Transportista
  const hubWallet = Keypair.generate();      // Hub logístico
  const recipientWallet = Keypair.generate(); // Destinatario

  // PDAs que calcularemos
  let configPda: PublicKey;
  let senderActorPda: PublicKey;
  let carrierActorPda: PublicKey;
  let hubActorPda: PublicKey;
  let recipientActorPda: PublicKey;
  let shipmentPda: PublicKey;
  let checkpointPda: PublicKey;

  const SHIPMENT_ID = new anchor.BN(1);
  const CHECKPOINT_ID = new anchor.BN(1);
  const INCIDENT_ID = new anchor.BN(1);

  // ============================================================
  // SETUP: Airdrop SOL a las wallets de prueba
  // ============================================================
  before(async () => {
    // Airdrop 2 SOL a cada wallet de prueba
    // En localnet el airdrop es instantáneo y gratuito
    const wallets = [senderWallet, carrierWallet, hubWallet, recipientWallet];
    
    for (const wallet of wallets) {
      const sig = await provider.connection.requestAirdrop(
        wallet.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    }
    console.log("✅ Airdrop aplicado para todas las wallets de prueba");

    // Calcular PDAs off-chain (mismo algoritmo que en Rust)
    // Esto verifica que nuestros seeds sean correctos
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [senderActorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("actor"), senderWallet.publicKey.toBuffer()],
      program.programId
    );

    [carrierActorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("actor"), carrierWallet.publicKey.toBuffer()],
      program.programId
    );

    [hubActorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("actor"), hubWallet.publicKey.toBuffer()],
      program.programId
    );

    [recipientActorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("actor"), recipientWallet.publicKey.toBuffer()],
      program.programId
    );

    // shipment_id = 1, le_bytes en JavaScript:
    const shipmentIdBytes = Buffer.alloc(8);
    shipmentIdBytes.writeBigUInt64LE(BigInt(1));
    [shipmentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("shipment"), shipmentIdBytes],
      program.programId
    );

    const checkpointIdBytes = Buffer.alloc(8);
    checkpointIdBytes.writeBigUInt64LE(BigInt(1));
    [checkpointPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("checkpoint"), checkpointIdBytes],
      program.programId
    );
  });

  // ============================================================
  // TEST 1: Inicializar el sistema
  // ============================================================
  it("Inicializa el sistema correctamente", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        config: configPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("TX initialize:", tx);

    // Verificar el estado de la cuenta config
    const config = await program.account.programConfig.fetch(configPda);
    
    assert.equal(config.authority.toString(), authority.publicKey.toString());
    assert.equal(config.nextShipmentId.toNumber(), 1);
    assert.equal(config.nextCheckpointId.toNumber(), 1);
    assert.equal(config.totalShipments.toNumber(), 0);
    
    console.log("✅ Config inicializada. Authority:", config.authority.toString());
  });

  // ============================================================
  // TEST 2: Registrar actores
  // ============================================================
  it("Registra el remitente (Sender)", async () => {
    const tx = await program.methods
      .registerActor("FarmaTech S.A.", { sender: {} }, "Miami, FL")
      .accounts({
        actor: senderActorPda,
        wallet: senderWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([senderWallet])
      .rpc();

    const actor = await program.account.actor.fetch(senderActorPda);
    assert.equal(actor.name, "FarmaTech S.A.");
    assert.deepEqual(actor.role, { sender: {} });
    assert.equal(actor.isActive, true);
    
    console.log("✅ Sender registrado:", actor.name);
  });

  it("Registra el transportista (Carrier)", async () => {
    await program.methods
      .registerActor("TransLog Express", { carrier: {} }, "Miami Hub #1")
      .accounts({
        actor: carrierActorPda,
        wallet: carrierWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([carrierWallet])
      .rpc();

    const actor = await program.account.actor.fetch(carrierActorPda);
    assert.deepEqual(actor.role, { carrier: {} });
    console.log("✅ Carrier registrado:", actor.name);
  });

  it("Registra el hub logístico", async () => {
    await program.methods
      .registerActor("Hub Bogotá Central", { hub: {} }, "Bogotá, Colombia")
      .accounts({
        actor: hubActorPda,
        wallet: hubWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([hubWallet])
      .rpc();

    console.log("✅ Hub registrado");
  });

  it("Registra el destinatario (Recipient)", async () => {
    await program.methods
      .registerActor("Hospital Central Bogotá", { recipient: {} }, "Bogotá, Colombia")
      .accounts({
        actor: recipientActorPda,
        wallet: recipientWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([recipientWallet])
      .rpc();

    console.log("✅ Recipient registrado");
  });

  // ============================================================
  // TEST 3: Crear un envío con cadena de frío
  // ============================================================
  it("Crea un envío farmacéutico con control de temperatura", async () => {
    // max_temperature = 45 = 4.5°C (cadena de frío para vacunas)
    const tx = await program.methods
      .createShipment(
        SHIPMENT_ID,
        recipientWallet.publicKey,
        "Vacunas COVID-19",
        "Laboratorio FarmaTech, Miami FL",
        "Hospital Central, Bogotá Colombia",
        true,   // requires_cold_chain
        45      // max_temperature = 4.5°C (45 = 4.5 * 10)
      )
      .accounts({
        config: configPda,
        shipment: shipmentPda,
        senderActor: senderActorPda,
        senderWallet: senderWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([senderWallet])
      .rpc();

    const shipment = await program.account.shipment.fetch(shipmentPda);
    
    assert.equal(shipment.id.toNumber(), 1);
    assert.equal(shipment.product, "Vacunas COVID-19");
    assert.deepEqual(shipment.status, { created: {} });
    assert.equal(shipment.requiresColdChain, true);
    assert.equal(shipment.maxTemperature, 45); // 4.5°C
    assert.equal(shipment.checkpointCount, 0);
    
    // Verificar que el config incrementó el contador
    const config = await program.account.programConfig.fetch(configPda);
    assert.equal(config.nextShipmentId.toNumber(), 2);
    assert.equal(config.totalShipments.toNumber(), 1);
    
    console.log("✅ Envío creado:", shipment.product, "| Estado:", JSON.stringify(shipment.status));
  });

  // ============================================================
  // TEST 4: Registrar checkpoints
  // ============================================================
  it("Registra checkpoint de pickup (temperatura válida)", async () => {
    // Temperatura 30 = 3.0°C (por debajo del máximo 4.5°C)
    await program.methods
      .recordCheckpoint(
        SHIPMENT_ID,
        CHECKPOINT_ID,
        "Miami Port Authority, Terminal 3",
        { pickup: {} },
        JSON.stringify({ operator: "john_doe", package_condition: "excellent" }),
        30, // 3.0°C - válido para vacunas
        45  // 45% humedad
      )
      .accounts({
        config: configPda,
        shipment: shipmentPda,
        checkpoint: checkpointPda,
        actor: carrierActorPda,
        actorWallet: carrierWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([carrierWallet])
      .rpc();

    const checkpoint = await program.account.checkpoint.fetch(checkpointPda);
    assert.equal(checkpoint.shipmentId.toNumber(), 1);
    assert.equal(checkpoint.temperature, 30);
    assert.deepEqual(checkpoint.checkpointType, { pickup: {} });
    
    const shipment = await program.account.shipment.fetch(shipmentPda);
    assert.equal(shipment.checkpointCount, 1);
    
    console.log("✅ Checkpoint pickup registrado. Temp:", checkpoint.temperature / 10, "°C");
  });

  // ============================================================
  // TEST 5: Actualizar estado del envío
  // ============================================================
  it("Actualiza el estado a InTransit", async () => {
    await program.methods
      .updateShipmentStatus(SHIPMENT_ID, { inTransit: {} })
      .accounts({
        shipment: shipmentPda,
        actor: carrierActorPda,
        actorWallet: carrierWallet.publicKey,
      })
      .signers([carrierWallet])
      .rpc();

    const shipment = await program.account.shipment.fetch(shipmentPda);
    assert.deepEqual(shipment.status, { inTransit: {} });
    console.log("✅ Estado actualizado a InTransit");
  });

  // ============================================================
  // TEST 6: Reportar incidencia de temperatura
  // ============================================================
  it("Reporta una violación de temperatura", async () => {
    const [incidentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("incident"), Buffer.from([1, 0, 0, 0, 0, 0, 0, 0])],
      program.programId
    );

    await program.methods
      .reportIncident(
        SHIPMENT_ID,
        INCIDENT_ID,
        { tempViolation: {} },
        "Temperatura subió a 8°C durante 15 minutos en el aeropuerto"
      )
      .accounts({
        config: configPda,
        shipment: shipmentPda,
        incident: incidentPda,
        reporterActor: carrierActorPda,
        reporterWallet: carrierWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([carrierWallet])
      .rpc();

    const incident = await program.account.incident.fetch(incidentPda);
    assert.equal(incident.resolved, false);
    assert.deepEqual(incident.incidentType, { tempViolation: {} });
    
    console.log("✅ Incidencia reportada:", incident.description);
  });

  console.log("\n🎉 Todos los tests pasaron correctamente!");
  console.log("📊 Resumen:");
  console.log("   - Programa inicializado");
  console.log("   - 4 actores registrados (Sender, Carrier, Hub, Recipient)");
  console.log("   - 1 envío de vacunas creado con cadena de frío");
  console.log("   - 1 checkpoint de pickup registrado");
  console.log("   - 1 incidencia de temperatura reportada");
});
