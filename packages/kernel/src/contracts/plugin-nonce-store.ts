/** Shared atomic anti-replay store. true only for the first insertion of a nonce hash. */
export interface PluginNonceStore {
  readonly shared: boolean;
  consume(pluginId: string, nonceHash: string, expiresAt: Date): Promise<boolean>;
}
