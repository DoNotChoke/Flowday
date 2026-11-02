import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useHydrated } from "@/lib/useHydrated";
import { columns } from "./columns";
import type { Card } from "./TaskCard";

export function MoveButton({ card, onClick }: { card: Card; onClick: () => void }) {
  const hydrated = useHydrated();

  return (
    <Button variant="outline" size="sm" aria-label={`Move ${card.title}`} disabled={!hydrated} onClick={onClick}>
      Move to
    </Button>
  );
}

type MoveSheetProps = { card: Card | null; onClose: () => void; onMove: (card: Card, status: Card["status"]) => void };

export function MoveSheet({ card, onClose, onMove }: MoveSheetProps) {
  return (
    <Sheet open={Boolean(card)} onClose={onClose} title={`Move ${card?.title ?? "task"}`}>
      <div className="flex flex-col gap-2">
        {card &&
          columns
            .filter((column) => column.status !== card.status)
            .map((column) => (
              <Button key={column.status} variant="outline" size="md" onClick={() => onMove(card, column.status)}>
                {column.name}
              </Button>
            ))}
      </div>
    </Sheet>
  );
}
