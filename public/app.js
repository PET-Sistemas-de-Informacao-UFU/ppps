// /api/dados devolve um array de { materia, curso, petiano, data, horaSala, obs? }.

const tabelaEl = document.getElementById("tabela");
const statusEl = document.getElementById("status");
const exemploStruct = { materia: "", curso: "", petiano: "", data: new Date(), horaSala: "", obs: "" };

const COLUNAS = [
  ["Matéria", "materia"],
  ["Curso", "curso"],
  ["Petiano", "petiano"],
  ["Data", "data"],
  ["Hora/Sala", "horaSala"],
  ["Obs", "obs"],
];

function eid(elem) {
  return document.getElementById(elem);
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function renderTabela(items) {
  const table = document.createElement("table");

  const colunas = COLUNAS.filter(([, campo]) => campo !== "obs");

  const headRow = table.createTHead().insertRow();
  for (const [titulo] of colunas) {
    const th = document.createElement("th");
    th.textContent = titulo;
    headRow.appendChild(th);
  }

  const tbody = table.createTBody();
  for (const item of items) {
    const tr = tbody.insertRow();
    for (const [, campo] of colunas) {
      tr.insertCell().textContent = item[campo] ?? ""; // textContent evita injeção de HTML
    }
  }

  tabelaEl.replaceChildren(table);
}

// /api/dados devolve um array de { materia, curso, petiano, data, horaSala, obs? }.
// Um PPP por coluna, no máximo 3 por linha. Com mais de 3 no mesmo dia, divide em linhas
// parecidas (4 vira 2+2, 5 vira 3+2). O CSS usa a classe c1/c2/c3 para o número de colunas.
function renderProximoPPP(pppAtual) {
  const container = eid("render-ppp");

  if (pppAtual.length === 0) {
    container.className = "coluna c1";
    const aviso = document.createElement("p");
    aviso.textContent = "Nenhum PPP agendado.";
    container.replaceChildren(aviso);
    return;
  }

  const linhas = Math.ceil(pppAtual.length / 3);
  const colunas = Math.ceil(pppAtual.length / linhas);
  container.className = `coluna c${colunas}`;

  container.replaceChildren(
    ...pppAtual.map((ppp, i) => {
      const div = document.createElement("div");
      // divisória entre colunas: todos menos o primeiro de cada linha
      div.className = i % colunas === 0 ? "ppp" : "ppp divisoria";

      const linhasTexto = [
        `Data: ${ppp.data}`,
        ppp.curso ? `${ppp.materia} (${ppp.curso})` : ppp.materia,
        `Sala/Hora: ${ppp.horaSala || "a definir"}`,
        `Petiano: ${ppp.petiano}`,
      ];
      for (const texto of linhasTexto) {
        const p = document.createElement("p");
        p.textContent = texto; // textContent evita injeção de HTML
        div.appendChild(p);
      }
      return div;
    }),
  );
}

async function carregar() {
  setStatus("Carregando...");
  try {
    const res = await fetch("/api/dados");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();

    //const parsed = JSON.parse(items);

    //ordena em ordem crescente
    items.sort((a, b) => {
      const dataA = a.data.split('/').reverse().join('');
      const dataB = b.data.split('/').reverse().join('');
      return dataA.localeCompare(dataB);
    });

    //mostra a apartir da data atual
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const hojeFormatted = `${ano}${mes}${dia}`;

    //Slice o objeto e deixa apenas os items apos a data de hoje
    const index = items.findIndex(item => {
      const dataItem = item.data.split('/').reverse().join('');
      return dataItem >= hojeFormatted;
    });

    const pppsHoje = index !== -1 ? items.slice(index) : [];

    //Filtra os PPPs do próximo dia que tem PPP (hoje, se houver). A lista já começa em hoje ou depois,
    //então a data do primeiro item é a do próximo PPP e todos os PPPs desse dia entram.
    const pppAtual = pppsHoje.length > 0 ? pppsHoje.filter(item => item.data === pppsHoje[0].data) : [];

    
    renderProximoPPP(pppAtual);
    setStatus(`${pppsHoje.length} de ${items.length} PPPs disponíveis. | Atualizado em ${hoje.toLocaleString("pt-BR")}`);
    renderTabela(pppsHoje);
    eid("btn").hidden = false;

  } catch (err) {
    console.error(err);
    document.getElementsByTagName("h1")[0].textContent = "Erro ao procurar";
    setStatus("Erro ao carregar os dados. Tente novamente em instantes.");
    eid("btn").hidden = true;
  }
}

carregar();
