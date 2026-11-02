export const columns = [
  { status: "ongoing", name: "On going", color: "#5b8def", tone: "bg-blue", icon: "M21 12a9 9 0 0 1-15.5 6.3M3 12a9 9 0 0 1 15.5-6.3M21 4v5h-5M3 20v-5h5" },
  { status: "in_process", name: "In process", color: "#ffc94a", tone: "bg-sun", icon: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" },
  { status: "completed", name: "Completed", color: "#4fc1be", tone: "bg-teal", icon: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M9 15l2 2 4-4" },
  { status: "canceled", name: "Canceled", color: "#f47258", tone: "bg-coral", icon: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M10 13l4 4M14 13l-4 4" },
] as const;
