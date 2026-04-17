import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

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
  // Open 12pm-12am, bookable every 30 mins from 12:00-22:30
  const slotTimes: string[] = [];
  for (let h = 12; h <= 22; h++) {
    slotTimes.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 22 || true) slotTimes.push(`${String(h).padStart(2, "0")}:30`);
  }
  // Remove 23:00 — last bookable time is 22:30
  // slotTimes: 12:00, 12:30, 13:00, ... 22:00, 22:30

  function endTimeFor(start: string) {
    const [hh, mm] = start.split(":").map(Number);
    const totalMin = hh * 60 + mm + 30;
    return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
  }

  for (const loc of [cricklewood, streatham]) {
    const covers = loc.slug === "cricklewood" ? 15 : 12;
    for (let day = 0; day <= 6; day++) {
      for (const time of slotTimes) {
        await prisma.timeSlot.create({
          data: {
            locationId: loc.id,
            dayOfWeek: day,
            startTime: time,
            endTime: endTimeFor(time),
            maxCovers: covers,
            isActive: true,
          },
        });
      }
    }
  }

  const totalSlots = slotTimes.length * 7 * 2;
  console.log(`✅ Time slots created (${slotTimes.length} per day × 7 days × 2 locations = ${totalSlots} slots)`);

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
