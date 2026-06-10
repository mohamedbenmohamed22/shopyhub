import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { adminApi, AdminTag } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const PRESET_COLORS = ["#22c55e", "#f59e0b", "#6366f1", "#0ea5e9", "#e11d48", "#a855f7", "#14b8a6"];

const TagPill = ({ name, color }: { name: string; color?: string | null }) => (
  <span
    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
    style={{ backgroundColor: `${color ?? "#888"}22`, color: color ?? "#888" }}
  >
    {name}
  </span>
);

const TagsAdmin = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTag | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["admin", "tags"],
    queryFn: adminApi.listTags,
  });

  const save = useMutation({
    mutationFn: () =>
      editing
        ? adminApi.updateTag(editing.id, { name, color })
        : adminApi.createTag({ name, color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "tags"] });
      toast.success(editing ? "Tag updated" : "Tag created");
      setOpen(false);
    },
    onError: (e: Error) => toast.error("Save failed", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteTag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "tags"] });
      toast.success("Tag deleted");
    },
    onError: (e: Error) => toast.error("Delete failed", { description: e.message }),
  });

  const openCreate = () => {
    setEditing(null);
    setName("");
    setColor(PRESET_COLORS[0]);
    setOpen(true);
  };
  const openEdit = (t: AdminTag) => {
    setEditing(t);
    setName(t.name);
    setColor(t.color ?? PRESET_COLORS[0]);
    setOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold">Tags</h1>
        <Button variant="gold" onClick={openCreate}>
          <Plus className="w-4 h-4" /> New tag
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead>Color</TableHead>
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
              {tags.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <TagPill name={t.name} color={t.color} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{t.color ?? "—"}</TableCell>
                  <TableCell>{t._count?.products ?? 0}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete tag "${t.name}"?`)) remove.mutate(t.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {tags.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No tags yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Editor */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit tag" : "New tag"}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-5 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Trending" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
                <Input className="w-28 font-mono text-xs" value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
              <div className="pt-1">
                <TagPill name={name || "Preview"} color={color} />
              </div>
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

export default TagsAdmin;
