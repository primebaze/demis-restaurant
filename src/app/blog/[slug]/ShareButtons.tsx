"use client";

import { useState } from "react";

/**
 * Social share buttons for a blog post. Uses plain share-intent URLs
 * (no third-party scripts) plus a copy-to-clipboard button.
 */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [igHint, setIgHint] = useState(false);

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  const links = [
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${t}%20${u}`,
      cls: "hover:bg-[#25D366]/15 hover:text-[#25D366]",
      icon: (
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.9c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.8c2.17 0 4.2.85 5.74 2.38a8.07 8.07 0 0 1 2.38 5.72c0 4.47-3.64 8.1-8.11 8.1a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.12.82.83-3.04-.19-.31a8.02 8.02 0 0 1-1.26-4.36c0-4.47 3.64-8.1 8.1-8.1Zm-2.5 4.3c-.14 0-.37.05-.56.26-.19.21-.74.72-.74 1.76s.76 2.04.87 2.18c.11.14 1.48 2.36 3.66 3.21 1.81.71 2.18.57 2.58.53.4-.04 1.28-.52 1.46-1.03.18-.5.18-.94.13-1.03-.05-.09-.19-.14-.4-.25-.21-.11-1.28-.63-1.48-.7-.2-.07-.34-.11-.49.11-.14.21-.56.7-.68.85-.13.14-.25.16-.46.05-.21-.11-.9-.33-1.71-1.05a6.4 6.4 0 0 1-1.18-1.47c-.12-.21-.01-.32.09-.43.1-.1.21-.25.32-.38.11-.13.14-.22.21-.36.07-.14.04-.27-.02-.38-.05-.11-.48-1.18-.67-1.61-.16-.38-.33-.36-.46-.36l-.39-.01Z" />
      ),
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      cls: "hover:bg-[#1877F2]/15 hover:text-[#1877F2]",
      icon: (
        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12Z" />
      ),
    },
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      cls: "hover:bg-white/15 hover:text-white",
      icon: (
        <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.22-6.82-5.97 6.82H1.66l7.73-8.83L1.24 2.25h6.83l4.71 6.23 5.46-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.05l12.03 15.64Z" />
      ),
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      cls: "hover:bg-[#0A66C2]/15 hover:text-[#0A66C2]",
      icon: (
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
      ),
    },
    {
      name: "Email",
      href: `mailto:?subject=${t}&body=${u}`,
      cls: "hover:bg-gold-300/15 hover:text-gold-300",
      icon: (
        <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z" />
      ),
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  // Instagram has no web link-share URL. On mobile, open the native share
  // sheet (which lists Instagram). On desktop, copy the link to paste into a story/bio.
  async function shareInstagram() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* user cancelled — ignore */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setIgHint(true);
      setTimeout(() => setIgHint(false), 2600);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs uppercase tracking-widest text-stone-500 mr-1">Share</span>
      {links.map((l) => (
        <a
          key={l.name}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${l.name}`}
          title={`Share on ${l.name}`}
          className={`flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.03] text-stone-400 transition ${l.cls}`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
            {l.icon}
          </svg>
        </a>
      ))}
      <div className="relative">
        <button
          onClick={shareInstagram}
          aria-label="Share on Instagram"
          title="Share on Instagram"
          className="flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.03] text-stone-400 transition hover:bg-[#E4405F]/15 hover:text-[#E4405F]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
            <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 1.62c-3.15 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.17-.06 1.24-.07 1.59-.07 4.74s.01 3.5.07 4.74c.05 1.14.24 1.76.4 2.17.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.59.07-4.74s-.01-3.5-.07-4.74c-.05-1.14-.24-1.76-.4-2.17a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4-1.24-.06-1.59-.07-4.74-.07Zm0 2.76a5.3 5.3 0 1 1 0 10.6 5.3 5.3 0 0 1 0-10.6Zm0 1.62a3.68 3.68 0 1 0 0 7.36 3.68 3.68 0 0 0 0-7.36Zm5.48-.29a1.24 1.24 0 1 1-2.48 0 1.24 1.24 0 0 1 2.48 0Z" />
          </svg>
        </button>
        {igHint && (
          <span className="absolute left-1/2 -translate-x-1/2 top-11 z-10 whitespace-nowrap rounded-lg bg-[#1a1a1a] border border-white/10 px-3 py-1.5 text-[11px] text-white shadow-lg">
            Link copied — paste into your Instagram story or bio
          </span>
        )}
      </div>
      <button
        onClick={copy}
        aria-label="Copy link"
        title="Copy link"
        className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-white/10 bg-white/[0.03] text-stone-400 text-xs transition hover:bg-white/10 hover:text-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
