import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for using Demi's Restaurant website and ordering services.",
  alternates: { canonical: "https://www.demisrestaurant.co.uk/terms" },
  robots: { index: false },
};

export default function TermsPage() {
  return (
    <div className="">
      <article className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <p className="section-label">Legal</p>
        <h1 className="heading-lg mt-3 mb-10">Terms &amp; Conditions</h1>

        <div className="space-y-8 text-stone-400 leading-relaxed text-sm">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. About These Terms</h2>
            <p>These terms and conditions govern your use of the Demi&apos;s Restaurant website and ordering services. By using our website or placing an order, you agree to these terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Orders &amp; Payment</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>All bulk orders must be placed at least 24 hours in advance.</li>
              <li>Minimum order value for delivery is &pound;30.</li>
              <li>Payment is taken at the time of ordering via Stripe (card payment).</li>
              <li>Prices are displayed in GBP and include VAT where applicable.</li>
              <li>We reserve the right to refuse or cancel orders at our discretion.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Delivery</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>We deliver across London. Delivery fees are calculated based on distance.</li>
              <li>Free delivery on orders over &pound;100.</li>
              <li>Delivery is available from 1:00 PM daily.</li>
              <li>We are not responsible for delays caused by circumstances beyond our control (traffic, weather, etc.).</li>
              <li>A valid delivery address and contact phone number are required.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Cancellations &amp; Refunds</h2>
            <p>Cancellations requested more than 12 hours before the delivery date will receive a full refund. Cancellations within 12 hours of delivery are subject to a 50% charge as ingredients may have already been purchased. Once food has been delivered, refunds are at our discretion.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Allergies &amp; Dietary Requirements</h2>
            <p>Our food may contain allergens including nuts, gluten, dairy, and shellfish. Please inform us of any dietary requirements or allergies when placing your order. While we take care, we cannot guarantee a completely allergen-free environment.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Intellectual Property</h2>
            <p>All content on this website, including text, images, logos, and design, is the property of Demi&apos;s Restaurant and protected by copyright law. You may not reproduce or distribute any content without our written permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Limitation of Liability</h2>
            <p>Demi&apos;s Restaurant is not liable for any indirect, incidental, or consequential damages arising from the use of our services or website, to the fullest extent permitted by law.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Changes to Terms</h2>
            <p>We may update these terms from time to time. Continued use of our website or services after changes constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Contact</h2>
            <p>
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
