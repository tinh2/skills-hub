import { ValidationError } from "../../common/errors.js";

const ALLOWED_IMAGE_HOSTS = [
  "i.imgur.com",
  "raw.githubusercontent.com",
  "user-images.githubusercontent.com",
  "cdn.skills-hub.ai",
];

const ALLOWED_VIDEO_HOSTS = [
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
];

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

export function validateMediaUrl(url: string, type: "SCREENSHOT" | "YOUTUBE"): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ValidationError("Invalid URL");
  }

  if (parsed.protocol !== "https:") {
    throw new ValidationError("Only HTTPS URLs are allowed");
  }

  if (type === "SCREENSHOT") {
    if (!ALLOWED_IMAGE_HOSTS.includes(parsed.hostname)) {
      throw new ValidationError(
        `Image host not allowed. Allowed: ${ALLOWED_IMAGE_HOSTS.join(", ")}`,
      );
    }
    const ext = parsed.pathname.toLowerCase().match(/\.[a-z]+$/)?.[0];
    if (!ext || !IMAGE_EXTENSIONS.includes(ext)) {
      throw new ValidationError(
        `Invalid image extension. Allowed: ${IMAGE_EXTENSIONS.join(", ")}`,
      );
    }
    return url;
  }

  // YOUTUBE
  if (!ALLOWED_VIDEO_HOSTS.includes(parsed.hostname)) {
    throw new ValidationError(
      `Video host not allowed. Allowed: ${ALLOWED_VIDEO_HOSTS.join(", ")}`,
    );
  }

  return sanitizeYouTubeUrl(url);
}

export function sanitizeYouTubeUrl(url: string): string {
  const parsed = new URL(url);
  let videoId: string | null = null;

  if (parsed.hostname === "youtu.be") {
    videoId = parsed.pathname.slice(1).split("/")[0];
  } else if (parsed.pathname.startsWith("/embed/")) {
    videoId = parsed.pathname.replace("/embed/", "").split("/")[0];
  } else {
    videoId = parsed.searchParams.get("v");
  }

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new ValidationError("Invalid YouTube video ID");
  }

  return `https://www.youtube.com/embed/${videoId}`;
}
