import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingCart, Mail, ThumbsUp, Coins } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { statusBadgeVariant } from "@/components/admin/status";

const Stat = ({ icon: Icon, label, value, sub }: any) => (
  <Card>
    <CardContent className="p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {sub && <div className="text-xs text-muted-foreground/70">{sub}</div>}
      </div>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "overview"], queryFn: adminApi.overview });

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-heading font-bold">Dashboard</h1>

      {isLoading || !data ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat icon={ShoppingCart} label="Orders" value={data.orders.total} />
            <Stat
              icon={Coins}
              label="Net revenue"
              value={`${data.orders.netRevenueTnd} TND`}
              sub={`gross ${data.orders.grossRevenueTnd} TND`}
            />
            <Stat
              icon={Package}
              label="Products"
              value={data.products.total}
              sub={`${data.products.published} published`}
            />
            <Stat
              icon={Mail}
              label="Subscribers"
              value={data.subscribers.total}
              sub={`${data.subscribers.active} active`}
            />
            <Stat icon={ThumbsUp} label="Votes" value={data.votes.total} />
          </div>

          {/* Orders by status */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.orders.byStatus).map(([status, count]) => (
              <Badge key={status} variant={statusBadgeVariant(status)}>
                {status}: {count}
              </Badge>
            ))}
          </div>

          {/* Recent orders */}
          <Card>
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border font-semibold">Recent orders</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Governorate</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                      <TableCell>{o.fullName}</TableCell>
                      <TableCell>{o.governorate?.name}</TableCell>
                      <TableCell>{o.total} TND</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(o.status)}>{o.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.recentOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No orders yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;
