import { db } from "@/lib/db";
import { category } from "@/lib/db/schema";

const defaults = [
  { name: "Design", color: "#5b8def" },
  { name: "Development", color: "#4fc1be" },
  { name: "Coding", color: "#b9a5f2" },
  { name: "Meeting", color: "#ffc94a" },
  { name: "Research", color: "#f47258" },
  { name: "Office Time", color: "#d6d6d1" },
  { name: "User Experience", color: "#7fd3ce" },
];

export async function seedCategories(userId: string) {
  await db.insert(category).values(defaults.map((row) => ({ ...row, userId }))).onConflictDoNothing();
}
