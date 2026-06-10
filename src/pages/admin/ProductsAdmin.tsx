import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { adminApi, AdminProduct } from "@/lib/admin-api";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ProductWizard } from "@/components/admin/ProductWizard";

const ProductsAdmin = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products", search, categoryFilter, statusFilter],
    queryFn: () =>
      adminApi.listProducts({
        page: 1,
        search: search.trim() || undefined,
        categoryId: categoryFilter === "all" ? undefined : categoryFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: adminApi.listCategories,
  });

  const assign = useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string }) =>
      adminApi.updateProduct(id, { categoryId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Category assigned");
    },
    onError: (e: Error) => toast.error("Assign failed", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["past-winners"] });
      toast.success("Product archived");
    },
    onError: (e: Error) => toast.error("Delete failed", { description: e.message }),
  });

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (p: AdminProduct) => {
    setEditing(p);
    setOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold">Products</h1>
        <Button variant="gold" onClick={openCreate}>
          <Plus className="w-4 h-4" /> New product
        </Button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search products by name or tagline…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["draft", "published", "archived"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Votes</TableHead>
                <TableHead>Winner</TableHead>
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
              {data?.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium">{p.name}</span>
                      {p.category && (
                        <Badge variant="gold" className="text-[10px] px-1.5 py-0">
                          {p.category.name}
                        </Badge>
                      )}
                      {p.tags?.map((t) => (
                        <span
                          key={t.id}
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${t.color ?? "#888"}22`, color: t.color ?? "#888" }}
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={p.category?.id ?? ""}
                      onValueChange={(categoryId) => assign.mutate({ id: p.id, categoryId })}
                    >
                      <SelectTrigger className="h-8 w-44 text-xs">
                        <SelectValue placeholder="Assign category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                            {c.isDefault ? " (default)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{p.price ? `${p.price} TND` : "—"}</TableCell>
                  <TableCell>{p.votesCount}</TableCell>
                  <TableCell>{p.isCurrentWinner ? <Badge variant="winner">Winner</Badge> : ""}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "published" ? "gold" : "week"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Archive "${p.name}"?`)) remove.mutate(p.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data && data.data.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No products match your search/filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProductWizard
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={() => setOpen(false)}
      />
    </div>
  );
};

export default ProductsAdmin;
