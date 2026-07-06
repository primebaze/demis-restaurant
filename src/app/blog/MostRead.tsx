import Link from "next/link";

/**
 * "Most read" numbered list.
 * - "grid" (default): full-width, two columns. Used at the bottom of pages.
 * - "sidebar": compact single column for a narrow right-hand rail.
 */
export function MostRead({
  posts,
  variant = "grid",
}: {
  posts: { slug: string; title: string }[];
  variant?: "grid" | "sidebar";
}) {
  if (!posts.length) return null;

  if (variant === "sidebar") {
    return (
      <section>
        <h2 className="text-xl font-bold text-white mb-4 font-[family-name:var(--font-display)]">
          Most read
        </h2>
        <ol>
          {posts.map((p, i) => (
            <li key={p.slug} className="flex items-start gap-3 py-3 border-b border-white/5">
              <span className="text-2xl font-bold text-gold-300/70 leading-none w-6 shrink-0 font-[family-name:var(--font-display)]">
                {i + 1}
              </span>
              <Link
                href={`/blog/${p.slug}`}
                className="text-sm text-white font-medium hover:text-gold-300 transition leading-snug"
              >
                {p.title}
              </Link>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section className="mt-16 pt-10 border-t border-white/5">
      <h2 className="text-2xl font-bold text-white mb-6 font-[family-name:var(--font-display)]">
        Most read
      </h2>
      <ol className="grid sm:grid-cols-2 gap-x-10 gap-y-1">
        {posts.map((p, i) => (
          <li key={p.slug} className="flex items-start gap-4 py-3 border-b border-white/5">
            <span className="text-3xl font-bold text-gold-300/70 leading-none w-8 shrink-0 font-[family-name:var(--font-display)]">
              {i + 1}
            </span>
            <Link
              href={`/blog/${p.slug}`}
              className="text-white font-medium hover:text-gold-300 transition leading-snug"
            >
              {p.title}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
