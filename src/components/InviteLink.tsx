"use client";

import { useState } from "react";

export function InviteLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="max-w-[16rem] truncate rounded bg-tea-950/60 px-2 py-1 text-xs text-tea-300">
        {url}
      </code>
      <button type="button" onClick={copy} className="btn-ghost py-1 text-xs">
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
