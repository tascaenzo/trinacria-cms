import mongoose, { type ConnectOptions } from "mongoose";
import {
  classProvider,
  CORE_TOKENS,
  createMongoDbAdapter,
  createToken,
  defineModule,
  EntityRegistry,
  factoryProvider,
  type Provider,
  valueProvider
} from "@trinacria-cms/kernel";

export interface CorePackMongoModuleOptions {
  uri: string;
  options?: ConnectOptions;
  allowStartupWithoutDb?: boolean;
}

export const CORE_PACK_MONGO_OPTIONS_TOKEN =
  createToken<CorePackMongoModuleOptions>("CORE_PACK_MONGO_OPTIONS");
export const CORE_PACK_MONGO_CONNECTION_TOKEN = createToken<CorePackMongoConnection>(
  "CORE_PACK_MONGO_CONNECTION"
);

/**
 * Manages mongoose connection lifecycle for core-pack infrastructure.
 */
class CorePackMongoConnection {
  constructor(private config: CorePackMongoModuleOptions) {}

  async onInit(): Promise<void> {
    try {
      await mongoose.connect(this.config.uri, this.config.options);
    } catch (error: unknown) {
      if (!this.config.allowStartupWithoutDb) {
        throw error;
      }
      console.warn(
        "[core-pack] MongoDB unavailable at startup; continuing in installation mode:",
        error instanceof Error ? error.message : error
      );
    }
  }

  async onDestroy(): Promise<void> {
    await mongoose.disconnect();
  }

  get connection() {
    return mongoose.connection as unknown as Parameters<
      typeof createMongoDbAdapter
    >[0]["connection"];
  }

  async reconnect(uri: string, options?: ConnectOptions): Promise<void> {
    await mongoose.disconnect();
    this.config = { uri, options: options ?? this.config.options };
    await mongoose.connect(this.config.uri, this.config.options);
  }

  get configUri(): string {
    return this.config.uri;
  }
}

/**
 * Factory for an infrastructure module that wires MongoDbAdapter + EntityRegistry.
 */
export function createCorePackMongoModule(options: CorePackMongoModuleOptions) {
  return defineModule({
    name: "CorePackMongoModule",
    providers: [
      valueProvider(CORE_PACK_MONGO_OPTIONS_TOKEN, options),
      classProvider(CORE_PACK_MONGO_CONNECTION_TOKEN, CorePackMongoConnection, [
        CORE_PACK_MONGO_OPTIONS_TOKEN
      ]),
      factoryProvider(CORE_TOKENS.ENTITY_REGISTRY, () => new EntityRegistry(), []),
      factoryProvider(
        CORE_TOKENS.DB_ADAPTER,
        (entityRegistry, connectionManager) =>
          createMongoDbAdapter({
            connection: (connectionManager as CorePackMongoConnection).connection,
            entityRegistry: entityRegistry as EntityRegistry
          }),
        [CORE_TOKENS.ENTITY_REGISTRY, CORE_PACK_MONGO_CONNECTION_TOKEN]
      )
    ],
    exports: [CORE_TOKENS.ENTITY_REGISTRY, CORE_TOKENS.DB_ADAPTER]
  });
}

/**
 * Factory for global providers that wire MongoDbAdapter + EntityRegistry.
 * Useful when plugin modules are loaded at runtime and need globally visible DB tokens.
 */
export function createCorePackMongoGlobalProviders(
  options: CorePackMongoModuleOptions
): readonly Provider[] {
  return [
    valueProvider(CORE_PACK_MONGO_OPTIONS_TOKEN, options),
    classProvider(CORE_PACK_MONGO_CONNECTION_TOKEN, CorePackMongoConnection, [
      CORE_PACK_MONGO_OPTIONS_TOKEN
    ]),
    factoryProvider(CORE_TOKENS.ENTITY_REGISTRY, () => new EntityRegistry(), []),
    factoryProvider(
      CORE_TOKENS.DB_ADAPTER,
      (entityRegistry, connectionManager) =>
        createMongoDbAdapter({
          connection: (connectionManager as CorePackMongoConnection).connection,
          entityRegistry: entityRegistry as EntityRegistry
        }),
      [CORE_TOKENS.ENTITY_REGISTRY, CORE_PACK_MONGO_CONNECTION_TOKEN]
    )
  ] as const;
}
