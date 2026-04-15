export type Status = "idle" | "running" | "done" | "error";

const styles: Record<Status, string> = {
  idle: "bg-neutral-700",
  running: "bg-yellow-400 animate-pulse",
  done: "bg-green-400",
  error: "bg-red-400",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-neutral-500">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${styles[status]}`} />
      {status}
    </span>
  );
}
