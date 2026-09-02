"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export interface AboutContent {
  leadText: string;
  skills: string[];
  paragraph2: string;
  paragraph3: string;
  toolkit: string;
}

export const DEFAULT_ABOUT: AboutContent = {
  leadText: "Hi, I'm Abishek. I'm a final-year B.Tech student who is completely obsessed with",
  skills: [
    "3D Animation",
    "Storyboarding",
    "Concept Art",
    "Cinematography",
    "Illustration",
    "Graphic Design",
    "Visual Storytelling",
  ],
  paragraph2:
    "My creative journey started offline with charcoal portraits, pencil sketches, and watercolors. Today, I use that traditional foundation to map out dynamic storyboard sketches, craft detailed concept art, paint digital illustrations, and build immersive 3D cinematic worlds.",
  paragraph3:
    "Whether I'm designing a bold startup brand identity, developing animated sequences, or editing high-energy content, I treat every project like a scene in a movie. I already work professionally as a graphic designer and editor, proving that you don't need to wait for graduation to start making a visual impact.",
  toolkit: "Blender 3D, Unreal Engine, Maya, After Effects, Premiere Pro, Photoshop, Illustrator, and Adobe Animate",
};

const ABOUT_ROW_ID = "about";

interface AboutContextType {
  about: AboutContent;
  loading: boolean;
  updateAbout: (content: AboutContent) => Promise<void>;
}

const AboutContext = createContext<AboutContextType | undefined>(undefined);

export function AboutProvider({ children }: { children: ReactNode }) {
  const [about, setAbout] = useState<AboutContent>(DEFAULT_ABOUT);
  const [loading, setLoading] = useState(true);

  const fetchAbout = async () => {
    const { data, error } = await supabase
      .from("site_content")
      .select("content")
      .eq("id", ABOUT_ROW_ID)
      .maybeSingle();

    if (!error && data?.content) {
      setAbout({ ...DEFAULT_ABOUT, ...(data.content as Partial<AboutContent>) });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAbout();
  }, []);

  const updateAbout = async (content: AboutContent) => {
    const { error } = await supabase
      .from("site_content")
      .upsert({ id: ABOUT_ROW_ID, content, updated_at: new Date().toISOString() });

    if (error) throw error;
    setAbout(content);
  };

  return (
    <AboutContext.Provider value={{ about, loading, updateAbout }}>
      {children}
    </AboutContext.Provider>
  );
}

export function useAbout() {
  const context = useContext(AboutContext);
  if (context === undefined) {
    throw new Error("useAbout must be used within an AboutProvider");
  }
  return context;
}
