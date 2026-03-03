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
  valueProvider,
} from "@trinacria-cms/kernel";

export interface CorePackMongoModuleOptions {
  uri: string;
  options?: ConnectOptions;
}

const CORE_PACK_MONGO_OPTIONS_TOKEN =
  createToken<CorePackMongoModuleOptions>("CORE_PACK_MONGO_OPTIONS");
const CORE_PACK_MONGO_CONNECTION_TOKEN = createToken<CorePackMongoConnection>(
  "CORE_PACK_MONGO_CONNECTION",
);

/**
 * Manages mongoose connection lifecycle for core-pack infrastructure.
 */
class CorePackMongoConnection {
  constructor(private readonly config: CorePackMongoModuleOptions) {}

  async onInit(): Promise<void> {
    await mongoose.connect(this.config.uri, this.config.options);
  }

  async onDestroy(): Promise<void> {
    await mongoose.disconnect();
  }

  get connection() {
    return mongoose.connection as unknown as Parameters<
      typeof createMongoDbAdapter
    >[0]["connection"];
  }
}

/**
 * Factory for an infrastructure module that wires MongoDbAdapter + EntityRegistry.
 */
export function createCorePackMongoModule(
  options: CorePackMongoModuleOptions,
) {
  return defineModule({
    name: "CorePackMongoModule",
    providers: [
      valueProvider(CORE_PACK_MONGO_OPTIONS_TOKEN, options),
      classProvider(CORE_PACK_MONGO_CONNECTION_TOKEN, CorePackMongoConnection, [
        CORE_PACK_MONGO_OPTIONS_TOKEN,
      ]),
      factoryProvider(CORE_TOKENS.ENTITY_REGISTRY, () => new EntityRegistry(), []),
      factoryProvider(
        CORE_TOKENS.DB_ADAPTER,
        (entityRegistry, connectionManager) =>
          createMongoDbAdapter({
            connection: (connectionManager as CorePackMongoConnection).connection,
            entityRegistry: entityRegistry as EntityRegistry,
          }),
        [CORE_TOKENS.ENTITY_REGISTRY, CORE_PACK_MONGO_CONNECTION_TOKEN],
      ),
    ],
    exports: [CORE_TOKENS.ENTITY_REGISTRY, CORE_TOKENS.DB_ADAPTER],
  });
}

/**
 * Factory for global providers that wire MongoDbAdapter + EntityRegistry.
 * Useful when plugin modules are loaded at runtime and need globally visible DB tokens.
 */
export function createCorePackMongoGlobalProviders(
  options: CorePackMongoModuleOptions,
): readonly Provider[] {
  return [
    valueProvider(CORE_PACK_MONGO_OPTIONS_TOKEN, options),
    classProvider(CORE_PACK_MONGO_CONNECTION_TOKEN, CorePackMongoConnection, [
      CORE_PACK_MONGO_OPTIONS_TOKEN,
    ]),
    factoryProvider(CORE_TOKENS.ENTITY_REGISTRY, () => new EntityRegistry(), []),
    factoryProvider(
      CORE_TOKENS.DB_ADAPTER,
      (entityRegistry, connectionManager) =>
        createMongoDbAdapter({
          connection: (connectionManager as CorePackMongoConnection).connection,
          entityRegistry: entityRegistry as EntityRegistry,
        }),
      [CORE_TOKENS.ENTITY_REGISTRY, CORE_PACK_MONGO_CONNECTION_TOKEN],
    ),
  ] as const;
}
