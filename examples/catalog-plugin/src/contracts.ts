import { s } from "@trinacria-cms/kernel";
export const ITEM_INPUT = s.object(
  {
    name: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    priceCents: s.number({ int: true, min: 0, max: 100000000 })
  },
  { strict: true }
);
export const ITEM = s.object(
  {
    id: s.string(),
    name: s.string(),
    priceCents: s.number(),
    version: s.number({ int: true, min: 1 }),
    createdAt: s.dateTimeString()
  },
  { strict: true }
);
export interface CatalogItem {
  id: string;
  name: string;
  priceCents: number;
  version: number;
  createdAt: string;
}
export interface CatalogItemInput {
  name: string;
  priceCents: number;
}
