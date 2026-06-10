import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Upload, X, Plus } from "lucide-react";
import { adminApi, AdminProduct, PropertyDef } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";

type PropRow = { key: string; label: string; type: PropertyDef["type"]; value: any; inherited: boolean };

const STEPS = ["Basics", "Category & properties", "Media", "Details"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AdminProduct | null;
  onSaved: () => void;
}

export function ProductWizard({ open, onOpenChange, editing, onSaved }: Props) {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: adminApi.listCategories,
  });
  const { data: tags = [] } = useQuery({
    queryKey: ["admin", "tags"],
    queryFn: adminApi.listTags,
  });

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [props, setProps] = useState<PropRow[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [weekNumber, setWeekNumber] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("published");
  const [isCurrentWinner, setIsCurrentWinner] = useState(false);
  const [uploading, setUploading] = useState(false);

  const coverRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // (Re)initialise whenever the panel opens.
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setName(editing?.name ?? "");
    setTagline(editing?.tagline ?? "");
    setDescription(editing?.description ?? "");
    setCategoryId(editing?.category?.id ?? "");
    setTagIds(editing?.tags?.map((t) => t.id) ?? []);
    setImageUrl(editing?.imageUrl ?? "");
    setImages(editing?.images ?? []);
    setPrice(editing?.price ?? "");
    setWeekNumber(editing?.weekNumber != null ? String(editing.weekNumber) : "");
    setYear(editing?.year != null ? String(editing.year) : "");
    setStatus(editing?.status ?? "published");
    setIsCurrentWinner(editing?.isCurrentWinner ?? false);
    // props are rebuilt by the category effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  // Rebuild the property rows whenever the category (or its schema) changes.
  useEffect(() => {
    if (!open) return;
    const cat = categories.find((c) => c.id === categoryId);
    const schema = cat?.propertySchema ?? [];
    const sourceValues: Record<string, unknown> = editing?.properties ?? {};
    // keep values already typed in the wizard for matching keys
    const current = new Map(props.map((p) => [p.key, p.value]));

    const inherited: PropRow[] = schema.map((def) => ({
      key: def.key,
      label: def.label,
      type: def.type,
      value: current.get(def.key) ?? sourceValues[def.key] ?? (def.type === "boolean" ? false : ""),
      inherited: true,
    }));

    // custom = values present on the product that aren't in the schema
    const schemaKeys = new Set(schema.map((s) => s.key));
    const custom: PropRow[] = props
      .filter((p) => !p.inherited && p.key !== "")
      .concat(
        Object.entries(sourceValues)
          .filter(([k]) => !schemaKeys.has(k) && !props.some((p) => p.key === k))
          .map(([k, v]) => ({ key: k, label: k, type: "text" as const, value: v, inherited: false })),
      );

    setProps([...inherited, ...custom]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, categories, open]);

  const setPropValue = (idx: number, value: any) =>
    setProps((rows) => rows.map((r, i) => (i === idx ? { ...r, value } : r)));
  const setPropKey = (idx: number, key: string) =>
    setProps((rows) => rows.map((r, i) => (i === idx ? { ...r, key, label: key } : r)));
  const addCustomProp = () =>
    setProps((rows) => [...rows, { key: "", label: "", type: "text", value: "", inherited: false }]);
  const removeProp = (idx: number) => setProps((rows) => rows.filter((_, i) => i !== idx));

  const uploadCover = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await adminApi.uploadImage(file);
      setImageUrl(url);
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  };
  const addGallery = async (files: FileList) => {
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => adminApi.uploadImage(f).then((r) => r.url)));
      setImages((g) => [...g, ...urls]);
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const buildProperties = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const p of props) {
      if (!p.key) continue;
      out[p.key] = p.type === "number" ? (p.value === "" ? null : Number(p.value)) : p.value;
    }
    return out;
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name,
        tagline,
        description,
        imageUrl,
        images,
        properties: buildProperties(),
        categoryId,
        tagIds,
        price: price === "" ? undefined : Number(price),
        weekNumber: weekNumber === "" ? undefined : Number(weekNumber),
        year: year === "" ? undefined : Number(year),
        status,
        isCurrentWinner,
      };
      return editing ? adminApi.updateProduct(editing.id, body) : adminApi.createProduct(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["current-winner"] });
      qc.invalidateQueries({ queryKey: ["past-winners"] });
      toast.success(editing ? "Product updated" : "Product created");
      onSaved();
    },
    onError: (e: Error) => toast.error("Save failed", { description: e.message }),
  });

  // Per-step gating
  const canNext =
    (step === 0 && name.trim().length >= 2) ||
    (step === 1 && !!categoryId) ||
    (step === 2 && imageUrl.trim() !== "") ||
    step === 3;

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit product" : "New product"}</SheetTitle>
        </SheetHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-4">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                    ? "bg-primary/20 text-primary border border-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-border" />}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground -mt-2 mb-2">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>

        <div className="flex-1 space-y-4">
          {/* STEP 0 — Basics */}
          {step === 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Name *">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lumina AI" />
              </Field>
              <Field label="Tagline">
                <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
                </Field>
              </div>
            </div>
          )}

          {/* STEP 1 — Category & properties */}
          {step === 1 && (
            <>
              <Field label="Category *">
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category (required)" />
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
                {!categoryId && (
                  <p className="text-xs text-muted-foreground">A category is required to continue.</p>
                )}
              </Field>

              {categoryId && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Properties</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addCustomProp}>
                      <Plus className="w-3.5 h-3.5" /> Add property
                    </Button>
                  </div>
                  {props.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      This category defines no properties. Add custom ones to extend.
                    </p>
                  )}
                  <div className="grid sm:grid-cols-2 gap-3">
                  {props.map((p, idx) => (
                    <div key={idx} className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        {p.inherited ? (
                          <Label className="text-xs flex items-center gap-1">
                            {p.label}
                            <Badge variant="week" className="text-[9px] px-1.5 py-0">inherited</Badge>
                          </Label>
                        ) : (
                          <Input
                            className="h-8 text-xs"
                            placeholder="property key"
                            value={p.key}
                            onChange={(e) => setPropKey(idx, e.target.value)}
                          />
                        )}
                        {p.type === "boolean" ? (
                          <label className="flex items-center gap-2 text-sm h-9">
                            <input
                              type="checkbox"
                              checked={!!p.value}
                              onChange={(e) => setPropValue(idx, e.target.checked)}
                            />
                            {p.value ? "Yes" : "No"}
                          </label>
                        ) : (
                          <Input
                            type={p.type === "number" ? "number" : "text"}
                            value={p.value ?? ""}
                            onChange={(e) => setPropValue(idx, e.target.value)}
                            placeholder="value"
                          />
                        )}
                      </div>
                      {!p.inherited && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeProp(idx)}>
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  </div>
                </div>
              )}

              <Field label="Tags">
                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 && (
                    <span className="text-xs text-muted-foreground">No tags yet — create some under Tags.</span>
                  )}
                  {tags.map((t) => {
                    const active = tagIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setTagIds((cur) => (active ? cur.filter((x) => x !== t.id) : [...cur, t.id]))
                        }
                        className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                        style={
                          active
                            ? { backgroundColor: `${t.color ?? "#888"}22`, color: t.color ?? "#888", borderColor: t.color ?? "#888" }
                            : undefined
                        }
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </>
          )}

          {/* STEP 2 — Media */}
          {step === 2 && (
            <div className="grid sm:grid-cols-2 gap-6">
              <Field label="Cover image *">
                {imageUrl && (
                  <img src={imageUrl} alt="cover" className="w-full h-40 object-cover rounded-lg border border-border bg-muted" />
                )}
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://… or upload" />
                <input
                  ref={coverRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadCover(f);
                    e.target.value = "";
                  }}
                />
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => coverRef.current?.click()}>
                  <Upload className="w-4 h-4" /> {uploading ? "Uploading…" : "Upload from browser"}
                </Button>
              </Field>

              <Field label="Gallery">
                <div className="grid grid-cols-3 gap-2">
                  {images.map((url) => (
                    <div key={url} className="relative group">
                      <img src={url} alt="" className="w-full h-20 object-cover rounded-md border border-border bg-muted" />
                      <button
                        type="button"
                        onClick={() => setImages((g) => g.filter((u) => u !== url))}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {images.length === 0 && <span className="col-span-3 text-xs text-muted-foreground">No gallery images.</span>}
                </div>
                <input
                  ref={galleryRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) addGallery(e.target.files);
                    e.target.value = "";
                  }}
                />
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => galleryRef.current?.click()}>
                  <Upload className="w-4 h-4" /> Add images
                </Button>
              </Field>
            </div>
          )}

          {/* STEP 3 — Details + review */}
          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Price (TND)">
                  <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
                </Field>
                <Field label="Status">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["draft", "published", "archived"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Week #">
                  <Input type="number" value={weekNumber} onChange={(e) => setWeekNumber(e.target.value)} />
                </Field>
                <Field label="Year">
                  <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isCurrentWinner} onChange={(e) => setIsCurrentWinner(e.target.checked)} />
                Mark as current Product of the Week
              </label>
            </>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between gap-2 pt-4 mt-auto border-t border-border">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" variant="gold" onClick={next} disabled={!canNext}>
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="button" variant="gold" onClick={() => save.mutate()} disabled={save.isPending || !imageUrl || !categoryId}>
              {save.isPending ? "Saving…" : editing ? "Save changes" : "Create product"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
  </div>
);
