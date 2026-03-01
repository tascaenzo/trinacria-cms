export interface Lifecycle {
  boot(): Promise<void>;
  shutdown(): Promise<void>;
}
