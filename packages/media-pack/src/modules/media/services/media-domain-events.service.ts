export interface MediaEventPublisher {
  emit(eventName: string, payload: unknown): Promise<void>;
}

/** Keeps media domain services independent from runtime lifecycle globals. */
export class MediaDomainEventsService {
  private publisher?: MediaEventPublisher;

  setPublisher(publisher: MediaEventPublisher): void {
    this.publisher = publisher;
  }

  async emit(
    eventName: "asset-ready" | "asset-deleted" | "asset-access-changed",
    payload: unknown
  ) {
    await this.publisher?.emit(eventName, payload);
  }
}
