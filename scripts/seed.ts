import bcrypt from "bcryptjs";
import { env } from "@/config/env";
import { connectDB } from "@/config/db";
import { User } from "@/models/User";
import { MenuItem } from "@/models/MenuItem";
import { Recipe } from "@/models/Recipe";
import { Coupon } from "@/models/Coupon";
import { Category } from "@/models/Category";
import { Appetizer } from "@/models/Appetizer";
import { Review } from "@/models/Review";
import { Order, type OrderMode, type PaymentMethod } from "@/models/Order";
import { Expense, type ExpenseCategory } from "@/models/Expense";
import { generateOrderNumber } from "@/utils/generateOrderNumber";
import mongoose from "mongoose";

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const MENU_CATEGORY_NAMES = ["Mezzban", "Bhuna", "Bhorta", "Sides", "Drinks", "Mishti"];
const APPETIZER_CATEGORY_NAMES = ["Fried", "Grilled", "Cold"];

const MENU_SEED = [
  { name: "Mezzban Beef Bhuna", category: "Mezzban", price: 320, rating: 5.0, reviews: 512, badge: "Signature", description: "The legendary Chittagong feast dish — slow-cooked beef in a rich, smoky gravy with dried chilies and whole spices.", ingredients: ["Beef", "Mustard oil", "Fried onion", "Ginger paste", "Garlic paste", "Dried red chili", "Whole spices"], image: "/images/menu/mezzban-bhuna.webp", isVeg: false, isSpicy: true },
  { name: "CTG Style Shutki Bhorta", category: "Bhorta", price: 180, rating: 4.8, reviews: 334, badge: "CTG Special", description: "Dried fish mashed with mustard oil, green chili, and raw onion. The real taste of Chittagong.", ingredients: ["Dried fish (shutki)", "Mustard oil", "Green chili", "Raw onion", "Coriander"], image: "/images/menu/shutki-bhorta.png", isVeg: false, isSpicy: true },
  { name: "Mezbani Dal", category: "Mezzban", price: 120, rating: 4.9, reviews: 289, badge: "Best Seller", description: "The iconic lentil soup served at every Chittagong feast — thin, spiced, deeply comforting.", ingredients: ["Masoor dal", "Turmeric", "Dried red chili", "Mustard oil", "Panch phoron", "Garlic"], image: "/images/menu/mezbani-dal.png", isVeg: true, isSpicy: false },
  { name: "Kala Bhuna", category: "Bhuna", price: 380, rating: 5.0, reviews: 401, badge: "Fan Fav", description: "The darkest, richest beef bhuna in Bangladesh. Hours of slow cooking gives this its legendary black colour.", ingredients: ["Beef (bone-in)", "Mustard oil", "Fried onion", "Ginger paste", "Garlic paste", "Whole spices"], image: "/images/menu/kala-bhuna.png", isVeg: false, isSpicy: true },
  { name: "Aloo Bhorta", category: "Bhorta", price: 80, rating: 4.6, reviews: 178, description: "Mashed potato with mustard oil, dried chili, and fresh coriander. Simple and perfect.", ingredients: ["Potato", "Mustard oil", "Dried chili", "Coriander"], image: "/images/menu/aloo-bhorta.png", isVeg: true, isSpicy: false },
  { name: "Ilish Paturi", category: "Sides", price: 450, rating: 4.9, reviews: 223, badge: "Seasonal", description: "Hilsha fish wrapped in banana leaf and steamed with mustard paste and green chili.", ingredients: ["Hilsha fish", "Mustard paste", "Green chili", "Banana leaf"], image: "/images/menu/Ilish-Paturi.png", isVeg: false, isSpicy: false },
  { name: "Borhani", category: "Drinks", price: 60, rating: 4.9, reviews: 667, badge: "Popular", description: "The classic Chittagong spiced yogurt drink — minty, tangy, and essential alongside any heavy meal.", ingredients: ["Yogurt", "Mint", "Black salt", "Green chili"], image: "/images/menu/borhani.webp", isVeg: true, isSpicy: false },
  { name: "Mishti Doi", category: "Mishti", price: 90, rating: 4.9, reviews: 345, badge: "New", description: "Creamy set yogurt sweetened with date molasses. The perfect ending to a Chittagong feast.", ingredients: ["Yogurt", "Date molasses"], image: "/images/menu/mishti-doi.png", isVeg: true, isSpicy: false },
];

