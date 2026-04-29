import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Set Menu | Demi's Restaurant — Four Course Nigerian Dining London",
  description:
    "Experience Demi's four course set menu — small chops, salad, jollof rice with chicken, and dessert. Perfect for groups and special occasions. Call to book.",
  keywords: [
    "Nigerian set menu London",
    "four course Nigerian meal",
    "Nigerian restaurant set menu",
    "group dining London",
    "Demi's set menu",
    "Nigerian fine dining London",
  ],
  openGraph: {
    title: "Four Course Set Menu | Demi's Restaurant",
    description:
      "A curated four course Nigerian dining experience — small chops, salad, jollof rice with chicken, and Ice Cream Xplosion dessert.",
  },
  alternates: {
    canonical: "https://www.demisrestaurant.co.uk/set-menu",
  },
};

const COURSES = [
  {
    number: "01",
    label: "Appetiser",
    title: "Small Chops",
    items: ["Puff Puff", "Samosa", "Spring Rolls"],
    note: "Choose one",
  },
  {
    number: "02",
    label: "Starter",
    title: "Your Choice",
    items: ["Salad", "Assorted Goat Meat Pepper Soup", "Gizzdodo", "Beef Suya", "Lamb Suya", "Moi Moi"],
    note: "Choose one",
  },
  {
    number: "03",
    label: "Main Meal",
    title: "Your Choice",
    items: ["Jollof Rice", "Fried Rice", "Eforiro with Pounded Yam", "Egusi with Pounded Yam", "Amala with Abula", "White Rice and Ayamase"],
    note: "Choose one + choice of protein: Chicken, Beef, Goat Meat or Fish",
  },
  {
    number: "04",
    label: "Dessert",
    title: "Your Choice",
    items: ["Ice Cream Xplosion", "Toffee Pudding"],
    note: "Choose one",
  },
];

export default function SetMenuPage() {
  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden px-6 pt-28 pb-16 sm:pt-36 sm:pb-24 lg:pt-44 lg:pb-28">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f0f] via-[#1a1a1a] to-[#111]" />
        {/* Subtle gold dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(232,204,156,0.6) 1px, transparent 0)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Gold radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-gold-300/[0.04] blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <p className="section-label">Premium Dining Experience</p>
          <h1 className="mt-4 heading-display font-serif">
            Four Course<br className="hidden sm:block" /> Set Menu
          </h1>
          <p className="mt-6 body-text max-w-xl mx-auto">
            A curated dining journey through bold Nigerian flavours — from small chops
            to a signature dessert. Designed for groups and special occasions.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="tel:02039046977" className="btn-gold px-8 py-3.5 text-sm flex items-center gap-2.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call to Book: 020 3904 6977
            </a>
            <a href="mailto:bookings@demisrestaurant.co.uk" className="btn-outline-white px-8 py-3.5 text-sm">
              Email Bookings
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOUR COURSES ─── */}
      <section className="py-20 sm:py-28 bg-[#111]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="section-label">The Menu</p>
            <h2 className="mt-3 heading-lg">Your Four Courses</h2>
            <p className="mt-4 body-text max-w-lg mx-auto text-sm">
              Every guest follows the same journey — with one personal choice at the start.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
            {COURSES.map((course) => (
              <div
                key={course.number}
                className="group relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-8 sm:p-10 transition-all duration-300 hover:border-gold-300/20 overflow-hidden"
              >
                {/* Top accent line */}
                <div className="absolute top-0 left-8 sm:left-10 h-px w-16 bg-gradient-to-r from-gold-300/50 to-transparent" />

                {/* Course number */}
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gold-300/[0.08] text-gold-300 text-xs font-bold tracking-wider mb-5">
                  {course.number}
                </span>

                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-2">
                  {course.label}
                </p>
                <h3 className="text-2xl font-bold text-white mb-6">{course.title}</h3>

                <ul className="space-y-3">
                  {course.items.map((item) => (
                    <li key={item} className="flex items-center gap-3.5">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-gold-300/[0.08] text-gold-300 text-[10px] font-bold shrink-0">
                        ✦
                      </span>
                      <span className="text-[15px] text-stone-300 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>

                {course.note && (
                  <p className="mt-5 inline-block text-xs font-semibold tracking-wide uppercase text-gold-300/70 bg-gold-300/[0.07] rounded-full px-3 py-1.5">
                    {course.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="section-label">How It Works</p>
            <h2 className="mt-3 heading-lg">Booking Your Set Menu</h2>
          </div>

          <div className="space-y-5">
            {[
              {
                step: "01",
                title: "Call or email us",
                desc: "Get in touch to tell us your date, group size, and preferred location.",
              },
              {
                step: "02",
                title: "We set up your group",
                desc: "We create your group event and send you a unique guest selection link (e.g. SM-0042).",
              },
              {
                step: "03",
                title: "Share with your guests",
                desc: "Forward the link to everyone in your group. Each person visits the page and picks their appetiser — Puff Puff, Samosa, or Spring Rolls.",
              },
              {
                step: "04",
                title: "Arrive and enjoy",
                desc: "We have everyone's choices ready. Sit back and enjoy your four course dining experience.",
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className="flex gap-5 items-start rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent p-6 sm:p-8"
              >
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-300/[0.08] text-gold-300 text-xs font-bold tracking-wider shrink-0 mt-0.5">
                  {step}
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm text-stone-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONTACT CTA ─── */}
      <section className="py-16 sm:py-24 bg-[#111]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <p className="section-label">Get in Touch</p>
          <h2 className="mt-3 heading-lg">Ready to Book?</h2>
          <p className="mt-4 body-text max-w-md mx-auto">
            Call or email us to arrange your set menu experience. We&apos;ll take care of everything from there.
          </p>
          <p className="mt-2 text-sm text-stone-500 italic">Regards, Demi</p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="tel:02039046977" className="btn-gold px-8 py-3.5 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              020 3904 6977
            </a>
            <a href="mailto:bookings@demisrestaurant.co.uk" className="btn-outline-white px-8 py-3.5 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              bookings@demisrestaurant.co.uk
            </a>
          </div>

          <div className="mt-10">
            <Link href="/contact" className="text-sm text-gold-300 hover:text-gold-200 font-medium transition-colors">
              Visit Contact Page &rarr;
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
