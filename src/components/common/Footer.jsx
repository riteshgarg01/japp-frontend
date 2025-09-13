export default function Footer(){
  return (
    <div className="border-t bg-white">
      <div className="mx-auto max-w-6xl p-4 text-xs text-neutral-500 flex flex-wrap gap-3 items-center justify-between">
        <div>© {new Date().getFullYear()} Arohi's collection</div>
        <div>WhatsApp click-to-chat enabled</div>
      </div>
    </div>
  );
}
