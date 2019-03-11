const EventEmitter = require('events');

const { IPC_EVENT } = require('../constants');

class EmitterHelper {
  constructor() {
    this.emitter = new EventEmitter();
  }

  onServerStartError(error) {
    this.emitter.emit(IPC_EVENT.SERVER_START_ERROR, error);
  }

  onRunebaseError(error) {
    this.emitter.emit(IPC_EVENT.RUNEBASED_ERROR, error);
  }

  onRunebaseKilled() {
    this.emitter.emit(IPC_EVENT.RUNEBASED_KILLED);
  }

  onWalletEncrypted() {
    this.emitter.emit(IPC_EVENT.WALLET_ENCRYPTED);
  }

  onBackupWallet() {
    this.emitter.emit(IPC_EVENT.WALLET_BACKUP);
  }

  onImportWallet() {
    this.emitter.emit(IPC_EVENT.WALLET_IMPORT);
  }
}

module.exports = new EmitterHelper();
