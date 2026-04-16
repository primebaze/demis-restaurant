import Link from "next/link";

export function Footer() {
  return (
    <footer className="pb-28 pt-16 sm:pb-32">
      <div className="mx-auto max-w-2xl px-6 text-center">
        {/* Footer links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-stone-500">
          <Link href="/menu" className="hover:text-white transition-colors">Menu</Link>
          <Link href="/bulk-orders" className="hover:text-white transition-colors">Bulk Order</Link>
          <Link href="/locations/cricklewood" className="hover:text-white transition-colors">Cricklewood</Link>
          <Link href="/locations/streatham" className="hover:text-white transition-colors">Streatham Hill</Link>
          <Link href="/events" className="hover:text-white transition-colors">Events</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link>
          <Link href="/booking" className="hover:text-white transition-colors">
            Booking
          </Link>
          <Link href="/sustainability" className="hover:text-white transition-colors">Sustainability</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
        </nav>

        <p className="mt-8 text-xs text-stone-600">
          &copy; {new Date().getFullYear()} Demi&apos;s Restaurant
        </p>
      </div>
    </footer>
  );
}
