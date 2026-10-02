import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Car, CheckCircle2, ClipboardList, Clock, MapPin, Radio, Save, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { STATUS, fmtData, fmtProtocolo, type Status } from "@/lib/cad";
import { carregarAtividades, fmtDia, type Guarnicao, type Plantao, type PostoCheck } from "@/lib/plantao";

const hora = (d: string) => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function FichaPlantao({ plantao, editavel, operadorNome }: { plantao: Plantao; editavel: boolean; operadorNome: string }) {
  const qc = useQueryClient();
  const [f, setF] = useState(plantao);
  const [saving, setSaving] = useState(false);
  const [novo, setNovo] = useState("");
  useEffect(() => setF(plantao), [plantao]);

  const { data: atv } = useQuery({
    queryKey: ["plantao-atv", plantao.id],
    queryFn: () => carregarAtividades(plantao),
    refetchInterval: plantao.status === "aberto" ? 15000 : false,
  });

  const set = <K extends keyof Plantao>(k: K, v: Plantao[K]) => setF((p) => ({ ...p, [k]: v }));
  const setG = (i: number, k: keyof Guarnicao, v: string) => set("guarnicoes", f.guarnicoes.map((g, j) => (j === i ? { ...g, [k]: v } : g)));
  const setP = (i: number, patch: Partial<PostoCheck>) => set("postos", f.postos.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  async function salvar() {
    setSaving(true);
    const { error } = await supabase.from("plantoes").update({
      equipe: f.equipe, supervisor: f.supervisor, operador_radio: f.operador_radio, horario: f.horario,
      guarnicoes: f.guarnicoes, postos: f.postos, atividades: f.atividades, materiais: f.materiais,
      informativo: f.informativo, atividades_verso: f.atividades_verso, turno: f.turno, data_inicio: f.data_inicio,
    } as never).eq("id", f.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success("Relatório salvo");
    qc.invalidateQueries({ queryKey: ["plantao"] });
  }

  async function lancar() {
    if (!novo.trim()) return;
    const { error } = await supabase.from("plantao_registros").insert({ plantao_id: f.id, texto: novo.trim() });
    if (error) { toast.error(error.message); return; }
    setNovo("");
    qc.invalidateQueries({ queryKey: ["plantao-atv", f.id] });
  }
  async function apagar(id: string) {
    await supabase.from("plantao_registros").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["plantao-atv", f.id] });
  }

  const dis = !editavel;
  const cell = "h-8 text-xs";

  return (
    <div className="space-y-4">
      <section className="card-3d animate-rise grid gap-3 p-4 md:grid-cols-6">
        <Campo l="Data"><Input className={cell} type="date" disabled={dis || plantao.status === "aberto"} value={f.data_inicio} onChange={(e) => set("data_inicio", e.target.value)} /></Campo>
        <Campo l="Turno"><Input className={cell} disabled={dis || plantao.status === "aberto"} value={f.turno} onChange={(e) => set("turno", e.target.value)} /></Campo>
        <Campo l="Horário"><Input className={cell} disabled={dis} value={f.horario ?? ""} onChange={(e) => set("horario", e.target.value)} /></Campo>
        <Campo l="Equipe"><Input className={cell} disabled={dis} value={f.equipe ?? ""} onChange={(e) => set("equipe", e.target.value)} placeholder="Ex.: Alfa" /></Campo>
        <Campo l="Supervisor"><Input className={cell} disabled={dis} value={f.supervisor ?? ""} onChange={(e) => set("supervisor", e.target.value)} /></Campo>
        <Campo l="Operador(a) de rádio"><Input className={cell} disabled={dis} value={f.operador_radio ?? ""} onChange={(e) => set("operador_radio", e.target.value)} /></Campo>
      </section>

      <section className="card-3d animate-rise overflow-x-auto p-4">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-primary"><Car className="h-4 w-4" /> Guarnições</h3>
        <table className="w-full text-xs">
          <thead className="text-left uppercase text-muted-foreground">
            <tr><th className="py-1 pr-2">VTR</th><th className="pr-2">Encarregado</th><th className="pr-2">Condutor</th><th className="pr-2">Auxiliar 01</th><th>Auxiliar 02</th></tr>
          </thead>
          <tbody>
            {f.guarnicoes.map((g, i) => (
              <tr key={i}>
                <td className="py-1 pr-2 font-mono font-bold whitespace-nowrap">{g.viatura}</td>
                {(["encarregado", "condutor", "aux1", "aux2"] as const).map((k) => (
                  <td key={k} className="pr-2"><Input className={cell} disabled={dis} value={g[k]} onChange={(e) => setG(i, k, e.target.value)} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card-3d animate-rise p-4">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-primary"><MapPin className="h-4 w-4" /> Postos e próprios municipais</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {f.postos.map((p, i) => (
            <div key={i} className="flex items-center gap-2 rounded border px-2 py-1">
              <button type="button" disabled={dis} onClick={() => setP(i, { ok: !p.ok })} title={p.ok ? "Sem alteração" : "Com alteração"}>
                {p.ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
              </button>
              <span className="w-44 shrink-0 truncate text-xs font-semibold">{p.nome}</span>
              <Input className="h-7 text-xs" disabled={dis} placeholder={p.ok ? "Sem alteração" : "Descreva a alteração"} value={p.obs} onChange={(e) => setP(i, { obs: e.target.value })} />
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Texto l="Atividades - frente" v={f.atividades} dis={dis} on={(v) => set("atividades", v)} />
        <Texto l="Materiais de carga" v={f.materiais} dis={dis} on={(v) => set("materiais", v)} />
        <Texto l="Informativo do plantão" v={f.informativo} dis={dis} on={(v) => set("informativo", v)} />
        <Texto l="Atividades - verso" v={f.atividades_verso} dis={dis} on={(v) => set("atividades_verso", v)} />
      </div>

      {editavel && (
        <div className="flex justify-end"><Button onClick={salvar} disabled={saving}><Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar relatório"}</Button></div>
      )}

      <section className="card-3d animate-rise p-4">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-primary"><ClipboardList className="h-4 w-4" /> Solicitações e ocorrências do plantão ({atv?.ocorrencias.length ?? 0})</h3>
        <p className="mb-2 text-xs text-muted-foreground">Preenchido automaticamente com as ocorrências registradas neste plantão.</p>
        {atv?.ocorrencias.length ? (
          <table className="w-full text-xs">
            <tbody>
              {atv.ocorrencias.map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="py-1 pr-2 font-mono"><Link to="/ocorrencias/$id" params={{ id: o.id }} className="text-primary hover:underline">{fmtProtocolo(o.protocolo, o.created_at)}</Link></td>
                  <td className="pr-2 font-mono">{hora(o.created_at)}</td>
                  <td className="pr-2">{o.natureza}</td>
                  <td className="pr-2 text-muted-foreground">{o.endereco}{o.bairro ? ` · ${o.bairro}` : ""}</td>
                  <td className="pr-2 font-mono">{o.viatura ?? ""}</td>
                  <td>{STATUS[o.status as Status]?.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="text-xs text-muted-foreground">Nenhuma ocorrência ainda.</div>}
      </section>

      <section className="card-3d animate-rise p-4">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-primary"><Radio className="h-4 w-4" /> Lançamentos com horário</h3>
        {editavel && (
          <div className="mb-3 flex gap-2">
            <Input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lancar()} placeholder="Ex.: VTR 006 em patrulhamento no Centro — horário registrado automaticamente" />
            <Button variant="secondary" onClick={lancar}>Lançar</Button>
          </div>
        )}
        <div className="space-y-1 text-xs">
          {atv?.registros.map((r) => (
            <div key={r.id} className="flex items-center gap-2 border-b py-1 last:border-0">
              <Clock className="h-3 w-3 text-primary" /><span className="font-mono">{hora(r.hora)}</span><span className="flex-1">{r.texto}</span>
              {editavel && <button onClick={() => apagar(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>}
            </div>
          ))}
          {atv?.acoes.map((a, i) => (
            <div key={"a" + i} className="flex items-center gap-2 border-b py-1 text-muted-foreground last:border-0">
              <Clock className="h-3 w-3" /><span className="font-mono">{hora(a.created_at)}</span><span className="flex-1">{a.protocolo ? `#${a.protocolo} · ` : ""}{a.descricao}</span>
            </div>
          ))}
          {!atv?.registros.length && !atv?.acoes.length && <div className="text-muted-foreground">Nada lançado ainda.</div>}
        </div>
      </section>

      <RelatorioImpresso p={f} operadorNome={operadorNome} atv={atv} />
    </div>
  );
}

function Campo({ l, children }: { l: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-[10px] uppercase text-muted-foreground">{l}</Label>{children}</div>;
}
function Texto({ l, v, dis, on }: { l: string; v: string | null; dis: boolean; on: (v: string) => void }) {
  return (
    <section className="card-3d animate-rise space-y-2 p-4">
      <h3 className="font-semibold text-primary">{l}</h3>
      <Textarea rows={4} disabled={dis} value={v ?? ""} onChange={(e) => on(e.target.value)} />
    </section>
  );
}

/** Versão em papel, no formato do relatório de plantão da GCM (só aparece na impressão). */
function RelatorioImpresso({ p, operadorNome, atv }: { p: Plantao; operadorNome: string; atv?: Awaited<ReturnType<typeof carregarAtividades>> | undefined }) {
  const B = "border border-black px-1 py-0.5";
  return (
    <div className="print-only hidden text-[10px] text-black print:block">
      <div className="text-center font-bold leading-tight">
        <div>PREFEITURA DE ARAÇOIABA DA SERRA</div>
        <div>SECRETARIA MUNICIPAL DE SEGURANÇA E DEFESA CIVIL</div>
        <div>GUARDA CIVIL MUNICIPAL</div>
      </div>
      <table className="mt-2 w-full border-collapse">
        <tbody>
          <tr><td className={B}><b>DATA:</b> {fmtDia(p.data_inicio)}</td><td className={B + " text-center font-bold"}>RELATÓRIO DE PLANTÃO</td><td className={B}><b>TURNO:</b> {p.turno}</td></tr>
          <tr><td className={B}><b>SUPERVISOR:</b> {p.supervisor}</td><td className={B}><b>EQUIPE:</b> {p.equipe}</td><td className={B}><b>HORÁRIO:</b> {p.horario}</td></tr>
        </tbody>
      </table>
      <table className="mt-1 w-full border-collapse">
        <thead><tr><th className={B}></th><th className={B}>ENCARREGADO</th><th className={B}>CONDUTOR</th><th className={B}>AUXILIAR (01)</th><th className={B}>AUXILIAR (02)</th></tr></thead>
        <tbody>{p.guarnicoes.map((g, i) => <tr key={i}><td className={B + " font-bold"}>{g.viatura}</td><td className={B}>{g.encarregado}</td><td className={B}>{g.condutor}</td><td className={B}>{g.aux1}</td><td className={B}>{g.aux2}</td></tr>)}</tbody>
      </table>
      <table className="mt-1 w-full border-collapse">
        <tbody>
          {Array.from({ length: Math.ceil(p.postos.length / 2) }, (_, i) => [p.postos[i * 2], p.postos[i * 2 + 1]]).map((par, i) => (
            <tr key={i}>{par.map((x, j) => <td key={j} className={B}>{x && <><b>{x.nome.toUpperCase()}</b>: {x.obs || (x.ok ? "S/A" : "")}</>}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {([["ATIVIDADES - FRENTE", p.atividades], ["MATERIAIS DE CARGA", p.materiais], ["INFORMATIVO DO PLANTÃO", p.informativo]] as const).map(([t, v]) => (
        <div key={t} className="mt-1 border border-black"><div className="border-b border-black text-center font-bold">{t}</div><div className="min-h-8 whitespace-pre-wrap p-1">{v}</div></div>
      ))}
      <div className="mt-1 border border-black">
        <div className="border-b border-black text-center font-bold">SOLICITAÇÕES E OCORRÊNCIAS</div>
        <div className="p-1">
          {atv?.ocorrencias.map((o) => <div key={o.id}>{hora(o.created_at)} — {fmtProtocolo(o.protocolo, o.created_at)} — {o.natureza} — {o.endereco}{o.bairro ? `, ${o.bairro}` : ""}{o.viatura ? ` — ${o.viatura}` : ""} — {STATUS[o.status as Status]?.label}{o.desfecho ? ` (${o.desfecho})` : ""}</div>)}
          {[...(atv?.registros ?? [])].reverse().map((r) => <div key={r.id}>{hora(r.hora)} — {r.texto}</div>)}
        </div>
      </div>
      <div className="mt-1 border border-black"><div className="border-b border-black text-center font-bold">ATIVIDADES VERSO</div><div className="min-h-8 whitespace-pre-wrap p-1">{p.atividades_verso}</div></div>
      <div className="mt-8 grid grid-cols-2 gap-8 text-center">
        <div className="border-t border-black pt-1">{p.operador_radio || operadorNome}<br />OPERADOR(A) DE RÁDIO</div>
        <div className="border-t border-black pt-1">{p.supervisor}<br />SUPERVISOR</div>
      </div>
      <div className="mt-2 text-right">Emitido em {fmtData(new Date().toISOString())}</div>
    </div>
  );
}
