import { randomUUID } from 'node:crypto';
import { PrismaClient, ProductStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const prisma = new PrismaClient();

const GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
  'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
  'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
  'Gabès', 'Medenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kebili',
];

type PropDef = { key: string; label: string; type: 'text' | 'number' | 'boolean' };

// Fancy fallback category for products created without one.
const DEFAULT_CATEGORY = {
  name: 'Miscellanea',
  slug: 'miscellanea',
  isDefault: true,
  propertySchema: [] as PropDef[],
};

const CATEGORIES: { name: string; slug: string; propertySchema: PropDef[] }[] = [
  {
    name: 'AI & Design',
    slug: 'ai-design',
    propertySchema: [
      { key: 'platform', label: 'Platform', type: 'text' },
      { key: 'aiModel', label: 'AI Model', type: 'text' },
      { key: 'freeTier', label: 'Free tier', type: 'boolean' },
    ],
  },
  {
    name: 'Productivity',
    slug: 'productivity',
    propertySchema: [
      { key: 'platform', label: 'Platform', type: 'text' },
      { key: 'offline', label: 'Works offline', type: 'boolean' },
    ],
  },
  {
    name: 'Developer Tools',
    slug: 'developer-tools',
    propertySchema: [
      { key: 'language', label: 'Primary language', type: 'text' },
      { key: 'openSource', label: 'Open source', type: 'boolean' },
    ],
  },
  {
    name: 'Design',
    slug: 'design',
    propertySchema: [
      { key: 'format', label: 'Format', type: 'text' },
      { key: 'license', label: 'License', type: 'text' },
    ],
  },
  {
    name: 'AI & Audio',
    slug: 'ai-audio',
    propertySchema: [
      { key: 'platform', label: 'Platform', type: 'text' },
      { key: 'languages', label: 'Supported languages', type: 'number' },
    ],
  },
];

const TAGS = [
  { name: 'New', slug: 'new', color: '#22c55e' },
  { name: 'Trending', slug: 'trending', color: '#f59e0b' },
  { name: "Editor's Pick", slug: 'editors-pick', color: '#6366f1' },
  { name: 'Free', slug: 'free', color: '#0ea5e9' },
  { name: 'Premium', slug: 'premium', color: '#e11d48' },
];

// Mirrors src/data/products.ts from the frontend.
const PRODUCTS = [
  { slug: 'lumina-ai', name: 'Lumina AI', tagline: 'Transform your ideas into stunning visuals instantly', description: 'Lumina AI is a revolutionary design tool that uses advanced machine learning to convert your rough sketches and text descriptions into polished, professional-grade designs.', category: 'AI & Design', weekNumber: 50, year: 2024, votes: 2847, price: 149, winner: true },
  { slug: 'flowstate', name: 'FlowState', tagline: 'Deep work timer for the modern age', description: 'A beautiful productivity app that combines Pomodoro technique with ambient sounds and focus analytics.', category: 'Productivity', weekNumber: 49, year: 2024, votes: 1923, price: 79, winner: false },
  { slug: 'codebuddy', name: 'CodeBuddy', tagline: 'Your AI pair programmer', description: 'An intelligent coding assistant that understands context and helps you write better code, faster.', category: 'Developer Tools', weekNumber: 48, year: 2024, votes: 2156, price: 129, winner: false },
  { slug: 'notion-calendar', name: 'Notion Calendar', tagline: 'Time blocking meets note-taking', description: 'A seamless calendar experience integrated with your Notion workspace for ultimate productivity.', category: 'Productivity', weekNumber: 47, year: 2024, votes: 3421, price: 59, winner: false },
  { slug: 'designdrop', name: 'DesignDrop', tagline: 'UI kits delivered weekly', description: 'Premium design resources and UI kits curated for modern designers. New drops every week.', category: 'Design', weekNumber: 46, year: 2024, votes: 1654, price: 89, winner: false },
  { slug: 'voicenote-pro', name: 'VoiceNote Pro', tagline: 'Voice memos, transcribed instantly', description: 'Record your thoughts on the go and get instant transcriptions with AI-powered organization.', category: 'AI & Audio', weekNumber: 45, year: 2024, votes: 1832, price: 69, winner: false },
];

// ---------------------------------------------------------------------------
// MinIO / S3 placeholder image upload
// ---------------------------------------------------------------------------

const BUCKET = process.env.S3_BUCKET ?? 'product-images';
// The seed runs on the host, so it reaches MinIO at localhost:<published port>,
// not the in-compose "minio:9000".
const S3_HOST_ENDPOINT = `http://localhost:${process.env.MINIO_API_PORT ?? '9090'}`;
const PUBLIC_BASE = process.env.S3_PUBLIC_URL ?? `${S3_HOST_ENDPOINT}/${BUCKET}`;

const s3 = new S3Client({
  endpoint: S3_HOST_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  forcePathStyle: true, // MinIO requires path-style addressing
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? 'pow-minio',
    secretAccessKey: process.env.S3_SECRET_KEY ?? 'pow-minio-secret',
  },
});

