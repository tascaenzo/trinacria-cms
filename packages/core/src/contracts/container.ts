export type Token<_T = unknown> = string | symbol;

export interface Container {
  register<T>(token: Token<T>, value: T): void;
  resolve<T>(token: Token<T>): T;
  has(token: Token): boolean;
  createScope(name: string): Container;
}
