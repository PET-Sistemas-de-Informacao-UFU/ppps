export interface Env {
  ASSETS: Fetcher;
  CACHE: KVNamespace; // cache da planilha

  SHEET_ID: string;
  SHEET_RANGE: string;
  CACHE_TTL?: string;
  GOOGLE_API_KEY: string;
  REFRESH_TOKEN?: string;
}

/** Um plantão. Cada linha da planilha gera de 1 a 3 destes (um por "Plantão N" preenchido). */
export interface JsonfiedData {
  materia: string;
  curso: string;
  petiano: string;
  data: string; // dd/mm/aaaa, exatamente como está na planilha
  horaSala: string; // "" se a planilha não informar
  obs?: string; // observação da linha (vale para todos os plantões dela)
}

export interface SheetData {
  items: JsonfiedData[];
  range: string;
  updatedAt: string;
}
