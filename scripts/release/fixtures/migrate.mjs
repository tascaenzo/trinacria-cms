export async function run(context) {
  const items = context.repository("items");
  for (const item of await items.findMany({
    filter: { schemaVersion: 1 },
    sort: { id: "asc" },
    limit: 500
  })) {
    await items.updateOne(
      { filter: { id: item.id, schemaVersion: 1 } },
      { schemaVersion: 2, status: "ready", oldLabel: undefined }
    );
  }
}
