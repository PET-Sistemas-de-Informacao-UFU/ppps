import type { JsonfiedData } from "./types";

// Cada linha da planilha tem até 3 plantões, em colunas separadas:
//   "Plantão N" (data) + "Sala/Horário N", com N = 1, 2, 3...
// Aqui cada plantão preenchido vira uma entrada própria. As colunas P1/P2/P3 (datas de
// prova), POSTADO, OSs e a legenda ao lado da tabela são ignoradas.
//
// As colunas são achadas pelo NOME no cabeçalho (sem diferenciar maiúsculas/acentos),
// então reordenar ou inserir colunas na planilha não quebra nada.

const norm = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

const PLANTAO = /^plantao\s*(\d+)$/;
const SALA_HORARIO = /^sala\s*\/\s*horario\s*(\d+)$/;

interface Columns {
  materia: number;
  curso: number;
  petiano: number;
  obs: number; // -1 se a planilha não tiver essa coluna
  plantoes: { data: number; horaSala: number }[]; // horaSala = -1 se não houver "Sala/Horário N"
}

function mapColumns(header: string[]): Columns {
  const names = header.map(norm);
  const find = (...aliases: string[]): number => names.findIndex((n) => aliases.includes(n));

  const materia = find("ppp", "materia");
  const curso = find("curso");
  const petiano = find("responsavel", "petiano");

  // "Plantão N" e "Sala/Horário N" são ligados pelo número N
  const datas = new Map<number, number>();
  const salas = new Map<number, number>();
  names.forEach((n, i) => {
    const d = PLANTAO.exec(n);
    if (d) datas.set(Number(d[1]), i);
    const s = SALA_HORARIO.exec(n);
    if (s) salas.set(Number(s[1]), i);
  });

  const missing: string[] = [];
  if (materia < 0) missing.push("PPP");
  if (curso < 0) missing.push("Curso");
  if (petiano < 0) missing.push("Responsável");
  if (datas.size === 0) missing.push("Plantão 1");
  if (missing.length > 0) {
    throw new Error(`colunas não encontradas no cabeçalho da planilha: ${missing.join(", ")}`);
  }

  const plantoes = [...datas.keys()]
    .sort((a, b) => a - b)
    .map((n) => ({ data: datas.get(n)!, horaSala: salas.get(n) ?? -1 }));

  return { materia, curso, petiano, obs: find("obs", "observacao", "observacoes"), plantoes };
}

/**
 * Recebe o cabeçalho e as linhas da planilha (como a Sheets API devolve, com células
 * vazias omitidas no fim de cada linha) e devolve um item por plantão, na ordem da
 * planilha: linha por linha, plantão 1, 2, 3.
 */
export function parsePlantoes(header: string[], rows: string[][]): JsonfiedData[] {
  const cols = mapColumns(header);
  const out: JsonfiedData[] = [];

  for (const row of rows) {
    const cell = (i: number): string => (i >= 0 ? (row[i] ?? "").trim() : "");

    const materia = cell(cols.materia);
    if (!materia) continue; // linha em branco

    const curso = cell(cols.curso);
    const petiano = cell(cols.petiano);
    const obs = cell(cols.obs);

    for (const p of cols.plantoes) {
      const data = cell(p.data);
      if (!data) continue; // essa linha não tem esse plantão (ainda)

      const item: JsonfiedData = { materia, curso, petiano, data, horaSala: cell(p.horaSala) };
      if (obs) item.obs = obs;
      out.push(item);
    }
  }

  return out;
}
