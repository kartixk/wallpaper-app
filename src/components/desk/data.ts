export const INSTAGRAM_URL = "https://www.instagram.com/pencill.7";
export const YOUTUBE_URL = "https://www.youtube.com/@pencill7";
export const EMAIL = "challaabi12@gmail.com";

export const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Work", href: "#work" },
  { label: "Wall Art", href: "#wall-art" },
  { label: "Reel", href: "#reel" },
  { label: "Contact", href: "#contact" },
];

export interface WorkCategory {
  title: string;
  images: string[];
}

export const WORK: WorkCategory[] = [
  {
    title: "Pencil Sketches",
    images: [
      "/gallery-1.jpeg",
      "/pencilsketches/pencilsketches1.jpg",
      "/pencilsketches/pencilsketches2.jpeg",
      "/pencilsketches/pencilsketches3.webp",
      "/pencilsketches/pencilsketches4.jpeg",
      "/pencilsketches/pencilsketches5.jpeg",
    ],
  },
  {
    title: "Digital Arts",
    images: [
      "/gallery-2.jpeg",
      "/digitalarts/digitalarts5.jpeg",
      "/digitalarts/digitalarts1.webp",
      "/digitalarts/digitalarts2.webp",
      "/digitalarts/digitalarts3.webp",
      "/digitalarts/digitalarts4.jpg",
    ],
  },
  { title: "Charcoal Portraits", images: ["/gallery-3.jpg"] },
  { title: "Watercolors", images: ["/gallery-5.jpeg"] },
  { title: "Pen Sketches", images: ["/gallery-6.jpeg"] },
  { title: "Acrylic & Pen", images: ["/gallery-4.jpeg"] },
];

export const WALL_ART_VIDEOS = [
  {
    src: "/wall-art-1.mp4",
    label: "The Paradise",
    instagramUrl: "https://www.instagram.com/reel/DVhubNQkdgM/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
  },
  {
    src: "/wall-art-2.mp4",
    label: "PEDDI",
    instagramUrl: "https://www.instagram.com/reel/DZJnRCfRHuY/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
  },
];
