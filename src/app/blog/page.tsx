import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog | Demi's Restaurant",
  description: "Explore Nigerian food culture, recipes, restaurant news, and dining tips from Demi's Restaurant in London.",
  alternates: {
    canonical: "https://demisrestaurant.co.uk/blog",
  },
  openGraph: {
    title: "Blog | Demi's Restaurant",
    description: "Explore Nigerian food culture, recipes, restaurant news, and dining tips from Demi's Restaurant in London.",
    url: "https://demisrestaurant.co.uk/blog",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Demi's Restaurant Blog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | Demi's Restaurant",
    description: "Explore Nigerian food culture, recipes, restaurant news, and dining tips from Demi's Restaurant in London.",
    images: ["/og-image.jpg"],
  },
};

export const dynamic = "force-dynamic";

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const limit = 12;
  const category = params.category || undefined;
  const search = params.search || undefined;

  const where: Record<string, unknown> = { status: "published" };
  if (category) where.category = { slug: category };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { excerpt: { contains: search, mode: "insensitive" } },
    ];
  }

  const [posts, total, categories] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        featuredImage: true,
        publishedAt: true,
        author: { select: { name: true, avatarUrl: true } },
        category: { select: { name: true, slug: true } },
      },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.blogPost.count({ where }),
    prisma.blogCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-[#0f0f0f] pt-32 pb-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-[family-name:var(--font-display)]">
            Our Blog
          </h1>
          <p className="mt-4 text-stone-400 max-w-xl mx-auto">
            Stories, recipes, and news from Demi&apos;s Nigerian Restaurant
          </p>
        </div>

        {/* Search + Categories */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
          <form method="GET" action="/blog" className="flex-1 w-full">
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search articles..."
              className="w-full px-5 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-gold-400 text-sm"
            />
          </form>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/blog"
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                !category ? "bg-gold-300 text-black" : "bg-white/5 text-stone-400 hover:text-white"
              }`}
            >
              All
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/blog?category=${cat.slug}`}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  category === cat.slug ? "bg-gold-300 text-black" : "bg-white/5 text-stone-400 hover:text-white"
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Posts Grid */}
        {posts.length === 0 ? (
          <p className="text-center text-stone-500 py-20">No posts found.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                <article className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition">
                  {post.featuredImage && (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      {post.category && (
                        <span className="text-[10px] uppercase tracking-widest text-gold-300 font-semibold">
                          {post.category.name}
                        </span>
                      )}
                      {post.publishedAt && (
                        <span className="text-[10px] text-stone-600">
                          {new Date(post.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-white group-hover:text-gold-300 transition line-clamp-2">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="mt-2 text-sm text-stone-400 line-clamp-3">{post.excerpt}</p>
                    )}
                    <div className="mt-4 flex items-center gap-2">
                      {post.author.avatarUrl && (
                        <img src={post.author.avatarUrl} alt={post.author.name} className="w-6 h-6 rounded-full object-cover" />
                      )}
                      <span className="text-xs text-stone-500">{post.author.name}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-12">
            {page > 1 && (
              <Link
                href={`/blog?page=${page - 1}${category ? `&category=${category}` : ""}${search ? `&search=${search}` : ""}`}
                className="px-5 py-2.5 text-sm text-stone-400 bg-[#1a1a1a] border border-white/10 rounded-xl hover:text-white transition"
              >
                Previous
              </Link>
            )}
            <span className="text-sm text-stone-500">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link
                href={`/blog?page=${page + 1}${category ? `&category=${category}` : ""}${search ? `&search=${search}` : ""}`}
                className="px-5 py-2.5 text-sm text-stone-400 bg-[#1a1a1a] border border-white/10 rounded-xl hover:text-white transition"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
