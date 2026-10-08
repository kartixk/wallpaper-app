import { DeskNav } from "@/components/desk/DeskNav";
import { HeroDesk } from "@/components/desk/hero/HeroDesk";
import { Manifesto } from "@/components/desk/Manifesto";
import { MeetPencil } from "@/components/desk/MeetPencil";
import { WhatIDo } from "@/components/desk/WhatIDo";
import { WorkBoard } from "@/components/desk/WorkBoard";
import { WallArt } from "@/components/desk/WallArt";
import { Showreel } from "@/components/desk/Showreel";
import { Contact } from "@/components/desk/Contact";

export default function Home() {
  return (
    <div className="desk">
      <DeskNav />
      <main>
        <HeroDesk />
        <Manifesto />
        <MeetPencil />
        <WhatIDo />
        <WorkBoard />
        <WallArt />
        <Showreel />
        <Contact />
      </main>
    </div>
  );
}
