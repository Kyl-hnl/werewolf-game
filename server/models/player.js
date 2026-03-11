class Player {
  constructor({ id, name, socketId }) {
    this.id = id;
    this.name = name;
    this.role = null;
    this.alive = true;
    this.mayor = false;
    this.lover = null;
    this.protected = false;
    this.poisoned = false;
    this.vote = null;
    this.socketId = socketId;
  }
}

module.exports = { Player };
