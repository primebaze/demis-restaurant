import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CommentForm } from "./CommentForm";
import { cache } from "react";

export const dynamic = "force-dynamic";

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage || undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: post.author.name,
    },
    publisher: {
      "@type": "Organization",
      name: "Demi's Restaurant",
      url: "https://www.demisrestaurant.co.uk",
    },
    mainEntityOfPage: `https://www.demisrestaurant.co.uk/blog/${slug}`,
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] pt-32 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
              <img src={post.author.avatarUrl} alt={post.author.name} className="w-10 h-10 rounded-full object-cover" />
            )}
            <div>
              <p className="text-sm font-medium text-white">{post.author.name}</p>
              {post.publishedAt && (
                <time className="text-xs text-stone-500" dateTime={post.publishedAt.toISOString()}>
                  {new Date(post.publishedAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </time>
              )}
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="mb-10 rounded-2xl overflow-hidden max-h-[400px]">
            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
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

        {/* Author Bio */}
        {post.author.bio && (
          <div className="mt-14 p-6 bg-[#1a1a1a] border border-white/5 rounded-2xl">
            <div className="flex items-center gap-4">
              {post.author.avatarUrl && (
                <img src={post.author.avatarUrl} alt={post.author.name} className="w-14 h-14 rounded-full object-cover" />
              )}
              <div>
                <p className="font-semibold text-white">{post.author.name}</p>
                <p className="text-sm text-stone-400 mt-1">{post.author.bio}</p>
              </div>
            </div>
          </div>
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
