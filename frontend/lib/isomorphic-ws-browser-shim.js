// Browser build shim for the 'isomorphic-ws' package. midnight-js-indexer-public-data-provider
// imports a named `WebSocket` export from it unconditionally (as a Node
// fallback for callers that don't supply their own WebSocket constructor);
// isomorphic-ws's own browser field only exports a default, which breaks
// webpack's static import resolution in the client bundle. The browser
// already has a native, global WebSocket -- this just re-exports it in
// both forms. See next.config.mjs's webpack() for the alias that points
// 'isomorphic-ws' here for client builds only.
export const WebSocket = globalThis.WebSocket;
export default globalThis.WebSocket;
