export type InstaItem = {
  id: string;
  caption: string;
  permalink: string;
  thumb: string;
  isVideo: boolean;
};

// Shown when no Instagram token is configured, or the API call fails.
// Mirrors the manual reels used elsewhere on the site.
const FALLBACK: InstaItem[] = [
  { id: "f1", caption: "Afrobeats night — energy, vibes & music all night long", permalink: "https://www.instagram.com/reel/DXPgEe5jPji/", thumb: "/reel-1.jpg", isVideo: true },
  { id: "f2", caption: "Come spend your weekend with us", permalink: "https://www.instagram.com/reel/DXOygqKDM8D/", thumb: "/reel-2.jpg", isVideo: true },
  { id: "f3", caption: "Still serving the best Nigerian food in London", permalink: "https://www.instagram.com/reel/DXHCsjMDEog/", thumb: "/reel-3.jpg", isVideo: true },
  { id: "f4", caption: "The only place you need to be this Friday", permalink: "https://www.instagram.com/reel/DXFF6f7jFEJ/", thumb: "/reel-4.jpg", isVideo: true },
];

type IgMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
};

/**
 * Fetch the latest Instagram posts via the Instagram Graph API.
 *
 * Requires a long-lived access token in the INSTAGRAM_TOKEN env var (from an
 * Instagram Business/Creator account). The result is cached for an hour, so the
 * feed auto-updates without hammering the API. If the token is missing or the
 * request fails, it returns the manual FALLBACK so the section never breaks.
 */
export async function getInstagramPosts(
  limit = 8
): Promise<{ items: InstaItem[]; live: boolean }> {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) return { items: FALLBACK, live: false };

  try {
    const fields = "id,caption,media_type,media_url,thumbnail_url,permalink";
    const url = `https://graph.instagram.com/me/media?fields=${fields}&limit=${limit}&access_token=${token}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return { items: FALLBACK, live: false };

    const data = (await res.json()) as { data?: IgMedia[] };
    const items: InstaItem[] = (data.data || [])
      .map((m) => ({
        id: m.id,
        caption: (m.caption || "").split("\n")[0].slice(0, 120),
        permalink: m.permalink || "https://www.instagram.com/demisrestaurant/",
        thumb: m.media_type === "VIDEO" ? m.thumbnail_url || "" : m.media_url || "",
        isVideo: m.media_type === "VIDEO",
      }))
      .filter((m) => m.thumb);

    if (items.length === 0) return { items: FALLBACK, live: false };
    return { items, live: true };
  } catch {
    return { items: FALLBACK, live: false };
  }
}
