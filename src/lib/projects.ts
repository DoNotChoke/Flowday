export const projectTemplates = [
  { id: "blank", name: "Blank", description: "Empty board, your own rules.", icon: "M12 5v14M5 12h14", starter: ["Add your first task"] },
  {
    id: "software",
    name: "Software sprint",
    description: "Backlog, sprints, bugs.",
    icon: "M16 18l6-6-6-6M8 6l-6 6 6 6",
    starter: ["Set up repository & CI", "Design data model", "Build auth flow", "Write release notes"],
  },
  {
    id: "research",
    name: "Research / Thesis",
    description: "Chapters, papers, meetings.",
    icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5",
    starter: ["Literature review", "Define research questions", "Run experiments", "Supervisor check-in"],
  },
  {
    id: "personal",
    name: "Personal goal",
    description: "Habits & milestones.",
    icon: "M12 2l3 7h7l-5.5 4.5 2 7.5-6.5-4.5L5.5 21l2-7.5L2 9h7z",
    starter: ["Define the goal", "Weekly check-in", "Celebrate milestone"],
  },
];

export const projectColors = [
  { name: "Coral", hex: "#f47258" },
  { name: "Sun", hex: "#ffc94a" },
  { name: "Teal", hex: "#4fc1be" },
  { name: "Blue", hex: "#5b8def" },
  { name: "Lilac", hex: "#b9a5f2" },
  { name: "Stone", hex: "#d6d6d1" },
];

export const projectIcons = [
  { name: "code", path: "M16 18l6-6-6-6M8 6l-6 6 6 6" },
  { name: "book", path: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" },
  { name: "rocket", path: "M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 12a12 12 0 0 1 11-9 12 12 0 0 1-9 11l-2 2-2-2z" },
  { name: "pen", path: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" },
  { name: "heart", path: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z" },
  { name: "box", path: "M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" },
];

// Initials of several words or the start of one word. Strips Vietnamese marks so the prefix stays ASCII.
export function projectKey(name: string) {
  const ascii = name.normalize("NFD").replace(/\p{M}/gu, "").replace(/[đĐ]/g, "D").toUpperCase();
  const words = ascii.match(/[A-Z0-9]+/g) ?? [];
  const key = words.length > 1 ? words.map((word) => word[0]).join("") : (words[0] ?? "");
  return key.slice(0, 3) || "PRJ";
}
