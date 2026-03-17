#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Real Pan — Kit Admin Setup
# Rodar no servidor frontend como: bash setup-admin-kits.sh
# ═══════════════════════════════════════════════════════════

cd ~/htdocs/realpan.co.jp/realpan-frontend/realpan-admin

echo "🎁 Setting up Kit Admin pages..."
echo ""

# ═══ STEP 1: Create dashboard/kits folder structure ═══
echo "📂 Step 1: Creating folder structure..."
mkdir -p src/app/dashboard/kits/\[id\]
echo "  ✅ src/app/dashboard/kits/ created"
echo "  ✅ src/app/dashboard/kits/[id]/ created"

# Note: Copy the downloaded files:
# admin-kits-page.tsx → src/app/dashboard/kits/page.tsx
# admin-kit-form.tsx  → src/app/dashboard/kits/[id]/page.tsx

# ═══ STEP 2: Add Kit link to Sidebar in layout.tsx ═══
echo ""
echo "📂 Step 2: Adding Kit link to sidebar..."

python3 << 'PYEOF'
fp = 'src/app/dashboard/layout.tsx'
with open(fp, 'r') as f:
    c = f.read()

# Check if Gift icon is already imported
if 'Gift' not in c:
    # Add Gift to lucide imports
    c = c.replace(
        "import {\n  LayoutDashboard,",
        "import {\n  LayoutDashboard,\n  Gift,"
    )
    # Fallback: try single-line import
    if 'Gift,' not in c:
        c = c.replace('LayoutDashboard,', 'LayoutDashboard, Gift,')
    print("  ✅ Added Gift icon import")
else:
    print("  ⚠ Gift icon already imported")

# Add Kit menu item after Products
if "'/dashboard/kits'" not in c:
    c = c.replace(
        "{ icon: Package, label: 'Produtos', labelJa: '製品', href: '/dashboard/products' },",
        "{ icon: Package, label: 'Produtos', labelJa: '製品', href: '/dashboard/products' },\n  { icon: Gift, label: 'Kits Premium', labelJa: 'キット', href: '/dashboard/kits' },"
    )
    print("  ✅ Added Kits menu item to sidebar")
else:
    print("  ⚠ Kits menu item already exists")

with open(fp, 'w') as f:
    f.write(c)
PYEOF

# ═══ STEP 3: Add CRUD routes to API ═══
echo ""
echo "📂 Step 3: Adding CRUD routes to API..."

# Switch to API server context
API_DIR="/home/api/htdocs/api.realpan.jp/realpan-api"

# Check if we can access API dir (same server)
if [ -d "$API_DIR" ]; then
  echo "  API dir found at $API_DIR"
  
  # Update kits route with full CRUD
  cat > /tmp/kits-crud.ts << 'TSEOF'
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const kitInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true, namePt: true, nameJa: true, slug: true,
          images: true, originalPrice: true, retailPrice: true,
          retailPriceWithTax: true, storageType: true, unit: true,
          hinban: true, weightGrams: true,
        },
      },
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  images: { orderBy: { sortOrder: 'asc' as const } },
  giftProduct: {
    select: { id: true, namePt: true, nameJa: true, images: true, slug: true },
  },
};

function enrichKit(kit: any) {
  const effectivePrice = kit.promoPrice ?? kit.basePrice;
  const savingsAmount = kit.promoPrice ? kit.basePrice - kit.promoPrice : 0;
  const savingsPercent = kit.promoPrice ? Math.round((savingsAmount / kit.basePrice) * 100) : 0;
  const totalItems = kit.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const primaryImage = kit.images.find((img: any) => img.isPrimary) || kit.images[0] || null;
  return { ...kit, effectivePrice, savingsAmount, savingsPercent, totalItems, primaryImage: primaryImage?.imageUrl || null };
}

// ═══ GET /api/kits ═══
router.get('/', async (_req: Request, res: Response) => {
  try {
    const kits = await prisma.kit.findMany({
      include: kitInclude,
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: kits.map(enrichKit) });
  } catch (error) {
    console.error('Error fetching kits:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch kits' });
  }
});

// ═══ GET /api/kits/:idOrSlug ═══
router.get('/:idOrSlug', async (req: Request, res: Response) => {
  try {
    const { idOrSlug } = req.params;
    // Try by ID first, then by slug
    let kit = await prisma.kit.findUnique({ where: { id: idOrSlug }, include: kitInclude });
    if (!kit) {
      kit = await prisma.kit.findUnique({ where: { slug: idOrSlug }, include: kitInclude });
    }
    if (!kit) return res.status(404).json({ success: false, message: 'Kit not found' });
    res.json({ success: true, data: enrichKit(kit) });
  } catch (error) {
    console.error('Error fetching kit:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch kit' });
  }
});