const APPETIZER_SEED = [
  { name: "Beef Shingara", category: "Fried", price: 40, description: "Crispy pastry filled with spiced minced beef.", image: "/images/menu/mezzban-bhuna.webp" },
  { name: "Chicken Fry", category: "Fried", price: 90, description: "Golden fried chicken pieces with house spices.", image: "/images/menu/kala-bhuna.png" },
  { name: "Grilled Kabab", category: "Grilled", price: 120, description: "Smoky skewered kabab grilled over open flame.", image: "/images/menu/Ilish-Paturi.png" },
  { name: "Borhani Shot", category: "Cold", price: 30, description: "A small chilled glass of our classic spiced yogurt drink.", image: "/images/menu/borhani.webp" },
];

const RECIPE_SEED = [
  { title: "Authentic Kala Bhuna", slug: "kala-bhuna", time: "3 hrs", difficulty: "Hard", servings: 6, category: "Bhuna", image: "/images/recipes/kala-bhuna.png", excerpt: "The crown jewel of Chittagong cooking. Low heat, patience, and the right spices is all it takes.", ingredients: ["1kg beef (bone-in)", "4 tbsp mustard oil", "2 cups fried onion", "2 tbsp ginger paste", "1 tbsp garlic paste", "3 tsp red chili powder", "1 tsp cumin", "Whole spices (bay, cardamom, cinnamon)", "Salt to taste"], steps: ["Marinate beef with ginger, garlic, and all spices for 1 hour.", "Heat mustard oil in a heavy pot, fry onions golden.", "Add beef and cook on high heat for 10 minutes.", "Reduce to lowest heat, cover and cook 2–2.5 hrs stirring occasionally.", "Increase heat at the end until gravy turns dark and thick."] },
  { title: "Mezbani Dal", slug: "mezbani-dal", time: "40 min", difficulty: "Easy", servings: 8, category: "Mezzban", image: "/images/recipes/mezbani-dal.png", excerpt: "The soup that ties every Chittagong feast together. Thin, light, and loaded with warmth.", ingredients: ["300g masoor dal", "1 tsp turmeric", "3 dried red chilies", "2 tbsp mustard oil", "1 tsp panch phoron", "4 cloves garlic", "Salt"], steps: ["Boil dal with turmeric and salt until completely soft.", "Blend or whisk until smooth and thin.", "Heat mustard oil, fry garlic and dried chilies.", "Pour tadka over dal, stir well and serve."] },
  { title: "Shutki Bhorta", slug: "shutki-bhorta", time: "30 min", difficulty: "Medium", servings: 4, category: "Bhorta", image: "/images/recipes/shutki-bhorta.png", excerpt: "The most polarising dish in Bangladesh — and the most beloved in Chittagong. Bold, funky, unforgettable.", ingredients: ["150g dried fish (shutki)", "3 tbsp mustard oil", "4 green chilies", "1 medium onion (raw)", "1 tsp turmeric", "Salt", "Fresh coriander"], steps: ["Wash and soak shutki in hot water for 20 min.", "Fry in mustard oil with turmeric until crispy.", "Cool and flake finely.", "Mix with raw onion, green chili, mustard oil, and salt by hand.", "Garnish with coriander and serve with hot rice."] },
];

// Demo reviews so the homepage carousel has something to show out of the box. Seeded as
// source: "manual" (no real order backs these) — exactly the same shape admin-added
// social-media reviews take. Items sharing a groupId render as one "reviewed together" card.
const REVIEW_SEED: {
  groupId: string;
  itemName: string;
  itemImage: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment?: string;
  sourceLabel?: string;
}[] = [
  {
    groupId: "seed-review-1",
    itemName: "Kala Bhuna",
    itemImage: "/images/menu/kala-bhuna.png",
    customerName: "Sarah M.",
    customerAvatar: "/images/avatars/avatar 1.jpg",
    rating: 5,
    comment: "The Kala Bhuna here ruined me for every other beef dish. That dark, smoky gravy — absolutely divine.",
  },
  {
    groupId: "seed-review-2",
    itemName: "CTG Style Shutki Bhorta",
    itemImage: "/images/menu/shutki-bhorta.png",
    customerName: "Priya K.",
    rating: 5,
    comment: "The Shutki Bhorta is a revelation. I've brought every visitor I've had to Chittagong here.",
  },
  {
    groupId: "seed-review-3",
    itemName: "Mezzban Beef Bhuna",
    itemImage: "/images/menu/mezzban-bhuna.webp",
    customerName: "James L.",
    customerAvatar: "/images/avatars/avatar 1.jpg",
    rating: 5,
    comment: "Flew in for a conference, stumbled onto CTG Bites. Best meal of the trip, no contest.",
    sourceLabel: "Google Reviews",
  },
  // "Reviewed together" example — two items sharing one groupId and one comment.
  {
    groupId: "seed-review-4",
    itemName: "Borhani",
    itemImage: "/images/menu/borhani.webp",
    customerName: "Tomás R.",
    rating: 4,
    comment: "Perfect atmosphere, bold flavours. The Borhani alongside the Mezzban set is absolutely addictive.",
  },
  {
    groupId: "seed-review-4",
    itemName: "Mezbani Dal",
    itemImage: "/images/menu/mezbani-dal.png",
    customerName: "Tomás R.",
    rating: 5,
    comment: "Perfect atmosphere, bold flavours. The Borhani alongside the Mezzban set is absolutely addictive.",
  },
  {
    groupId: "seed-review-5",
    itemName: "Mishti Doi",
    itemImage: "/images/menu/mishti-doi.png",
    customerName: "Anika R.",
    rating: 5,
    comment: "Ended the meal with this and I'm still thinking about it a week later. Perfectly sweet, not sickly.",
    sourceLabel: "Facebook",
  },
];

