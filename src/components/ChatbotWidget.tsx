import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { chatWithStore } from "@/lib/chat.functions";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatbotWidget({ storeSlug, storeName }: { storeSlug: string; storeName: string }) {
  const chat = useServerFn(chatWithStore);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: `Olá! Sou o assistente da ${storeName}. Como posso ajudar?` }]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  async function send() {
    if (!text.trim() || busy) return;
    const userMsg = { role: "user" as const, content: text };
    setMsgs((m) => [...m, userMsg]); setText(""); setBusy(true);
    try {
      const res = await chat({ data: { store_slug: storeSlug, history: msgs.slice(-10), message: userMsg.content } });
      setMsgs((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: "Desculpe, algo deu errado. Tente novamente." }]);
    } finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen((o) => !o)} className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow hover:scale-105 transition">
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[480px] w-[90vw] max-w-sm flex-col rounded-2xl border border-border bg-card shadow-2xl">
          <div className="border-b border-border p-4">
            <div className="font-semibold">Assistente {storeName}</div>
            <div className="text-xs text-muted-foreground">Responde na hora, 24h/dia</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-surface/60"}`}>
                {m.content}
              </div>
            ))}
            {busy && <div className="max-w-[85%] rounded-2xl bg-surface/60 px-3 py-2 text-sm"><Loader2 className="inline h-4 w-4 animate-spin" /></div>}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-border p-3 flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Digite sua mensagem…" className="flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm" />
            <button onClick={send} disabled={busy || !text.trim()} className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </>
  );
}
