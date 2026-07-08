import bcrypt from "bcryptjs";
import { env } from "@/config/env";
import { connectDB } from "@/config/db";
import { User } from "@/models/User";
import { MenuItem } from "@/models/MenuItem";
import { Recipe } from "@/models/Recipe";
import { Coupon } from "@/models/Coupon";
import { Category } from "@/models/Category";
import { Appetizer } from "@/models/Appetizer";
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

const COUPON_SEED = [
  { code: "CTGBITES10", discountPercent: 10 },
  { code: "WELCOME15", discountPercent: 15 },
  { code: "FEAST20", discountPercent: 20 },
  { code: "BHORTA5", discountPercent: 5 },
  { code: "NEWUSER25", discountPercent: 25 },
];

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

  await mongoose.disconnect();
  console.log("[seed] Done.");
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