const COUPON_SEED = [
  { code: "CTGBITES10", discountPercent: 10 },
  { code: "WELCOME15", discountPercent: 15 },
  { code: "FEAST20", discountPercent: 20 },
  { code: "BHORTA5", discountPercent: 5 },
  { code: "NEWUSER25", discountPercent: 25 },
];

// Spread across the last 30 days so the Finance page's chart/table have something to
// show out of the box, same spirit as REVIEW_SEED above.
const EXPENSE_SEED: { category: ExpenseCategory; description: string; amount: number; vendor?: string; daysAgo: number }[] = [
  { category: "ingredients", description: "Weekly vegetable & meat supply", amount: 18500, vendor: "Reazuddin Bazar Wholesale", daysAgo: 2 },
  { category: "ingredients", description: "Rice & lentils bulk order", amount: 9200, vendor: "Khatunganj Traders", daysAgo: 5 },
  { category: "ingredients", description: "Dried fish (shutki) restock", amount: 4300, vendor: "Fishery Ghat Supplier", daysAgo: 9 },
  { category: "ingredients", description: "Spices & mustard oil restock", amount: 6100, vendor: "Khatunganj Traders", daysAgo: 16 },
  { category: "salaries", description: "Kitchen staff salaries — biweekly", amount: 42000, daysAgo: 14 },
  { category: "salaries", description: "Waitstaff salaries — biweekly", amount: 28000, daysAgo: 14 },
  { category: "salaries", description: "Rider payouts — biweekly", amount: 15000, daysAgo: 28 },
  { category: "rent", description: "Shop rent — monthly", amount: 55000, vendor: "GEC Circle Property", daysAgo: 28 },
  { category: "utilities", description: "Electricity bill", amount: 12400, vendor: "PDB", daysAgo: 20 },
  { category: "utilities", description: "Gas cylinder refills", amount: 6800, daysAgo: 11 },
  { category: "utilities", description: "Water bill", amount: 2100, vendor: "WASA", daysAgo: 20 },
  { category: "equipment", description: "New gas burner + repairs", amount: 15500, vendor: "Agrabad Hardware", daysAgo: 17 },
  { category: "equipment", description: "Cookware replacement", amount: 7200, daysAgo: 24 },
  { category: "marketing", description: "Facebook ads boost", amount: 5000, daysAgo: 6 },
  { category: "marketing", description: "Local newspaper ad", amount: 3500, vendor: "Purbokone", daysAgo: 26 },
  { category: "other", description: "Staff meal allowance", amount: 4600, daysAgo: 3 },
  { category: "other", description: "Delivery bike fuel & maintenance", amount: 5300, daysAgo: 8 },
];

