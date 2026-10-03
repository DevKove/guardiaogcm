import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Car, CheckCircle2, ClipboardList, Clock, MapPin, Radio, Save, Trash2, AlertTriangle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { STATUS, fmtData, fmtProtocolo, selectCls, type Status } from "@/lib/cad";
import { carregarAtividades, fmtDia, type Guarnicao, type Plantao, type PostoCheck } from "@/lib/plantao";
import { useMe } from "@/hooks/use-me";

const hora = (d: string) => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function FichaPlantao({ plantao, editavel, operadorNome }: { plantao: Plantao; editavel: boolean; operadorNome: string }) {
  const qc = useQueryClient();
  const [f, setF] = useState(plantao);
  const [saving, setSaving] = useState(false);
  const [novo, setNovo] = useState("");
  const [integranteIds, setIntegranteIds] = useState<string[]>([]);
  const { data: me } = useMe();
  const { data: efetivo = [] } = useQuery({
    queryKey: ["equipe-plantao"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipe").select("id, nome, matricula, tipo, funcao").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as { id: string; nome: string; matricula: string | null; tipo: string; funcao: string }[];
    },
  });
  useEffect(() => setF(plantao), [plantao]);

  const { data: plantaoIntegrantes = [] } = useQuery({
    queryKey: ["plantao-integrantes", plantao.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plantao_integrantes")
        .select("equipe_id")
        .eq("plantao_id", plantao.id);
      if (error) throw error;
      return (data ?? []) as { equipe_id: string }[];
    },
  });

  useEffect(() => {
    setIntegranteIds(plantaoIntegrantes.map((x) => x.equipe_id));
  }, [plantaoIntegrantes]);

  const { data: atv } = useQuery({
    queryKey: ["plantao-atv", plantao.id],
    queryFn: async () => {
      if (plantao.status === "encerrado" && plantao.resumo && Array.isArray(plantao.resumo.viaturas)) {
        return plantao.resumo as Awaited<ReturnType<typeof carregarAtividades>>;
      }
      return carregarAtividades(plantao);
    },
    refetchInterval: plantao.status === "aberto" ? 30000 : false,
  });

  useEffect(() => {
    const refresh = () => { void qc.invalidateQueries({ queryKey: ["plantao-atv", plantao.id] }); };
    const ch = supabase.channel(`plantao-ficha-${plantao.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "plantoes", filter: `id=eq.${plantao.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "ocorrencias", filter: `plantao_id=eq.${plantao.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "plantao_registros", filter: `plantao_id=eq.${plantao.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "plantao_historico", filter: `plantao_id=eq.${plantao.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "ocorrencia_historico" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "viaturas" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "escalas" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "postos_fixos" }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [plantao.id, qc]);

  const set = <K extends keyof Plantao>(k: K, v: Plantao[K]) => setF((p) => ({ ...p, [k]: v }));
  const setG = (i: number, k: keyof Guarnicao, v: string) => set("guarnicoes", f.guarnicoes.map((g, j) => (j === i ? { ...g, [k]: v } : g)));
  const setP = (i: number, patch: Partial<PostoCheck>) => set("postos", f.postos.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  async function salvar() {
    setSaving(true);
    const membros = efetivo.filter((m) => integranteIds.includes(m.id));
    const supervisor = membros.find((m) => m.id === f.supervisor_id);
    const operadorRadio = membros.find((m) => m.id === f.operador_radio_id);
    if (f.status === "aberto" && (!f.nome_plantao || (integranteIds.length > 0 && (!f.supervisor_id || !integranteIds.includes(f.supervisor_id))))) {
      setSaving(false);
      toast.error("Selecione o nome do plantão e, havendo equipe, o supervisor entre os integrantes.");
      return;
    }
    const { error } = await supabase.from("plantoes").update({
      nome_plantao: f.nome_plantao,
      supervisor_id: f.supervisor_id,
      operador_radio_id: f.operador_radio_id,
      equipe: membros.map((m) => m.nome).join(", "),
      supervisor: supervisor?.nome ?? "",
      operador_radio: operadorRadio?.nome ?? null,
      horario: f.horario,
      guarnicoes: f.guarnicoes, postos: f.postos, atividades: f.atividades, materiais: f.materiais,
      informativo: f.informativo, atividades_verso: f.atividades_verso, turno: f.turno, data_inicio: f.data_inicio,
    } as never).eq("id", f.id);
    if (error) { setSaving(false); toast.error("Erro ao salvar: " + error.message); return; }

    if (f.status === "aberto") {
      const { error: delError } = await supabase.from("plantao_integrantes").delete().eq("plantao_id", f.id);
      if (delError) { setSaving(false); toast.error("Não foi possível atualizar os integrantes: " + delError.message); return; }
      const { error: insError } = await supabase.from("plantao_integrantes").insert(integranteIds.map((equipe_id) => ({ plantao_id: f.id, equipe_id })));
      if (insError) { setSaving(false); toast.error("Não foi possível gravar os integrantes: " + insError.message); return; }
    }
    setSaving(false);
    toast.success("Relatório salvo");
    qc.invalidateQueries({ queryKey: ["plantao"] });
    qc.invalidateQueries({ queryKey: ["plantao-integrantes", f.id] });
  }

  async function lancar() {
    if (!novo.trim() || !me?.id) return;
    const { error } = await supabase.from("plantao_registros").insert({ plantao_id: f.id, texto: novo.trim(), criado_por: me?.id });
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
        <Campo l="Nome do plantão"><select className={selectCls} disabled={dis} value={f.nome_plantao ?? ""} onChange={(e) => set("nome_plantao", e.target.value as Plantao["nome_plantao"])}><option value="" className="bg-popover">Selecionar</option>{["ALPHA","BRAVO","CHARLIE","DELTA"].map((x) => <option key={x} value={x} className="bg-popover">{x}</option>)}</select></Campo>
        <Campo l="Supervisor"><select className={selectCls} disabled={dis} value={f.supervisor_id ?? ""} onChange={(e) => set("supervisor_id", e.target.value || null)}><option value="" className="bg-popover">Selecionar supervisor</option>{efetivo.filter((m) => integranteIds.includes(m.id)).map((m) => <option key={m.id} value={m.id} className="bg-popover">{m.nome} · {m.funcao}</option>)}</select></Campo>
        <Campo l="Operador(a) de rádio"><select className={selectCls} disabled={dis} value={f.operador_radio_id ?? ""} onChange={(e) => set("operador_radio_id", e.target.value || null)}><option value="" className="bg-popover">Não informado</option>{efetivo.filter((m) => integranteIds.includes(m.id)).map((m) => <option key={m.id} value={m.id} className="bg-popover">{m.nome} · {m.funcao}</option>)}</select></Campo>
        <div className="md:col-span-2 space-y-1"><Label className="text-[10px] uppercase text-muted-foreground">Guardas presentes no plantão</Label><select multiple className="min-h-24 w-full rounded-md border border-input bg-background px-2 py-1 text-xs outline-none" disabled={dis} value={integranteIds} onChange={(e) => { const ids = Array.from(e.target.selectedOptions).map((o) => o.value); setIntegranteIds(ids); if (f.supervisor_id && !ids.includes(f.supervisor_id)) set("supervisor_id", null); if (f.operador_radio_id && !ids.includes(f.operador_radio_id)) set("operador_radio_id", null); }}>{efetivo.map((m) => <option key={m.id} value={m.id}>{m.nome} · {m.tipo}{m.matricula ? ` · ${m.matricula}` : ""}</option>)}</select><p className="text-[10px] text-muted-foreground">Somente guardas ativos cadastrados em Equipe. Enquanto o plantão estiver aberto, novos integrantes podem ser adicionados ou retirados.</p></div>
      </section>

      <section className="card-3d animate-rise overflow-x-auto p-4">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-primary"><Car className="h-4 w-4" /> Guarnições</h3>
        <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Os integrantes abaixo vêm do cadastro de Equipe e são gravados no plantão.</p>
        <table className="w-full text-xs">
          <thead className="text-left uppercase text-muted-foreground">
            <tr><th className="py-1 pr-2">VTR</th><th className="pr-2">Encarregado</th><th className="pr-2">Condutor</th><th className="pr-2">Auxiliar 01</th><th>Auxiliar 02</th></tr>
          </thead>
          <tbody>
            {f.guarnicoes.map((g, i) => (
              <tr key={i}>
                <td className="py-1 pr-2 font-mono font-bold whitespace-nowrap">{g.viatura}</td>
                {(["encarregado", "condutor", "aux1", "aux2"] as const).map((k) => (
                  <td key={k} className="pr-2">
                    {dis ? <Input className={cell} disabled value={g[k]} /> : (
                      <select className={cell + " w-full rounded-md border border-input bg-background px-2 outline-none"} value={g[k]} onChange={(e) => setG(i, k, e.target.value)}>
                        <option value="" className="bg-popover">Selecionar integrante</option>
                        {efetivo.map((m) => <option key={m.id} value={m.nome} className="bg-popover">{m.nome} · {m.tipo}{m.matricula ? ` · ${m.matricula}` : ""}</option>)}
                      </select>
                    )}
                  </td>
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

      <section className="card-3d animate-rise p-4 print:hidden">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-primary"><Car className="h-4 w-4" /> Frota e equipes vinculadas ao turno</h3>
        <p className="mb-3 text-xs text-muted-foreground">Atualizado automaticamente quando há alterações na frota, nas escalas ou nos próprios municipais.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="mb-2 text-sm font-semibold">Viaturas ({atv?.viaturas.length ?? 0})</div>
            <div className="space-y-2 text-xs">
              {atv?.viaturas.map((v) => <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0"><span className="font-mono font-bold">{v.prefixo}</span><span className="text-muted-foreground">{v.guarnicao || "Guarnição não informada"}</span><span className={v.ativa ? "text-success" : "text-muted-foreground"}>{v.ativa ? v.status.replaceAll("_", " ") : "inativa"}</span></div>)}
              {!atv?.viaturas.length && <span className="text-muted-foreground">Nenhuma viatura cadastrada.</span>}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="mb-2 text-sm font-semibold">Escalas do turno ({atv?.escalas.length ?? 0})</div>
            <div className="space-y-2 text-xs">
              {atv?.escalas.map((e) => <div key={e.id} className="border-b pb-2 last:border-0"><div className="font-semibold">{e.funcao} · {e.hora_inicio.slice(0, 5)}–{e.hora_fim.slice(0, 5)}</div><div>{e.agentes}</div>{e.observacao && <div className="text-muted-foreground">{e.observacao}</div>}</div>)}
              {!atv?.escalas.length && <span className="text-muted-foreground">Nenhuma escala cadastrada para esta data e turno.</span>}
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">Próprios municipais ativos: {atv?.postosAtivos.map((p) => p.nome).join(" · ") || "Nenhum cadastrado"}</div>
      </section>

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
                  <td className="pr-2 text-[10px] text-muted-foreground">{atv?.usuarios[o.criado_por] ?? o.criado_por.slice(0, 8)}</td>
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
              <Clock className="h-3 w-3 text-primary" /><span className="font-mono">{hora(r.hora)}</span><span className="flex-1">{r.texto}</span><span className="text-[10px] text-muted-foreground">{atv?.usuarios[r.criado_por] ?? r.criado_por.slice(0, 8)}</span>
              {editavel && <button onClick={() => apagar(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>}
            </div>
          ))}
          {atv?.acoes.map((a, i) => (
            <div key={"a" + i} className="flex items-center gap-2 border-b py-1 text-muted-foreground last:border-0">
              <Clock className="h-3 w-3" /><span className="font-mono">{hora(a.created_at)}</span><span className="flex-1">{a.protocolo ? `#${a.protocolo} · ` : ""}{a.descricao}</span><span className="text-[10px]">{atv?.usuarios[a.usuario_id] ?? a.usuario_id.slice(0, 8)}</span>
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
        <div className="border-b border-black text-center font-bold">FROTA E ESCALAS DO TURNO</div>
        <div className="p-1">
          <div className="font-bold">Viaturas</div>
          {atv?.viaturas.map((v) => <div key={v.id}>{v.prefixo} — {v.ativa ? v.status.replaceAll("_", " ") : "inativa"} — guarnição: {v.guarnicao || "não informada"} — KM: {v.km_atual ?? "não informado"}{v.observacao ? ` — ${v.observacao}` : ""}</div>)}
          <div className="mt-1 font-bold">Escalas do turno</div>
          {atv?.escalas.map((e) => <div key={e.id}>{e.hora_inicio.slice(0, 5)}–{e.hora_fim.slice(0, 5)} — {e.funcao} — {e.agentes}{e.observacao ? ` — ${e.observacao}` : ""}</div>)}
          <div className="mt-1 font-bold">Próprios municipais ativos</div>
          <div>{atv?.postosAtivos.map((p) => `${p.nome} (${p.tipo})`).join("; ") || "Nenhum cadastrado"}</div>
        </div>
      </div>
      <div className="mt-1 border border-black">
        <div className="border-b border-black text-center font-bold">SOLICITAÇÕES E OCORRÊNCIAS</div>
        <div className="p-1">
          {atv?.ocorrencias.map((o) => <div key={o.id}>{hora(o.created_at)} — {fmtProtocolo(o.protocolo, o.created_at)} — {o.natureza} — {o.endereco}{o.numero ? `, ${o.numero}` : ""}{o.bairro ? `, ${o.bairro}` : ""} — origem: {o.origem} — prioridade: {o.prioridade} — solicitante: {o.solicitante_nome || "não informado"}{o.viatura ? ` — VTR ${o.viatura}` : ""} — {STATUS[o.status as Status]?.label}{o.despachada_em ? ` — despacho ${hora(o.despachada_em)}` : ""}{o.chegada_em ? ` — chegada ${hora(o.chegada_em)}` : ""}{o.encerrada_em ? ` — encerrada ${hora(o.encerrada_em)}` : ""} — registro: {atv?.usuarios[o.criado_por] ?? o.criado_por.slice(0, 8)}{o.desfecho ? ` (${o.desfecho})` : ""}</div>)}
          {[...(atv?.registros ?? [])].reverse().map((r) => <div key={r.id}>{hora(r.hora)} — {r.texto} — registro: {atv?.usuarios[r.criado_por] ?? r.criado_por.slice(0, 8)}</div>)}
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
