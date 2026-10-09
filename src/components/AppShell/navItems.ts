import type { TablerIcon } from "@tabler/icons-react";
import {
  IconBuildingBank,
  IconCategory,
  IconHome,
  IconLayoutGrid,
  IconReceipt,
} from "@tabler/icons-react";

export type NavItem = {
  path: string;
  label: string;
  icon: TablerIcon;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { path: "/", label: "Home", icon: IconHome },
  { path: "/budget", label: "Budget", icon: IconLayoutGrid },
  { path: "/transactions", label: "Transactions", icon: IconReceipt },
  { path: "/accounts", label: "Accounts", icon: IconBuildingBank },
  { path: "/categories", label: "Categories", icon: IconCategory },
];
