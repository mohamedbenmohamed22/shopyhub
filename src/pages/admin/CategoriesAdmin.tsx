import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, X } from "lucide-react";
import { adminApi, AdminCategory, PropertyDef } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SheetFooter,
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

const CategoriesAdmin = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [name, setName] = useState("");
  const [schema, setSchema] = useState<PropertyDef[]>([]);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: adminApi.listCategories,
  });

  const save = useMutation({
    mutationFn: () => {
      const clean = schema.filter((p) => p.key.trim());
      return editing
        ? adminApi.updateCategory(editing.id, { name, propertySchema: clean })
        : adminApi.createCategory({ name, propertySchema: clean });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success(editing ? "Category updated" : "Category created");
      setOpen(false);
    },
    onError: (e: Error) => toast.error("Save failed", { description: e.message }),
  });

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSchema([]);
    setOpen(true);
  };
  const openEdit = (c: AdminCategory) => {
    setEditing(c);
    setName(c.name);
    setSchema(c.propertySchema ?? []);
    setOpen(true);
  };

  const addProp = () => setSchema((s) => [...s, { key: "", label: "", type: "text" }]);
  const setProp = (i: number, patch: Partial<PropertyDef>) =>
    setSchema((s) => s.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const removeProp = (i: number) => setSchema((s) => s.filter((_, idx) => idx !== i));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold">Categories</h1>
        <Button variant="gold" onClick={openCreate}>
          <Plus className="w-4 h-4" /> New category
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead>Products</TableHead>
                <TableHead></TableHead>
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
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.name} {c.isDefault && <Badge variant="week">default</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.propertySchema?.length
                      ? c.propertySchema.map((p) => p.label).join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell>{c._count?.products ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Editor */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit category" : "New category"}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-5 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hardware" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Property schema</Label>
                <Button type="button" variant="outline" size="sm" onClick={addProp}>
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Properties every product in this category inherits. Products can add their own on top.
              </p>
              {schema.length === 0 && <p className="text-xs text-muted-foreground">No properties yet.</p>}
              {schema.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="h-8 text-xs"
                    placeholder="key"
                    value={p.key}
                    onChange={(e) => setProp(i, { key: e.target.value })}
                  />
                  <Input
                    className="h-8 text-xs"
                    placeholder="Label"
                    value={p.label}
                    onChange={(e) => setProp(i, { label: e.target.value })}
                  />
                  <Select value={p.type} onValueChange={(v) => setProp(i, { type: v as PropertyDef["type"] })}>
                    <SelectTrigger className="h-8 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["text", "number", "boolean"].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeProp(i)}>
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <SheetFooter className="mt-auto">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" disabled={save.isPending || name.trim().length < 2} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CategoriesAdmin;
