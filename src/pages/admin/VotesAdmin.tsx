import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const VotesAdmin = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "votes"],
    queryFn: () => adminApi.listVotes({ page: 1 }),
  });

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-heading font-bold">Votes</h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Edition</TableHead>
                <TableHead>Cast at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {data?.data.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.product?.name}</TableCell>
                  <TableCell>
                    Week {v.edition?.weekNumber}, {v.edition?.year}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(v.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {data && data.data.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No votes recorded yet
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

export default VotesAdmin;
