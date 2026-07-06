import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CommentForm } from "./CommentForm";
import { ViewTracker } from "./ViewTracker";
import { ShareButtons } from "./ShareButtons";
import { cache } from "react";

// ISR: pages are pre-built at deploy (see generateStaticParams) and served as
// static HTML from the CDN, so navigation is instant. They rebuild in the
// background at most once a minute to pick up edits and new comments.
export const revalidate = 60;

// Pre-render every published post at build time so the first visit is instant,
// not rendered on demand. New posts published later fall back to on-demand ISR
// and get pre-built on the next deploy.
export async function generateStaticParams() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "published" },
      select: { slug: true },
    });
    return posts.map((p) => ({ slug: p.slug }));
  } catch {
    // DB unreachable during build — posts still render on demand via ISR.
    return [];
  }
}

const getPost = cache(async (slug: string) => {
  return prisma.blogPost.findFirst({
    where: { slug, status: "published" },
    include: {
      author: { select: { name: true, avatarUrl: true, bio: true } },
      category: { select: { name: true, slug: true } },
      comments: {
        where: { status: "approved" },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, content: true, createdAt: true },
      },
    },
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) return { title: "Post Not Found" };

  const title = post.metaTitle || `${post.title} | Demi's Restaurant Blog`;
  const description = post.metaDescription || post.excerpt || "";

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.demisrestaurant.co.uk/blog/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://www.demisrestaurant.co.uk/blog/${slug}`,
      images: post.featuredImage ? [{ url: post.featuredImage }] : [{ url: "/og-image.jpg" }],
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author.name],
      section: post.category?.name,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.featuredImage ? [post.featuredImage] : ["/og-image.jpg"],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  const viewCount = post.views;

  // Related posts: same category first, then top up with other recent posts to reach 3.
  // Both queries run in parallel, then merge + dedupe in JS.
  const relatedSelect = { slug: true, title: true, excerpt: true, featuredImage: true };
  const baseWhere = { status: "published" as const, slug: { not: slug } };

  const [sameCategory, recent] = await Promise.all([
    post.categoryId
      ? prisma.blogPost.findMany({
          where: { ...baseWhere, categoryId: post.categoryId },
          select: relatedSelect,
          orderBy: { publishedAt: "desc" },
          take: 3,
        })
      : Promise.resolve([]),
    prisma.blogPost.findMany({
      where: baseWhere,
      select: relatedSelect,
      orderBy: { publishedAt: "desc" },
      take: 4,
    }),
  ]);

  const related: typeof recent = [];
  const seen = new Set<string>();
  for (const r of [...sameCategory, ...recent]) {
    if (seen.has(r.slug)) continue;
    seen.add(r.slug);
    related.push(r);
    if (related.length === 3) break;
  }

  const SITE = "https://www.demisrestaurant.co.uk";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage ? [post.featuredImage] : [`${SITE}/og-image.jpg`],
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    ...(post.category ? { articleSection: post.category.name } : {}),
    author: {
      "@type": "Person",
      name: post.author.name,
    },
    publisher: {
      "@type": "Organization",
      name: "Demi's Restaurant",
      url: SITE,
      logo: {
        "@type": "ImageObject",
        url: `${SITE}/og-image.jpg`,
      },
    },
    mainEntityOfPage: `${SITE}/blog/${slug}`,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Blog", item: `${SITE}/blog` },
      ...(post.category
        ? [{ "@type": "ListItem", position: 2, name: post.category.name, item: `${SITE}/blog?category=${post.category.slug}` }]
        : []),
      { "@type": "ListItem", position: post.category ? 3 : 2, name: post.title, item: `${SITE}/blog/${slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] pt-32 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <ViewTracker slug={slug} />

      <article className="mx-auto max-w-3xl px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-stone-500">
          <Link href="/blog" className="hover:text-white transition">Blog</Link>
          {post.category && (
            <>
              <span className="mx-2">/</span>
              <Link href={`/blog?category=${post.category.slug}`} className="hover:text-white transition">
                {post.category.name}
              </Link>
            </>
          )}
        </nav>

        {/* Header */}
        <header className="mb-10">
          {post.category && (
            <span className="text-[10px] uppercase tracking-widest text-gold-300 font-semibold">
              {post.category.name}
            </span>
          )}
          <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-[family-name:var(--font-display)] leading-tight">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-4 text-lg text-stone-400">{post.excerpt}</p>
          )}
          <div className="mt-6 flex items-center gap-4">
            {post.author.avatarUrl && (
              <img
                src={post.author.avatarUrl}
                alt={post.author.name}
                className="w-10 h-10 rounded-full object-cover"
                width={40}
                height={40}
              />
            )}
            <div>
              <p className="text-sm font-medium text-white">{post.author.name}</p>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                {post.publishedAt && (
                  <time dateTime={post.publishedAt.toISOString()}>
                    {new Date(post.publishedAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </time>
                )}
                {post.publishedAt && <span aria-hidden>·</span>}
                <span>{viewCount.toLocaleString("en-GB")} {viewCount === 1 ? "view" : "views"}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Share (top) */}
        <div className="mb-10">
          <ShareButtons url={`${SITE}/blog/${slug}`} title={post.title} />
        </div>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="relative mb-10 w-full h-[220px] sm:h-[280px] md:h-[360px] max-h-[400px] rounded-2xl overflow-hidden">
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-invert prose-gold max-w-none
            prose-headings:font-[family-name:var(--font-display)]
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-stone-300 prose-p:leading-relaxed
            prose-a:text-gold-300 prose-a:no-underline hover:prose-a:text-gold-400
            prose-strong:text-white
            prose-blockquote:border-gold-300/30 prose-blockquote:text-stone-400
            prose-img:rounded-xl
            prose-code:text-gold-300
          "
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Share (bottom) */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <ShareButtons url={`${SITE}/blog/${slug}`} title={post.title} />
        </div>

        {/* Author Bio */}
        {post.author.bio && (
          <div className="mt-14 p-6 bg-[#1a1a1a] border border-white/5 rounded-2xl">
            <div className="flex items-center gap-4">
              {post.author.avatarUrl && (
                <img
                  src={post.author.avatarUrl}
                  alt={post.author.name}
                  className="w-14 h-14 rounded-full object-cover"
                  width={56}
                  height={56}
                />
              )}
              <div>
                <p className="font-semibold text-white">{post.author.name}</p>
                <p className="text-sm text-stone-400 mt-1">{post.author.bio}</p>
              </div>
            </div>
          </div>
        )}

        {/* Related posts */}
        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-white/5">
            <h2 className="text-2xl font-bold text-white mb-6 font-[family-name:var(--font-display)]">
              You might also like
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {related.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="group">
                  <article className="h-full bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition">
                    {r.featuredImage && (
                      <div className="aspect-[16/9] overflow-hidden relative">
                        <Image
                          src={r.featuredImage}
                          alt={r.title}
                          fill
                          className="object-cover group-hover:scale-105 transition duration-500"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-sm font-semibold text-white group-hover:text-gold-300 transition line-clamp-2">
                        {r.title}
                      </h3>
                      {r.excerpt && (
                        <p className="mt-2 text-xs text-stone-400 line-clamp-2">{r.excerpt}</p>
                      )}
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Comments Section */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold text-white mb-6 font-[family-name:var(--font-display)]">
            Comments ({post.comments.length})
          </h2>

          {post.comments.length === 0 ? (
            <p className="text-stone-500 text-sm mb-8">No comments yet. Be the first to share your thoughts!</p>
          ) : (
            <div className="space-y-6 mb-10">
              {post.comments.map((comment) => (
                <div key={comment.id} className="p-5 bg-[#1a1a1a] border border-white/5 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{comment.name}</span>
                    <time className="text-[10px] text-stone-600">
                      {new Date(comment.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </time>
                  </div>
                  <p className="text-sm text-stone-400">{comment.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Comment Form */}
          <CommentForm postSlug={slug} />
        </section>
      </article>
    </div>
  );
}