/** Deterministic pleasant colour from a string. */
function colorFor(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h}, 65%, 55%)`;
}

/** A self-contained SVG placeholder card showing the product name + category. */
function placeholderSvg(name: string, category: string): string {
  const bg = colorFor(name);
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="#1a1a1a"/>
  </linearGradient></defs>
  <rect width="800" height="500" fill="url(#g)"/>
  <circle cx="400" cy="200" r="90" fill="rgba(255,255,255,0.15)"/>
  <text x="400" y="225" font-family="Arial, sans-serif" font-size="72" font-weight="700"
        fill="#fff" text-anchor="middle">${esc(initials)}</text>
  <text x="400" y="340" font-family="Arial, sans-serif" font-size="40" font-weight="700"
        fill="#fff" text-anchor="middle">${esc(name)}</text>
  <text x="400" y="385" font-family="Arial, sans-serif" font-size="22"
        fill="rgba(255,255,255,0.8)" text-anchor="middle">${esc(category)}</text>
  <text x="400" y="470" font-family="Arial, sans-serif" font-size="18"
        fill="rgba(255,255,255,0.6)" text-anchor="middle">Product of the Week</text>
</svg>`;
}

/** Ensure the bucket exists and is publicly readable (idempotent). */
async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  }
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET}/*`],
          },
        ],
      }),
    }),
  );
}

/** Upload one product's placeholder and return its public URL. */
async function uploadPlaceholder(product: { slug: string; name: string; category: string }): Promise<string> {
  const key = `products/${product.slug}.svg`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: placeholderSvg(product.name, product.category),
      ContentType: 'image/svg+xml',
    }),
  );
  return `${PUBLIC_BASE}/${key}`;
}

async function main() {
  // --- Admin user ---
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@potw.tn';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin1234';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash, role: 'admin' },
  });
  console.log(`✓ admin user: ${adminEmail}`);

  // --- Governorates ---
  const fee = Number(process.env.DEFAULT_DELIVERY_FEE ?? 7);
  for (const name of GOVERNORATES) {
    await prisma.governorate.upsert({
      where: { name },
      update: {},
      create: { name, deliveryFee: fee },
    });
  }
  console.log(`✓ ${GOVERNORATES.length} governorates`);

  // --- Categories (+ default fallback) ---
  const categoryByName = new Map<string, string>();
  const defaultCat = await prisma.category.upsert({
    where: { slug: DEFAULT_CATEGORY.slug },
    update: { name: DEFAULT_CATEGORY.name, isDefault: true },
    create: DEFAULT_CATEGORY,
  });
  categoryByName.set(DEFAULT_CATEGORY.name, defaultCat.id);

  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, propertySchema: c.propertySchema },
      create: c,
    });
    categoryByName.set(c.name, row.id);
  }
  console.log(`✓ ${CATEGORIES.length + 1} categories (incl. default "${DEFAULT_CATEGORY.name}")`);

  // Backfill: any product without a category → the default category.
  const backfilled = await prisma.product.updateMany({
    where: { categoryId: null },
    data: { categoryId: defaultCat.id },
  });
  if (backfilled.count) console.log(`✓ assigned ${backfilled.count} uncategorised products to "${DEFAULT_CATEGORY.name}"`);

  // --- Tags ---
  for (const t of TAGS) {
    await prisma.tag.upsert({ where: { slug: t.slug }, update: { color: t.color }, create: t });
  }
  console.log(`✓ ${TAGS.length} tags`);

  // --- Placeholder images (best-effort: skip if MinIO is unreachable) ---
  let imagesUploaded = false;
  try {
    await ensureBucket();
    imagesUploaded = true;
  } catch (e) {
    console.warn(`⚠ MinIO not reachable at ${S3_HOST_ENDPOINT} — keeping fallback image URLs.`);
    console.warn(`  (start storage with: docker compose up -d minio)`);
  }

  // --- Products ---
  for (const p of PRODUCTS) {
    let imageUrl = `https://placehold.co/800x500?text=${encodeURIComponent(p.name)}`;
    if (imagesUploaded) {
      try {
        imageUrl = await uploadPlaceholder(p);
      } catch (e) {
        console.warn(`⚠ failed to upload placeholder for ${p.slug}: ${(e as Error).message}`);
      }
    }

    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { imageUrl },
      create: {
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        imageUrl,
        categoryId: categoryByName.get(p.category) ?? null,
        price: p.price,
        weekNumber: p.weekNumber,
        year: p.year,
        votesCount: p.votes,
        isCurrentWinner: p.winner,
        status: ProductStatus.published,
      },
    });
  }
  console.log(`✓ ${PRODUCTS.length} products${imagesUploaded ? ' (with MinIO placeholder images)' : ''}`);

  // --- A couple of sample subscribers (so the admin list isn't empty) ---
  for (const email of ['demo1@example.com', 'demo2@example.com']) {
    await prisma.subscriber.upsert({
      where: { email },
      update: {},
      create: { email, confirmed: true, unsubscribeToken: randomUUID() },
    });
  }
  console.log('✓ sample subscribers');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
