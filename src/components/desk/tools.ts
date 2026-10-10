export interface Tool {
  id: "pencil" | "stylus" | "wallbrush" | "charcoal" | "fineliner" | "roundbrush";
  name: string;
  discipline: string;
  /** Work category to filter by, or a section anchor to jump to. */
  category?: string;
  anchor?: string;
}

export const TOOLS: Tool[] = [
  { id: "pencil", name: "Graphite pencil", discipline: "Pencil Sketches", category: "Pencil Sketches" },
  { id: "stylus", name: "Stylus", discipline: "Digital Art", category: "Digital Arts" },
  { id: "wallbrush", name: "Wall brush", discipline: "Wall Art", anchor: "#wall-art" },
  { id: "charcoal", name: "Charcoal", discipline: "Charcoal Portraits", category: "Charcoal Portraits" },
  { id: "fineliner", name: "Fineliner", discipline: "Pen Sketches", category: "Pen Sketches" },
  { id: "roundbrush", name: "Round brush", discipline: "Watercolours", category: "Watercolors" },
];

export const FILTER_EVENT = "desk:filter";

/** Jump to the work a tool makes: filter the board, or scroll to its section. */
export function openTool(tool: Tool) {
  if (tool.category) {
    window.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: tool.category }));
    document.getElementById("work")?.scrollIntoView({ behavior: "smooth" });
  } else if (tool.anchor) {
    document.querySelector(tool.anchor)?.scrollIntoView({ behavior: "smooth" });
  }
}

/** Take the visitor to "Fresh off the desk", showing this tool's medium (everything, for a medium with no board of its own). */
export function openWork(tool: Tool) {
  window.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: tool.category ?? "All" }));
  document.getElementById("work")?.scrollIntoView({ behavior: "smooth" });
}
