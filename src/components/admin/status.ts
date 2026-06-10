type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "gold" | "winner" | "week";

/** Map an order status to a Badge variant. */
export function statusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "pending":
      return "secondary";
    case "confirmed":
      return "gold";
    case "shipped":
      return "week";
    case "delivered":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

/** Legal next statuses for the COD order lifecycle (mirrors the backend). */
export const NEXT_STATUSES: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};
