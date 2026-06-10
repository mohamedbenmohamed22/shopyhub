import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, AdminOrder, OrderStatus } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { statusBadgeVariant, NEXT_STATUSES } from "@/components/admin/status";

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const OrdersAdmin = () => {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [phone, setPhone] = useState("");
  const [selected, setSelected] = useState<AdminOrder | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", status, phone],
    queryFn: () => adminApi.listOrders({ status: status === "all" ? undefined : status, phone }),
  });

  const mutate = useMutation({
    mutationFn: ({ id, to }: { id: string; to: OrderStatus }) => adminApi.updateOrderStatus(id, to),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
      toast.success("Order status updated");
      setSelected(null);
    },
    onError: (e: Error) => toast.error("Update failed", { description: e.message }),
  });

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-heading font-bold">Orders</h1>

      <div className="flex flex-wrap gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search phone…"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-56"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Governorate</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {data?.data.map((o) => (
                <TableRow key={o.id} className="cursor-pointer" onClick={() => setSelected(o)}>
                  <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                  <TableCell>{o.fullName}</TableCell>
                  <TableCell className="font-mono text-xs">{o.phone}</TableCell>
                  <TableCell>{o.governorate?.name}</TableCell>
                  <TableCell>{o.total} TND</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(o.status)}>{o.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {data && data.data.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No orders match
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order detail + status actions */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono">{selected.orderNumber}</SheetTitle>
              </SheetHeader>
              <div className="space-y-3 text-sm">
                <Row label="Customer" value={selected.fullName} />
                <Row label="Phone" value={selected.phone} />
                <Row label="Governorate" value={selected.governorate?.name} />
                <Row label="Address" value={selected.address} />
                <div>
                  <div className="text-muted-foreground mb-1">Items</div>
                  {selected.items.map((it, i) => (
                    <div key={i} className="flex justify-between">
                      <span>
                        {it.quantity} × {it.productName}
                      </span>
                      <span>{it.lineTotal} TND</span>
                    </div>
                  ))}
                </div>
                <Row label="Subtotal" value={`${selected.subtotal} TND`} />
                <Row label="Delivery" value={`${selected.deliveryFee} TND`} />
                <Row label="Total" value={`${selected.total} TND`} />
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={statusBadgeVariant(selected.status)}>{selected.status}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {NEXT_STATUSES[selected.status]?.length ? (
                  NEXT_STATUSES[selected.status].map((to) => (
                    <Button
                      key={to}
                      size="sm"
                      variant={to === "cancelled" ? "destructive" : "gold"}
                      disabled={mutate.isPending}
                      onClick={() => mutate.mutate({ id: selected.id, to: to as OrderStatus })}
                    >
                      Mark {to}
                    </Button>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No further actions ({selected.status}).</span>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right">{value}</span>
  </div>
);

export default OrdersAdmin;
