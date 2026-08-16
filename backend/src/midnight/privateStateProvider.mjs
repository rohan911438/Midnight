// Minimal in-memory PrivateStateProvider. This contract's witnesses are
// stateless (each closes over data supplied at call time -- see
// contractClient.mjs), so there's no real private state to persist between
// circuit calls; midnight-js-contracts still requires something satisfying
// the full PrivateStateProvider interface, though. Using our own in-memory
// implementation avoids pulling in the LevelDB + password-encryption
// machinery of @midnight-ntwrk/midnight-js-level-private-state-provider,
// which is built for a persistent end-user wallet, not a short-lived demo
// backend process.
export function createInMemoryPrivateStateProvider() {
  const states = new Map();
  const signingKeys = new Map();

  return {
    setContractAddress() {},
    async set(privateStateId, state) {
      states.set(privateStateId, state);
    },
    async get(privateStateId) {
      return states.has(privateStateId) ? states.get(privateStateId) : null;
    },
    async remove(privateStateId) {
      states.delete(privateStateId);
    },
    async clear() {
      states.clear();
    },
    async setSigningKey(address, signingKey) {
      signingKeys.set(address, signingKey);
    },
    async getSigningKey(address) {
      return signingKeys.has(address) ? signingKeys.get(address) : null;
    },
    async removeSigningKey(address) {
      signingKeys.delete(address);
    },
    async clearSigningKeys() {
      signingKeys.clear();
    },
    async exportPrivateStates() {
      throw new Error('exportPrivateStates is not supported by the in-memory private state provider');
    },
    async importPrivateStates() {
      throw new Error('importPrivateStates is not supported by the in-memory private state provider');
    },
    async exportSigningKeys() {
      throw new Error('exportSigningKeys is not supported by the in-memory private state provider');
    },
    async importSigningKeys() {
      throw new Error('importSigningKeys is not supported by the in-memory private state provider');
    },
  };
}
