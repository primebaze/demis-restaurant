import Link from "next/link";

/** "Most read" numbered list, shared by the blog index and post pages. */
export function MostRead({ posts }: { posts: { slug: string; title: string }[] }) {
  if (!posts.length) return null;
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
