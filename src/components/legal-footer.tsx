import { Link } from "@tanstack/react-router";

export function LegalFooter() {
  return (
    <footer className="border-t border-cyan-400/15 bg-[#05090e] px-4 py-4 text-center text-[10px] text-slate-500 print:hidden">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <span>© Guardião GCM · CAD Guarda Municipal</span>
        <Link to="/termos-de-uso" className="font-semibold text-cyan-300 hover:text-cyan-200 hover:underline">Termos de Uso</Link>
        <Link to="/politica-de-privacidade" className="font-semibold text-cyan-300 hover:text-cyan-200 hover:underline">Política de Privacidade</Link>
      </div>
    </footer>
  );
}
