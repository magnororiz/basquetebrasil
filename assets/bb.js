/* Basquete Brasil — funções comuns das páginas (menu, rodapé, conexão com o backend, escudos) */
/* Cole aqui a URL do App da Web do Apps Script (conta basquetebrasil.base), terminada em /exec */
const BB_API = 'https://script.google.com/macros/s/AKfycbxVoOR5y7-uzTFf1A_sK_eMuFPX7KGlUW9GEl7h6cFLFJvUWbom54kJRKDT407KHj3Akw/exec';

function bbApiPronta() { return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(BB_API); }
async function bbApi(dados) {
  if (!bbApiPronta()) return { ok: false, erro: 'O sistema ainda está sendo instalado. Volte em breve.' };
  try {
    const r = await fetch(BB_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(dados) });
    return await r.json();
  } catch (e) { return { ok: false, erro: 'Sem conexão com o servidor. Tente de novo.' }; }
}
function bbEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* Escudos dos clubes do RJ (mesmos arquivos do Klaus TV). Clube sem escudo mostra [logo]. */
const BB_SIGLAS = {"ABIG - IGUABA GRANDE":"IG","ABIG / IGUABA GRANDE":"IG","ABIG / JIC / SHARK'S":"ABIG","ACEAR / IRAJÁ A. C. / PJMC":"ACEAR","ACEAR / IRAJÁ A.C. / PJMC":"ACEAR","ACEAR / IRAJÁ A.C. / PROJETO MC":"ACEAR","ASP C. MUNICIPAL":"ASPCM","ASP CLUB MUNICIPAL":"ASPCM","BASQUETE S.A":"BSA","BASQUETE S.A.":"BSA","BOTAFOGO F. R.":"BFR","BOTAFOGO F.R.":"BFR","C. R. FLAMENGO":"CRF","C.R. FLAMENGO":"CRF","CARIOCA KING'S":"CK","CCL":"CCL","CESC":"CESC","CFCSN":"CFCSN","E. E. PASSO ZERO":"EEPZ","E.E. PASSO ZERO":"EEPZ","FLUMINENSE F. C.":"FFC","FLUMINENSE F.C.":"FFC","FLUMINESE F. C.":"FFC","IDEC":"IDEC","ITAIPU BASQUETE":"IB","ITDA":"ITDA","JACAREPAGUÁ T. C.":"JTC","JACAREPAGUÁ T.C.":"JTC","K ESPORTES":"KE","MESQUITA BASQUETE":"MB","NITERÓI B. C.":"NBC","NITERÓI B.C.":"NBC","TEAM KLUN ACADEMY":"TKA","TIJUCA BASKET":"TTC","TIJUCA T. C. / RAIZEIRAS":"TTC"};
const BB_ESCUDOS = ['ABIG','ACEAR','ASPCM','BFR','BSA','CCL','CESC','CFCSN','CK','CRF','EEPZ','FFC','IB','IDEC','IG','ITDA','JTC','KE','MB','NBC','TKA','TTC'];
function bbEscudo(uf, clube) {
  if (uf !== 'RJ') return '';
  const n = String(clube || '').trim().toUpperCase();
  const s = BB_SIGLAS[n] || (BB_ESCUDOS.indexOf(n) >= 0 ? n : '');
  return s && BB_ESCUDOS.indexOf(s) >= 0 ? 'assets/escudos/' + s + '.png' : '';
}

/* Menu e rodapé iguais aos da página inicial */
function bbMenu(ativo) {
  const itens = [['index.html#inicio', 'Início'], ['index.html#rankings', 'Rankings'], ['index.html#atletas', 'Atletas'], ['index.html#federacoes', 'Federações'],
    ['calendario.html', 'Calendário'], ['index.html#narradores', 'Narradores'], ['scout.html', 'Scout'], ['index.html#anuncie', 'Anuncie']];
  const nav = itens.map(([h, t]) => t === ativo
    ? '<a href="' + h + '" style="color:#FFDF00;text-decoration:none;border-bottom:2px solid #FFDF00;padding:6px 0">' + t + '</a>'
    : '<a href="' + h + '" style="color:#FFFFFF;text-decoration:none;padding:6px 0">' + t + '</a>').join('');
  return '<div aria-hidden="true" style="display:flex;height:6px"><div style="flex:3;background:#009C3B"></div><div style="flex:1;background:#FFDF00"></div><div style="flex:1;background:#002776"></div></div>' +
    '<header style="background:#002776;color:#FFFFFF"><div style="max-width:1200px;margin:0 auto;padding:14px 24px;display:flex;flex-wrap:wrap;align-items:center;gap:16px 32px">' +
    '<a href="index.html" style="display:flex;align-items:center;text-decoration:none"><img src="assets/logo-basquete-brasil.png" alt="Basquete Brasil · Estatísticas do basquete de base" style="height:76px;width:auto;display:block"></a>' +
    '<nav aria-label="Menu principal" style="display:flex;flex-wrap:wrap;gap:4px 22px;flex:1 1 420px;font-size:15px;font-weight:500">' + nav + '</nav>' +
    '<a href="narrador.html" style="display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:8px;background:#FFDF00;color:#002776;font-weight:700;text-decoration:none;font-size:15px">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>Área do narrador</a>' +
    '</div></header>';
}
function bbMontar(ativo) {
  const m = document.getElementById('bb-menu'); if (m) m.innerHTML = bbMenu(ativo);
  const r = document.getElementById('bb-rodape');
  if (r) fetch('assets/rodape.html').then(x => x.text()).then(t => { r.innerHTML = t; }).catch(() => {});
}

/* Federações: sigla, nome, site e cores (cor principal + 2 faixas). Cores tiradas da bandeira do estado; CBI nas cores do site. */
const BB_FED = {
  BR: { sigla: 'CBI', nome: 'Nacional – CBI', site: 'https://www.cbb.com.br/', cores: ['#002776', '#FFDF00', '#009C3B'] },
  DF: { sigla: 'FBDF', nome: 'Federação de Basquetebol do Distrito Federal', site: 'https://fbdf.com.br/', cores: ['#00753A', '#FFD100', '#FFFFFF'] },
  RJ: { sigla: 'FBERJ', nome: 'Federação de Basquetebol do Estado do Rio de Janeiro', site: 'http://www.fberj.com.br/', cores: ['#0A4DA2', '#C9A227', '#FFFFFF'] },
  RS: { sigla: 'FGB', nome: 'Federação Gaúcha de Basketball', site: 'https://basquetegaucho.com.br/', cores: ['#C8102E', '#00843D', '#FFD100'] },
  SP: { sigla: 'FPB', nome: 'Federação Paulista de Basketball', site: 'https://fpb.com.br/', cores: ['#111111', '#E30613', '#FFFFFF'] }
};
/* Fundo do selo: duas faixas finas à esquerda + cor principal */
function bbFedFundo(uf) { const f = BB_FED[uf]; if (!f) return '#4A5675'; const [a, b, c] = f.cores; return 'linear-gradient(90deg,' + b + ' 0 6px,' + c + ' 6px 10px,' + a + ' 10px)'; }
/* "SUB 16 FEM" -> "Sub-16 Feminino" */
function bbCat(c) { return String(c || '').replace(/sub\s*-?\s*(\d+)/i, 'Sub-$1').replace(/\bFEM(ININO)?\b/i, 'Feminino').replace(/\bMASC(ULINO)?\b/i, 'Masculino').trim(); }