// Sales that didn't come through the site (phone orders, walk-ins) — logged as
// source: "manual", same as an owner would add via the Finance page.
const MANUAL_ORDER_SEED: {
  customerName: string;
  description: string;
  amount: number;
  mode: OrderMode;
  paymentMethod: PaymentMethod;
  daysAgo: number;
}[] = [
  { customerName: "Walk-in Guest", description: "Mezzban feast for 4 (phone order)", amount: 1280, mode: "table", paymentMethod: "cod", daysAgo: 1 },
  { customerName: "Rafiq Ahmed", description: "Kala Bhuna + rice, delivered outside app", amount: 620, mode: "online", paymentMethod: "bkash", daysAgo: 2 },
  { customerName: "Walk-in Guest", description: "Ilish Paturi set", amount: 950, mode: "table", paymentMethod: "cod", daysAgo: 4 },
  { customerName: "Nasrin Sultana", description: "Office lunch order — 6 boxes", amount: 2140, mode: "online", paymentMethod: "cod", daysAgo: 6 },
  { customerName: "Walk-in Guest", description: "Shutki Bhorta + Mezbani Dal combo", amount: 340, mode: "table", paymentMethod: "cod", daysAgo: 7 },
  { customerName: "Tanvir Hossain", description: "Family parcel, phone order", amount: 1560, mode: "online", paymentMethod: "bkash", daysAgo: 10 },
  { customerName: "Walk-in Guest", description: "Borhani + Mishti Doi round", amount: 210, mode: "table", paymentMethod: "cod", daysAgo: 12 },
  { customerName: "Farzana Islam", description: "Catering — small event", amount: 4800, mode: "online", paymentMethod: "cod", daysAgo: 15 },
  { customerName: "Walk-in Guest", description: "Kala Bhuna full plate", amount: 380, mode: "table", paymentMethod: "cod", daysAgo: 18 },
  { customerName: "Shamim Reza", description: "Delivery outside coverage area, arranged by phone", amount: 890, mode: "online", paymentMethod: "bkash", daysAgo: 21 },
  { customerName: "Walk-in Guest", description: "Aloo Bhorta + Mezbani Dal, takeaway", amount: 200, mode: "table", paymentMethod: "cod", daysAgo: 23 },
  { customerName: "Mehedi Hasan", description: "Weekend family feast, phone order", amount: 2350, mode: "online", paymentMethod: "cod", daysAgo: 27 },
];

async function seedFinance(ownerId: mongoose.Types.ObjectId): Promise<void> {
  const expenseCount = await Expense.countDocuments();
  if (expenseCount === 0) {
    const now = Date.now();
    await Expense.insertMany(
      EXPENSE_SEED.map((e) => ({
        category: e.category,
        description: e.description,
        amount: e.amount,
        vendor: e.vendor,
        date: new Date(now - e.daysAgo * 24 * 60 * 60 * 1000),
        createdBy: ownerId,
      }))
    );
    console.log(`[seed] Inserted ${EXPENSE_SEED.length} expenses.`);
  } else {
    console.log("[seed] Expenses already exist, skipping.");
  }

  const manualOrderCount = await Order.countDocuments({ source: "manual" });
  if (manualOrderCount === 0) {
    for (const m of MANUAL_ORDER_SEED) {
      let orderNumber = generateOrderNumber(m.mode);
      for (let attempt = 0; attempt < 5; attempt++) {
        // eslint-disable-next-line no-await-in-loop
        const exists = await Order.exists({ orderNumber });
        if (!exists) break;
        orderNumber = generateOrderNumber(m.mode);
      }

      // eslint-disable-next-line no-await-in-loop
      const order = await Order.create({
        orderNumber,
        mode: m.mode,
        type: m.mode === "online" ? "delivery" : "table-food",
        status: "delivered",
        customerName: m.customerName,
        items: [{ name: m.description, price: m.amount, quantity: 1, image: "" }],
        subtotal: m.amount,
        discountAmount: 0,
        total: m.amount,
        payment: { method: m.paymentMethod, status: "paid", amount: m.amount, currency: "BDT" },
        source: "manual",
        createdBy: ownerId,
      });

      // Bypass the timestamps plugin (same technique as the live manual-order
      // endpoint) so seeded sales land on the day they're meant to represent,
      // not the day the seed script happened to run.
      const createdAt = new Date(Date.now() - m.daysAgo * 24 * 60 * 60 * 1000);
      // eslint-disable-next-line no-await-in-loop
      await Order.collection.updateOne({ _id: order._id }, { $set: { createdAt } });
    }
    console.log(`[seed] Inserted ${MANUAL_ORDER_SEED.length} manual orders.`);
  } else {
    console.log("[seed] Manual orders already exist, skipping.");
  }
}

async function ensureCategories(names: string[], kind: "menu" | "appetizer"): Promise<Map<string, string>> {
  const slugToName = new Map<string, string>();
  for (const [index, name] of names.entries()) {
    const slug = slugify(name);
    slugToName.set(slug, name);
    await Category.updateOne(
      { kind, slug },
      { $setOnInsert: { name, slug, kind, sortOrder: index } },
      { upsert: true }
    );
  }
  return slugToName;
}

