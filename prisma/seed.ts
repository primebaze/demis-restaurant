import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const adapter = new PrismaBetterSqlite3({ url: `file:${path.join(__dirname, "..", "dev.db")}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ─── LOCATIONS ───
  const cricklewood = await prisma.location.upsert({
    where: { slug: "cricklewood" },
    update: {},
    create: {
      name: "Cricklewood",
      slug: "cricklewood",
      address: "89 Cricklewood Broadway, London NW2 3JG",
      phone: "020 3904 6977",
      isActive: true,
    },
  });

  const streatham = await prisma.location.upsert({
    where: { slug: "streatham" },
    update: {},
    create: {
      name: "Streatham Hill",
      slug: "streatham",
      address: "67 Streatham Hill, London SW2 4TX",
      phone: "020 3904 6977",
      isActive: true,
    },
  });

  console.log("✅ Locations created");

  // ─── TIME SLOTS ───
  // Open 12pm-12am, bookable 12pm-22:30
  const slotConfigs = [
    { startTime: "12:00", endTime: "14:30", maxCovers: 30 },
    { startTime: "14:30", endTime: "17:00", maxCovers: 30 },
    { startTime: "17:00", endTime: "19:30", maxCovers: 35 },
    { startTime: "19:30", endTime: "22:30", maxCovers: 35 },
  ];

  for (const loc of [cricklewood, streatham]) {
    for (let day = 0; day <= 6; day++) {
      for (const slot of slotConfigs) {
        await prisma.timeSlot.create({
          data: {
            locationId: loc.id,
            dayOfWeek: day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            maxCovers: loc.slug === "cricklewood" ? slot.maxCovers : Math.round(slot.maxCovers * 0.8),
            isActive: true,
          },
        });
      }
    }
  }

  console.log("✅ Time slots created (4 per day × 7 days × 2 locations = 56 slots)");

  // ─── BOOKING POLICIES ───
  await prisma.bookingPolicy.upsert({
    where: { locationSlug: "default" },
    update: {},
    create: {
      locationSlug: "default",
      minPartySize: 1,
      maxPartySize: 30,
      depositThreshold: 15,
      depositAmountPence: 2000, // £20
      cancellationWindowH: 24,
      maxAdvanceDays: 240,
      autoCancelMinutes: 15,
    },
  });

  await prisma.bookingPolicy.upsert({
    where: { locationSlug: "cricklewood" },
    update: {},
    create: {
      locationSlug: "cricklewood",
      minPartySize: 1,
      maxPartySize: 40,
      depositThreshold: 15,
      depositAmountPence: 2000,
      cancellationWindowH: 24,
      maxAdvanceDays: 240,
      autoCancelMinutes: 15,
    },
  });

  await prisma.bookingPolicy.upsert({
    where: { locationSlug: "streatham" },
    update: {},
    create: {
      locationSlug: "streatham",
      minPartySize: 1,
      maxPartySize: 30,
      depositThreshold: 15,
      depositAmountPence: 2000,
      cancellationWindowH: 24,
      maxAdvanceDays: 240,
      autoCancelMinutes: 15,
    },
  });

  console.log("✅ Booking policies created");

  // ─── ADD-ONS ───
  const addOns = [
    { name: "Birthday Cake Setup", description: "We'll set up a cake with candles and sparklers at your table", pricePence: 1500, sortOrder: 1 },
    { name: "Champagne on Arrival", description: "A bottle of champagne waiting at your table", pricePence: 2500, sortOrder: 2 },
    { name: "Balloon Decoration Package", description: "Custom balloon arch and table decorations", pricePence: 3000, sortOrder: 3 },
    { name: "DJ Request Slot", description: "Guaranteed song request during Afrobeats Night", pricePence: 1000, sortOrder: 4 },
  ];

  for (const addOn of addOns) {
    await prisma.addOn.create({ data: { ...addOn, isActive: true } });
  }

  console.log("✅ Add-ons created");

  // ─── ADMIN USER ───
  const adminHash = hashSync("admin123", 10); // change this!
  await prisma.adminUser.upsert({
    where: { email: "admin@demisrestaurant.co.uk" },
    update: {},
    create: {
      email: "admin@demisrestaurant.co.uk",
      passwordHash: adminHash,
      name: "Admin",
      role: "owner",
      isActive: true,
    },
  });

  console.log("✅ Admin user created (admin@demisrestaurant.co.uk / admin123)");

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
