import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, Package, Truck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { TrophyIcon } from "@/components/TrophyIcon";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const ProductPage = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    governorateId: "",
    address: "",
  });

  const {
    data: product,
    isLoading: loadingProduct,
    isError: productError,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProduct(id as string),
    enabled: !!id,
    retry: false,
  });

  const { data: governorates = [] } = useQuery({
    queryKey: ["governorates"],
    queryFn: api.getGovernorates,
  });

  const order = useMutation({
    mutationFn: api.createOrder,
    onSuccess: (res) => {
      toast({
        title: "Order Submitted! 🎉",
        description: `Thank you ${formData.fullName}! Order ${res.orderNumber} — we will call ${formData.phone} to confirm.`,
      });
      setFormData({ fullName: "", phone: "", governorateId: "", address: "" });
      setQuantity(1);
    },
    onError: (err: Error) => {
      toast({ title: "Order failed", description: err.message, variant: "destructive" });
    },
  });

  // Reset the active gallery image when navigating between products.
  useEffect(() => {
    setActiveImage(null);
  }, [product?.id]);

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading product…
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-4">Product not found</h1>
          <Link to="/">
            <Button variant="gold">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(10, prev + delta)));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validatePhone = (phone: string) => {
    const tunisianPhoneRegex = /^(\+216)?[2459]\d{7}$/;
    return tunisianPhoneRegex.test(phone.replace(/\s/g, ""));
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast({ title: "Error", description: "Please enter your full name", variant: "destructive" });
      return;
    }
    if (!validatePhone(formData.phone)) {
      toast({ title: "Error", description: "Please enter a valid Tunisian phone number", variant: "destructive" });
      return;
    }
    if (!formData.governorateId) {
      toast({ title: "Error", description: "Please select your governorate", variant: "destructive" });
      return;
    }
    if (!formData.address.trim()) {
      toast({ title: "Error", description: "Please enter your delivery address", variant: "destructive" });
      return;
    }

    order.mutate({
      productId: product.id,
      quantity,
      customer: {
        fullName: formData.fullName.trim(),
        phone: formData.phone.replace(/\s/g, ""),
        governorateId: Number(formData.governorateId),
        address: formData.address.trim(),
      },
    });
  };

  const gallery = [product.imageUrl, ...(product.images ?? [])].filter(
    (v, i, a) => v && a.indexOf(v) === i,
  );
  const cover = activeImage ?? product.imageUrl;
  const propEntries = Object.entries(product.properties ?? {}).filter(
    ([, v]) => v !== "" && v !== null && v !== undefined,
  );

  const price = product.price || 99;
  const subtotal = price * quantity;
  const selectedGov = governorates.find((g) => String(g.id) === formData.governorateId);
  const deliveryFee = selectedGov ? Number(selectedGov.deliveryFee) : 0;
  const total = subtotal + deliveryFee;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Info */}
          <div className="space-y-6">
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-border">
              <img src={cover} alt={product.name} className="w-full h-full object-cover" />
              {product.isCurrentWinner && (
                <div className="absolute top-4 left-4">
                  <Badge variant="winner" className="flex items-center gap-1.5">
                    <TrophyIcon className="w-4 h-4" />
                    Product of the Week
                  </Badge>
                </div>
              )}
            </div>

            {/* Gallery thumbnails */}
            {gallery.length > 1 && (
              <div className="flex gap-3 flex-wrap">
                {gallery.map((url) => (
                  <button
                    key={url}
                    onClick={() => setActiveImage(url)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      cover === url ? "border-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div>
              <Badge variant="week" className="mb-3">
                Week {product.weekNumber}, {product.year}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
                {product.name}
              </h1>
              <p className="text-xl text-primary font-medium mb-4">{product.tagline}</p>
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {product.tags.map((t) => (
                    <span
                      key={t.id}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ backgroundColor: `${t.color ?? "#888"}22`, color: t.color ?? "#888" }}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            </div>

            {/* Specifications (category-inherited + product properties) */}
            {propEntries.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface-2 p-5">
                <h3 className="font-heading font-semibold mb-3">Specifications</h3>
                <dl className="divide-y divide-border">
                  {propEntries.map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 text-sm">
                      <dt className="text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, " $1")}
                      </dt>
                      <dd className="font-medium text-foreground">
                        {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="flex items-center gap-6 py-4 border-t border-b border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="w-5 h-5" />
                <span>Free Packaging</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="w-5 h-5" />
                <span>Delivery: 3-5 days</span>
              </div>
            </div>

            <div className="text-3xl font-bold text-primary">{price} TND</div>
          </div>

          {/* Order Form */}
          <div>
            <Card variant="elevated" className="sticky top-8">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl font-heading font-bold text-foreground mb-6">Place Your Order</h2>
                <p className="text-muted-foreground mb-6 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Cash on Delivery - We'll call to confirm
                </p>

                <form onSubmit={handleSubmitOrder} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      placeholder="Ahmed Ben Ali"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      placeholder="+216 XX XXX XXX"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll call this number to confirm your order
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="governorate">Governorate *</Label>
                    <Select
                      value={formData.governorateId}
                      onValueChange={(value) => handleInputChange("governorateId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your governorate" />
                      </SelectTrigger>
                      <SelectContent>
                        {governorates.map((gov) => (
                          <SelectItem key={gov.id} value={String(gov.id)}>
                            {gov.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Delivery Address *</Label>
                    <Input
                      id="address"
                      placeholder="Street, City, Postal Code"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= 10}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-border pt-5 mt-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-muted-foreground">Subtotal ({quantity} items)</span>
                      <span className="text-lg font-semibold">{subtotal} TND</span>
                    </div>
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="text-lg font-semibold">
                        {selectedGov ? `${deliveryFee} TND` : "Select governorate"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>Total</span>
                      <span className="text-primary">{total} TND</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="gold"
                    size="xl"
                    className="w-full"
                    disabled={order.isPending}
                  >
                    {order.isPending ? "Submitting Order..." : "Confirm Order"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductPage;
