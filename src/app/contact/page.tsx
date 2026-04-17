import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Get in Touch",
  description:
    "Contact Demi's Restaurant at 89 Cricklewood Broadway, London NW2 3JG. Call 020 3904 6977, email bookings@demisrestaurant.co.uk, or visit us. Reservations, catering enquiries, and bulk orders welcome.",
  keywords: [
    "contact Demi's Restaurant",
    "Nigerian restaurant phone number",
    "book table Cricklewood",
    "NW2 restaurant contact",
    "African restaurant enquiry",
  ],
  openGraph: {
    title: "Contact Demi's Restaurant — Call, Email, or Visit Us",
    description: "Get in touch with Demi's Restaurant. 89 Cricklewood Broadway, London NW2 3JG. Phone: 020 3904 6977.",
  },
  alternates: {
    canonical: "https://demisrestaurant.co.uk/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="">
      {/* Header */}
      <section className="px-6 pt-16 pb-10 sm:pt-24 sm:pb-14">
        <div className="mx-auto max-w-3xl lg:max-w-4xl text-center">
          <p className="section-label">Contact Us</p>
          <h1 className="mt-4 heading-display">
            We&apos;d love to hear from you.
          </h1>
          <p className="mt-4 body-text max-w-xl mx-auto lg:max-w-2xl">
            Whether you have a question, want to book a table, or need to arrange catering for an event &mdash; get in touch.
          </p>
        </div>
      </section>

      {/* Contact details */}
      <section className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-3xl lg:max-w-5xl px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center sm:text-left">
              <h2 className="font-semibold text-white">Visit Us</h2>
              <address className="mt-2 text-sm text-stone-400 not-italic leading-relaxed">
                89 Cricklewood Broadway<br />
                London NW2 3JG<br />
                United Kingdom
              </address>
              <a
                href="https://www.google.com/maps/search/89+Cricklewood+Broadway+London+NW2+3JG"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-white font-medium hover:text-stone-400 transition-colors"
              >
                Get Directions &rarr;
              </a>
            </div>

            <div className="text-center sm:text-left">
              <h2 className="font-semibold text-white">Call Us</h2>
              <p className="mt-2 text-sm text-stone-400">Reservations, takeaway, or general enquiries.</p>
              <a href="tel:02039046977" className="mt-1 inline-block font-semibold text-white hover:text-stone-400 transition-colors">
                020 3904 6977
              </a>
            </div>

            <div className="text-center sm:text-left">
              <h2 className="font-semibold text-white">Email Us</h2>
              <p className="mt-2 text-sm text-stone-400">Bookings, catering enquiries, and bulk orders.</p>
              <a href="mailto:bookings@demisrestaurant.co.uk" className="mt-1 inline-block text-sm font-semibold text-white hover:text-stone-400 transition-colors">
                bookings@demisrestaurant.co.uk
              </a>
            </div>

            <div className="text-center sm:text-left">
              <h2 className="font-semibold text-white">Opening Hours</h2>
              <p className="mt-2 text-sm text-stone-400">Monday &ndash; Sunday</p>
              <p className="text-sm text-stone-400">12:00 PM &ndash; Late</p>
            </div>
          </div>

          {/* WhatsApp + Booking */}
          <div className="mt-12 grid sm:grid-cols-2 gap-6 lg:gap-8">
            <div className="rounded-xl border border-white/10 p-6 text-center">
              <h2 className="font-semibold text-white">WhatsApp</h2>
              <p className="mt-2 text-sm text-stone-400">Quick questions? Message us for a fast response.</p>
              <a
                href="https://wa.me/442039046977"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold mt-4 text-xs"
              >
                Message on WhatsApp
              </a>
            </div>

            <div className="rounded-xl border border-white/10 p-6 text-center">
              <h2 className="font-semibold text-white">Book a Table</h2>
              <p className="mt-2 text-sm text-stone-400">Reserve online or walk in. 89 Cricklewood Broadway.</p>
              <a
                href="/booking"
                className="btn-gold mt-4 text-xs"
              >
                Book Online
              </a>
            </div>
          </div>

          {/* Map */}
          <div className="mt-12 rounded-xl overflow-hidden h-72 sm:h-80 lg:h-[420px] border border-white/10">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2481.2!2d-0.2136!3d51.555!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s89+Cricklewood+Broadway+London+NW2+3JG!5e0!3m2!1sen!2suk!4v1"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Demi's Restaurant — 89 Cricklewood Broadway, London NW2 3JG"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