// ═══ POST /api/kits ═══
router.post('/', async (req: Request, res: Response) => {
  try {
    const { slug, namePt, nameJa, descriptionPt, descriptionJa, basePrice, promoPrice,
            isActive, isFeatured, sortOrder, giftEnabled, giftProductId, items, images } = req.body;

    const kit = await prisma.kit.create({
      data: {
        slug, namePt, nameJa, descriptionPt, descriptionJa, basePrice,
        promoPrice: promoPrice || null,
        isActive: isActive ?? true,
        isFeatured: isFeatured ?? false,
        sortOrder: sortOrder || 0,
        giftEnabled: giftEnabled ?? false,
        giftProductId: giftEnabled ? giftProductId : null,
        items: {
          create: (items || []).map((item: any, i: number) => ({
            productId: item.productId,
            quantity: item.quantity || 1,
            sortOrder: item.sortOrder ?? i,
          })),
        },
        images: {
          create: (images || []).map((img: any, i: number) => ({
            imageUrl: img.imageUrl,
            isPrimary: img.isPrimary ?? (i === 0),
            sortOrder: img.sortOrder ?? i,
          })),
        },
      },
      include: kitInclude,
    });

    res.json({ success: true, data: enrichKit(kit) });
  } catch (error: any) {
    console.error('Error creating kit:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Slug already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create kit' });
  }
});

// ═══ PUT /api/kits/:id ═══
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { slug, namePt, nameJa, descriptionPt, descriptionJa, basePrice, promoPrice,
            isActive, isFeatured, sortOrder, giftEnabled, giftProductId, items, images } = req.body;

    // Delete existing items and images, then recreate
    await prisma.kitItem.deleteMany({ where: { kitId: id } });
    await prisma.kitImage.deleteMany({ where: { kitId: id } });

    const kit = await prisma.kit.update({
      where: { id },
      data: {
        slug, namePt, nameJa, descriptionPt, descriptionJa, basePrice,
        promoPrice: promoPrice || null,
        isActive: isActive ?? true,
        isFeatured: isFeatured ?? false,
        sortOrder: sortOrder || 0,
        giftEnabled: giftEnabled ?? false,
        giftProductId: giftEnabled ? giftProductId : null,
        items: {
          create: (items || []).map((item: any, i: number) => ({
            productId: item.productId,
            quantity: item.quantity || 1,
            sortOrder: item.sortOrder ?? i,
          })),
        },
        images: {
          create: (images || []).map((img: any, i: number) => ({
            imageUrl: img.imageUrl,
            isPrimary: img.isPrimary ?? (i === 0),
            sortOrder: img.sortOrder ?? i,
          })),
        },
      },
      include: kitInclude,
    });

    res.json({ success: true, data: enrichKit(kit) });
  } catch (error: any) {
    console.error('Error updating kit:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Slug already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to update kit' });
  }
});

// ═══ PATCH /api/kits/:id (partial update — toggle active/featured) ═══
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const kit = await prisma.kit.update({
      where: { id },
      data: req.body,
      include: kitInclude,
    });
    res.json({ success: true, data: enrichKit(kit) });
  } catch (error) {
    console.error('Error patching kit:', error);
    res.status(500).json({ success: false, message: 'Failed to update kit' });
  }
});

// ═══ DELETE /api/kits/:id ═══
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.kit.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Kit deleted' });
  } catch (error) {
    console.error('Error deleting kit:', error);
    res.status(500).json({ success: false, message: 'Failed to delete kit' });
  }
});

export default router;
TSEOF

  # Copy to API
  cp /tmp/kits-crud.ts "$API_DIR/src/routes/kits.ts"
  echo "  ✅ CRUD routes copied to API"

  # Build and restart API
  cd "$API_DIR"
  npm run build 2>&1 | tail -3
  pm2 restart realpan-api 2>&1 | tail -3
  cd ~/htdocs/realpan.co.jp/realpan-frontend/realpan-admin
  echo "  ✅ API rebuilt and restarted"
else
  echo "  ⚠ API dir not accessible from this user. Copy kits-crud route manually."
  echo "  File saved to /tmp/kits-crud.ts"
fi

# ═══ STEP 4: Build admin ═══
echo ""
echo "📂 Step 4: Building admin..."
echo "  Copy the downloaded files first:"
echo "    admin-kits-page.tsx → src/app/dashboard/kits/page.tsx"
echo "    admin-kit-form.tsx  → src/app/dashboard/kits/[id]/page.tsx"
echo ""
echo "  Then run: npx next build && pm2 restart realpan-admin"

echo ""
echo "═══════════════════════════════════════"
echo "🎁 Kit Admin setup complete!"
echo ""
echo "Access: /dashboard/kits"
echo "═══════════════════════════════════════"