async function seed() {
  await connectDB();

  if (env.DEFAULT_OWNER_EMAIL && env.DEFAULT_OWNER_PASSWORD) {
    const existingOwner = await User.findOne({ email: env.DEFAULT_OWNER_EMAIL.toLowerCase() });
    if (!existingOwner) {
      const passwordHash = await bcrypt.hash(env.DEFAULT_OWNER_PASSWORD, 12);
      await User.create({
        name: env.DEFAULT_OWNER_NAME ?? "Owner",
        email: env.DEFAULT_OWNER_EMAIL.toLowerCase(),
        passwordHash,
        role: "owner",
      });
      console.log(`[seed] Created Owner account: ${env.DEFAULT_OWNER_EMAIL}`);
    } else {
      console.log("[seed] Owner account already exists, skipping.");
    }
  } else {
    console.log("[seed] DEFAULT_OWNER_EMAIL/PASSWORD not set, skipping owner seed.");
  }

  // Whichever branch above ran, grab an owner id to attribute the finance seed data
  // to — works whether the account was just created or already existed.
  const ownerUser = await User.findOne({ role: "owner" }).sort({ createdAt: 1 });
  if (ownerUser) {
    await seedFinance(ownerUser._id as mongoose.Types.ObjectId);
  } else {
    console.log("[seed] No owner account found, skipping finance seed data.");
  }

  await ensureCategories(MENU_CATEGORY_NAMES, "menu");
  await ensureCategories(APPETIZER_CATEGORY_NAMES, "appetizer");
  console.log("[seed] Ensured menu + appetizer categories.");

  // Migrate any legacy MenuItem.category values (e.g. "Mezzban") to their lowercase slug form.
  // Uses the raw collection (bypassing Mongoose's schema-level lowercase setter, which does not
  // reliably apply to updateMany $set values across all Mongoose versions).
  for (const name of MENU_CATEGORY_NAMES) {
    const slug = slugify(name);
    await MenuItem.collection.updateMany({ category: name }, { $set: { category: slug } });
  }

  const menuCount = await MenuItem.countDocuments();
  if (menuCount === 0) {
    await MenuItem.insertMany(MENU_SEED.map((m) => ({ ...m, category: slugify(m.category) })));
    console.log(`[seed] Inserted ${MENU_SEED.length} menu items.`);
  } else {
    console.log("[seed] Menu items already exist, skipping insert (legacy categories migrated above).");
  }

  const appetizerCount = await Appetizer.countDocuments();
  if (appetizerCount === 0) {
    await Appetizer.insertMany(APPETIZER_SEED.map((a) => ({ ...a, category: slugify(a.category) })));
    console.log(`[seed] Inserted ${APPETIZER_SEED.length} appetizers.`);
  } else {
    console.log("[seed] Appetizers already exist, skipping.");
  }

  const recipeCount = await Recipe.countDocuments();
  if (recipeCount === 0) {
    await Recipe.insertMany(RECIPE_SEED);
    console.log(`[seed] Inserted ${RECIPE_SEED.length} recipes.`);
  } else {
    console.log("[seed] Recipes already exist, skipping.");
  }

  const couponCount = await Coupon.countDocuments();
  if (couponCount === 0) {
    await Coupon.insertMany(COUPON_SEED);
    console.log(`[seed] Inserted ${COUPON_SEED.length} coupons.`);
  } else {
    console.log("[seed] Coupons already exist, skipping.");
  }

  const reviewCount = await Review.countDocuments();
  if (reviewCount === 0) {
    const menuItemsByName = new Map((await MenuItem.find()).map((m) => [m.name, m]));
    await Review.insertMany(
      REVIEW_SEED.map((r) => ({
        groupId: r.groupId,
        source: "manual" as const,
        sourceLabel: r.sourceLabel,
        menuItem: menuItemsByName.get(r.itemName)?._id,
        itemName: r.itemName,
        itemImage: r.itemImage,
        customerName: r.customerName,
        customerAvatar: r.customerAvatar,
        rating: r.rating,
        comment: r.comment,
        status: "approved" as const,
      }))
    );
    console.log(`[seed] Inserted ${REVIEW_SEED.length} demo reviews.`);

    // Keep each reviewed MenuItem's aggregate rating/reviews count in sync, same as the
    // live recalcMenuItemRating logic in review.service.ts.
    for (const menuItem of menuItemsByName.values()) {
      const stats = await Review.aggregate([
        { $match: { menuItem: menuItem._id, status: "approved" } },
        { $group: { _id: "$menuItem", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]);
      if (stats[0]) {
        await MenuItem.updateOne(
          { _id: menuItem._id },
          { rating: Math.round(stats[0].avg * 10) / 10, reviews: stats[0].count }
        );
      }
    }
  } else {
    console.log("[seed] Reviews already exist, skipping.");
  }

  await mongoose.disconnect();
  console.log("[seed] Done.");
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
