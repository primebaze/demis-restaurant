import Image from "next/image";
import Link from "next/link";

const EXPERIENCES = [
  { title: "Book a Table", desc: "Cricklewood & Streatham Hill", href: "/booking", img: "/reel-1.jpg", cta: "Reserve" },
  { title: "Sunday Buffet", desc: "All-you-can-eat Nigerian feast", href: "/buffet", img: "/reel-2.jpg", cta: "See buffet" },
  { title: "Events & Private Dining", desc: "Parties, celebrations & set menus", href: "/events", img: "/events.jpeg", cta: "Enquire" },
  { title: "Bulk Catering", desc: "Party food delivered across London", href: "/bulk-orders", img: "/reel-3.jpg", cta: "Order" },
];

/** Visual cross-promotion band ("Come taste it for yourself"), shared across blog pages. */
export function ExploreDemis() {
  return (
    <section className="mt-16 -mx-6 px-6 py-12 bg-gradient-to-b from-[#161616] to-[#0f0f0f] border-y border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-1 font-[family-name:var(--font-display)]">
          Come taste it for yourself
        </h2>
        <p className="text-sm text-stone-400 mb-8">
          Reading&apos;s good — dining&apos;s better. Here&apos;s how to visit Demi&apos;s.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {EXPERIENCES.map((item) => (
            <div
              key={item.href}
              className="flex flex-col bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden hover:border-gold-300/40 transition"
            >
              <Link href={item.href} className="group block">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={item.img}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-500"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                </div>
              </Link>
              <div className="flex flex-col flex-1 p-4">
                <Link href={item.href} className="group">
                  <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-gold-300 transition leading-snug">
                    {item.title}
                  </h3>
                </Link>
                <p className="mt-1 text-xs text-stone-400 flex-1">{item.desc}</p>
                <Link
                  href={item.href}
                  className="mt-3 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gold-300 text-black text-xs font-semibold hover:bg-gold-400 transition"
                >
                  {item.cta} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
