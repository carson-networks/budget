import type { Category as WireCategory } from "../network/types.js";
import { optionalDateFromTimestamp } from "./timestamp.js";

export enum CategoryKind {
  Unspecified = 0,
  Income = 1,
  Expense = 2,
}

export type Category = {
  id: string;
  name: string;
  isParent: boolean;
  parentCategoryId?: string;
  isDisabled: boolean;
  categoryKind: CategoryKind;
  createdAt?: Date;
};

export function mapCategory(wire: WireCategory): Category {
  return {
    id: wire.id,
    name: wire.name,
    isParent: wire.isParent,
    parentCategoryId: wire.parentCategoryId,
    isDisabled: wire.isDisabled,
    categoryKind: wire.categoryType as unknown as CategoryKind,
    createdAt: optionalDateFromTimestamp(wire.createdAt),
  };
}
