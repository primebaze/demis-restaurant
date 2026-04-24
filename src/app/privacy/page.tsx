import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Demi's Restaurant. How we collect, use, and protect your personal information.",
  alternates: { canonical: "https://www.demisrestaurant.co.uk/privacy" },
  robots: { index: false },
};

export default function PrivacyPage() {
  return (
    <div className="">
      <article className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <p className="section-label">Legal</p>
        <h1 className="heading-lg mt-3 mb-10">Privacy Policy</h1>

        <div className="space-y-8 text-stone-400 leading-relaxed text-sm">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Who We Are</h2>
            <p>Demi&apos;s Restaurant (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) operates from 89 Cricklewood Broadway, London NW2 3JG, United Kingdom. We are committed to protecting your personal data and respecting your privacy in accordance with UK GDPR and the Data Protection Act 2018.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Information We Collect</h2>
            <p>We may collect the following information when you use our website, place an order, or make a reservation:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Name, email address, and phone number</li>
              <li>Delivery address and postcode</li>
              <li>Order history and preferences</li>
              <li>Payment information (processed securely via Stripe)</li>
              <li>Technical data such as IP address, browser type, and device information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Processing and fulfilling your orders and reservations</li>
              <li>Communicating with you about your order status</li>
              <li>Improving our services and website experience</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Payment Security</h2>
            <p>All payments are processed securely through Stripe. We do not store your full card details on our servers. Stripe is PCI DSS Level 1 certified.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Data Sharing</h2>
            <p>We do not sell or share your personal data with third parties for marketing purposes. We may share data with delivery partners and payment processors solely to fulfil your orders.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Your Rights</h2>
            <p>Under UK GDPR, you have the right to access, rectify, erase, or restrict the processing of your personal data. To exercise these rights, please email us at <a href="mailto:bookings@demisrestaurant.co.uk" className="text-white hover:underline">bookings@demisrestaurant.co.uk</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Cookies</h2>
            <p>Our website may use essential cookies to ensure it functions correctly. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Contact</h2>
            <p>For any privacy-related enquiries, please contact us:</p>
            <p className="mt-2">
              Email: <a href="mailto:bookings@demisrestaurant.co.uk" className="text-white hover:underline">bookings@demisrestaurant.co.uk</a><br />
              Phone: <a href="tel:02039046977" className="text-white hover:underline">020 3904 6977</a><br />
              Address: 89 Cricklewood Broadway, London NW2 3JG
            </p>
          </section>

          <p className="text-stone-400 text-xs pt-4">Last updated: January 2025</p>
        </div>
      </article>
    </div>
  );
}
