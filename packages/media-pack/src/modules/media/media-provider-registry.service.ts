import type { MediaStorageProvider } from "./media-storage.types.js";

/**
 * In-memory registry for media-pack storage adapters. The registry owns adapter
 * selection only; limits, ACL and asset state remain media domain concerns.
 */
export class MediaProviderRegistry {
  private readonly providers = new Map<string, MediaStorageProvider>();

  register(provider: MediaStorageProvider): void {
    const providerId = provider.id.trim().toLowerCase();
    if (!providerId) {
      throw new Error("Media storage provider id is required");
    }
    if (providerId !== provider.id) {
      throw new Error(`Media storage provider id "${provider.id}" must be lowercase and trimmed`);
    }
    if (this.providers.has(providerId)) {
      throw new Error(`Media storage provider "${providerId}" is already registered`);
    }
    this.providers.set(providerId, provider);
  }

  replace(provider: MediaStorageProvider): void {
    const providerId = provider.id.trim().toLowerCase();
    if (!providerId || providerId !== provider.id) {
      throw new Error(`Media storage provider id "${provider.id}" must be lowercase and trimmed`);
    }
    this.providers.set(providerId, provider);
  }

  get(providerId: string): MediaStorageProvider {
    const provider = this.providers.get(providerId.trim().toLowerCase());
    if (!provider) {
      throw new Error(`Media storage provider "${providerId}" is not registered`);
    }
    return provider;
  }

  list(): readonly MediaStorageProvider[] {
    return Array.from(this.providers.values());
  }
}
