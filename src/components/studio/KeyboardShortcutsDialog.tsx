"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  ["Space", "Play or pause preview"],
  ["Esc", "Deselect current layer"],
  ["Cmd/Ctrl + Z", "Undo"],
  ["Cmd/Ctrl + Shift + Z", "Redo"],
  ["Cmd/Ctrl + +", "Zoom timeline in"],
  ["Cmd/Ctrl + -", "Zoom timeline out"],
  ["Cmd/Ctrl + 0", "Reset timeline zoom"],
  ["Cmd/Ctrl + C", "Copy selected layer"],
  ["Cmd/Ctrl + V", "Paste layer at playhead"],
  ["Cmd/Ctrl + D", "Duplicate selected layer"],
  ["Delete / Backspace", "Delete selected layer or region"],
  ["S", "Split selected layer or region at playhead"],
  ["I", "Set or clear In marker"],
  ["O", "Set or clear Out marker"],
  ["?", "Open shortcuts"],
];

export function KeyboardShortcutsDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md border" style={{ background: "#1a1a1c", borderColor: "#333" }}>
        <DialogHeader>
          <DialogTitle className="text-white" style={{ fontFamily: "Unbounded, sans-serif", fontSize: "0.9rem" }}>
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 pt-2">
          {SHORTCUTS.map(([keys, action]) => (
            <div key={keys} className="flex items-center justify-between rounded-md px-2 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
              <span className="text-xs text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>{action}</span>
              <kbd className="rounded border px-2 py-1 text-[10px] text-[#ccff00]" style={{ borderColor: "rgba(204,255,0,0.2)", background: "rgba(204,255,0,0.06)" }}>
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
