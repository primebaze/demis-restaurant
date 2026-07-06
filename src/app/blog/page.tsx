import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getInstagramPosts } from "@/lib/instagram";
import { InstagramShorts } from "./InstagramShorts";

export const metadata: Metadata = {
  title: "Blog | Demi's Restaurant",
  description: "Explore Nigerian food culture, recipes, restaurant news, and dining tips from Demi's Restaurant in London.",
  alternates: {
    canonical: "https://www.demisrestaurant.co.uk/blog",
  },
  openGraph: {
    title: "Blog | Demi's Restaurant",
    description: "Explore Nigerian food culture, recipes, restaurant news, and dining tips from Demi's Restaurant in London.",
    url: "https://www.demisrestaurant.co.uk/blog",
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

  // "Most read" only shows on the unfiltered first page (the index view).
  const showExtras = page === 1 && !category && !search;

  const [posts, total, categories, mostRead] = await Promise.all([
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
    showExtras
      ? prisma.blogPost.findMany({
          where: { status: "published" },
          select: { slug: true, title: true, views: true },
          orderBy: [{ views: "desc" }, { publishedAt: "desc" }],
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Instagram "Shorts" — cached hourly, falls back to manual reels without a token.
  const shorts = showExtras ? (await getInstagramPosts(8)).items : [];

  // Visual cross-promotion band (the "Stay up or catch up on iPlayer" equivalent).
  const experiences = [
    { title: "Book a Table", desc: "Cricklewood & Streatham Hill", href: "/booking", img: "/reel-1.jpg", cta: "Reserve" },
    { title: "Sunday Buffet", desc: "All-you-can-eat Nigerian feast", href: "/buffet", img: "/reel-2.jpg", cta: "See buffet" },
    { title: "Events & Private Dining", desc: "Parties, celebrations & set menus", href: "/events", img: "/events.jpeg", cta: "Enquire" },
    { title: "Bulk Catering", desc: "Party food delivered across London", href: "/bulk-orders", img: "/reel-3.jpg", cta: "Order" },
  ];

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
          <>
          {showExtras && (
            <h2 className="text-2xl font-bold text-white mb-6 font-[family-name:var(--font-display)]">
              Latest stories
            </h2>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                <article className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition">
                  {post.featuredImage && (
                    <div className="aspect-[16/9] overflow-hidden relative">
                      <Image
                        src={post.featuredImage}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
                        <img
                          src={post.author.avatarUrl}
                          alt={post.author.name}
                          className="w-6 h-6 rounded-full object-cover"
                          width={24}
                          height={24}
                        />
                      )}
                      <span className="text-xs text-stone-500">{post.author.name}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
          </>
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

        {/* Most read */}
        {showExtras && mostRead.length > 0 && (
          <section className="mt-20 pt-10 border-t border-white/5">
            <h2 className="text-2xl font-bold text-white mb-6 font-[family-name:var(--font-display)]">
              Most read
            </h2>
            <ol className="grid sm:grid-cols-2 gap-x-10 gap-y-1">
              {mostRead.map((p, i) => (
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
        )}

        {/* Instagram Shorts */}
        {showExtras && <InstagramShorts items={shorts} />}

        {/* Experience Demi's — visual cross-promotion band */}
        {showExtras && (
          <section className="mt-16 -mx-6 px-6 py-12 bg-gradient-to-b from-[#161616] to-[#0f0f0f] border-y border-white/5">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-1 font-[family-name:var(--font-display)]">
                Come taste it for yourself
              </h2>
              <p className="text-sm text-stone-400 mb-8">Reading&apos;s good — dining&apos;s better. Here&apos;s how to visit Demi&apos;s.</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {experiences.map((item) => (
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
        )}
      </div>
    </div>
  );
}
