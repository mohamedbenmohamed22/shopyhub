import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SubscribersAdmin = () => {
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "subscribers", status],
    queryFn: () => adminApi.listSubscribers({ status: status === "all" ? undefined : status }),
  });

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-heading font-bold">Subscribers</h1>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="subscribed">Subscribed</SelectItem>
          <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
        </SelectContent>
      </Select>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confirmed</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {data?.data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "subscribed" ? "gold" : "week"}>{s.status}</Badge>
                  </TableCell>
                  <TableCell>{s.confirmed ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {data && data.data.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No subscribers
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {data && <p className="text-sm text-muted-foreground">{data.meta.total} total</p>}
    </div>
  );
};

export default SubscribersAdmin;
