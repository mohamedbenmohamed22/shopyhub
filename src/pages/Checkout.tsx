import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/lib/cart";
import { api } from "@/lib/api";

const Checkout = () => {
  const { items, subtotal, count, setQuantity, remove, clear } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    governorateId: "",
    address: "",
    notes: "",
  });

  const { data: governorates = [] } = useQuery({
    queryKey: ["governorates"],
    queryFn: api.getGovernorates,
  });

  const selectedGov = governorates.find((g) => String(g.id) === form.governorateId);
  const deliveryFee = selectedGov ? Number(selectedGov.deliveryFee) : 0;
  const total = subtotal + deliveryFee;

  const setField = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const order = useMutation({
    mutationFn: api.createOrder,
    onSuccess: (res) => {
      toast({
        title: "Order placed! 🎉",
        description: `Order ${res.orderNumber} — we'll call ${form.phone} to confirm.`,
      });
      clear();
      navigate("/");
    },
    onError: (err: Error) =>
      toast({ title: "Order failed", description: err.message, variant: "destructive" }),
  });

  const phoneOk = useMemo(
    () => /^(\+216)?[2459]\d{7}$/.test(form.phone.replace(/\s/g, "")),
    [form.phone],
  );
  const canSubmit =
    items.length > 0 &&
    form.fullName.trim().length >= 2 &&
    phoneOk &&
    !!form.governorateId &&
    form.address.trim().length >= 4;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast({
        title: "Check your details",
        description: "Please complete all required fields with a valid Tunisian phone number.",
        variant: "destructive",
      });
      return;
    }
    order.mutate({
      items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
      customer: {
        fullName: form.fullName.trim(),
        phone: form.phone.replace(/\s/g, ""),
        governorateId: Number(form.governorateId),
        address: form.address.trim(),
      },
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Continue shopping
        </Link>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-8">Checkout</h1>

        {items.length === 0 ? (
          <div className="py-24 text-center">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-lg font-medium text-foreground">Your cart is empty</p>
            <Button className="mt-4" onClick={() => navigate("/shop")}>
              Browse products
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
            {/* ---- Customer details ---- */}
            <form onSubmit={submit} className="space-y-5 order-2 lg:order-1">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="font-semibold text-foreground">Delivery details</h2>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name *</Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) => setField("fullName", e.target.value)}
                      placeholder="Ahmed Ben Ali"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      placeholder="+216 20 123 456"
                    />
                    {form.phone && !phoneOk && (
                      <p className="text-xs text-destructive">
                        Enter a valid Tunisian number, e.g. +21620123456
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="governorate">Governorate *</Label>
                    <Select
                      value={form.governorateId}
                      onValueChange={(v) => setField("governorateId", v)}
                    >
                      <SelectTrigger id="governorate">
                        <SelectValue placeholder="Select your governorate" />
                      </SelectTrigger>
                      <SelectContent>
                        {governorates.map((g) => (
                          <SelectItem key={g.id} value={String(g.id)}>
                            {g.name} — {Number(g.deliveryFee)} TND
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Textarea
                      id="address"
                      value={form.address}
                      onChange={(e) => setField("address", e.target.value)}
                      placeholder="12 Rue de Carthage, Tunis 1000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={form.notes}
                      onChange={(e) => setField("notes", e.target.value)}
                      placeholder="Call after 6pm"
                    />
                  </div>
                </CardContent>
              </Card>
            </form>

            {/* ---- Order summary ---- */}
            <Card className="order-1 lg:order-2 lg:sticky lg:top-20">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-semibold text-foreground">Order summary ({count})</h2>

                <div className="divide-y divide-border">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3 py-3">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-14 h-14 rounded-md object-cover bg-muted shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.price} TND each</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            disabled={item.quantity >= item.stock}
                            onClick={() => setQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <button
                            type="button"
                            onClick={() => remove(item.id)}
                            className="ml-auto text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                        {(item.price * item.quantity).toFixed(2)} TND
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">{subtotal.toFixed(2)} TND</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="text-foreground">
                      {selectedGov ? `${deliveryFee.toFixed(2)} TND` : "Select governorate"}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-base pt-1.5">
                    <span className="text-foreground">Total</span>
                    <span className="text-primary">{total.toFixed(2)} TND</span>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  disabled={!canSubmit || order.isPending}
                  onClick={submit}
                >
                  {order.isPending ? "Placing order…" : "Place order (Cash on Delivery)"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Pay with cash when your order is delivered.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
