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
const BB_SIGLAS = {"ABIG - IGUABA GRANDE":"IG","ABIG / IGUABA GRANDE":"IG","ABIG / JIC / SHARK'S":"ABIG","ACEAR / IRAJÁ A. C. / PJMC":"ACEAR","ACEAR / IRAJÁ A.C. / PJMC":"ACEAR","ACEAR / IRAJÁ A.C. / PROJETO MC":"ACEAR","ASP C. MUNICIPAL":"ASPCM","ASP CLUB MUNICIPAL":"ASPCM","BASQUETE S.A":"BSA","BASQUETE S.A.":"BSA","BOTAFOGO F. R.":"BFR","BOTAFOGO F.R.":"BFR","C. R. FLAMENGO":"CRF","C.R. FLAMENGO":"CRF","CARIOCA KING'S":"CK","CCL":"CCL","CESC":"CESC","CFCSN":"CFCSN","E. E. PASSO ZERO":"EEPZ","E.E. PASSO ZERO":"EEPZ","FLUMINENSE F. C.":"FFC","FLUMINENSE F.C.":"FFC","FLUMINESE F. C.":"FFC","IDEC":"IDEC","ITAIPU BASQUETE":"IB","ITDA":"ITDA","JACAREPAGUÁ T. C.":"JTC","JACAREPAGUÁ T.C.":"JTC","K ESPORTES":"KE","MESQUITA BASQUETE":"MB","NITERÓI B. C.":"NBC","NITERÓI B.C.":"NBC","TEAM KLUN ACADEMY":"TKA","TIJUCA BASKET":"TTC","TIJUCA T. C. / RAIZEIRAS":"TTC","TIJUCA TC - RAIZEIRAS":"TTC"};
const BB_ESCUDOS = ['ABIG','ACEAR','ASPCM','BFR','BSA','CCL','CESC','CFCSN','CK','CRF','EEPZ','FFC','IB','IDEC','IG','ITDA','JTC','KE','MB','NBC','TKA','TTC'];
/* Escudos de SP e DF: só o link da imagem publicada pela CBB (não guardamos cópia). Nome do time exatamente como vem da CBB. */
const BB_LOGOS = {"DF":{"ASSOCIACAO LANCE LIVRE":"https://images.statsengine.playbyplay.api.geniussports.com/829941e10c38a5f9099f838598f93526M1.png","MOVEON BASKET":"https://images.statsengine.playbyplay.api.geniussports.com/ee47c9320dd527f6896ef2344e079e82S1.png","CLUBE VIZINHANCA":"https://images.statsengine.playbyplay.api.geniussports.com/bd02e5f3cd6ce23f72241a030478b4faT1.png","AR4 BASQUETE":"https://images.statsengine.playbyplay.api.geniussports.com/70cc0068b890da25d8e204dbcbfa4019L1.png","DF MAGIC":"https://images.statsengine.playbyplay.api.geniussports.com/1e47c80d244fb63899adcb6a80cc61d3M1.png","AACB BRASILIA BASQUETE":"https://images.statsengine.playbyplay.api.geniussports.com/1419a1f75e3eb3360a377f9aded27588M1.png","CERRADO BASQUETE":"https://images.statsengine.playbyplay.api.geniussports.com/78eabad364954f0d3333e8bea4216f30M1.png","SESC OLIMPICO":"https://images.statsengine.playbyplay.api.geniussports.com/3b6637f870de460811ffed11a672c08bL1.png","SOCIEDADE ESPORTIVA VIPER":"https://images.statsengine.playbyplay.api.geniussports.com/f35487ef841467da08874b601cdbadb9M1.png","FILADELFIA BASQUETE":"https://images.statsengine.playbyplay.api.geniussports.com/e46345f821346b72a2716847078dc9aaS1.png","CSUV 1":"https://images.statsengine.playbyplay.api.geniussports.com/e4282bc4eca91f3e64617e110f8c1234T1.png","AACB BRASILIA 2":"https://images.statsengine.playbyplay.api.geniussports.com/fa3042b94ad8e273b8da0c39fd9cf231M1.png","IATE CLUBE BRASILIA":"https://images.statsengine.playbyplay.api.geniussports.com/4b8b06678132e67d9574d5a38aa62004M1.png","EVOLUCAO BASQUETE":"https://images.statsengine.playbyplay.api.geniussports.com/ccae2817f398710bd748fe2b120bfc18L1.png","AACB EK9":"https://images.statsengine.playbyplay.api.geniussports.com/a1c5203a9b6b6eb56d37eaca71b62281M1.png","AACB MVB":"https://images.statsengine.playbyplay.api.geniussports.com/3de2091f884c2b88ecfa845407e4bf4bM1.png","PROJETO FUTURO CAMPEAO":"https://images.statsengine.playbyplay.api.geniussports.com/2d3f02c0d027d0acb129b8048eb93ca9M1.png"},"SP":{"APAGEBASK GUARULHOS":"https://images.dc.connect.sportradar.com/b1k3u/8ade24b76d914b449a44b746fca87694","ATB ASSOCIACAO TUPA BASQUETE":"https://images.dc.connect.sportradar.com/b1k3u/1130c518db2146a3bd0b8a48ddc8dcaf","A D CENTRO OLIMPICO":"https://images.dc.connect.sportradar.com/b1k3u/8fc7b286dd2d441f933134aa13398b5e","A D SANTO ANDRE":"https://images.dc.connect.sportradar.com/b1k3u/1ec5585c4cfa4ab6b8d4d46a3b0960cd","APABI EQUIPE ITATIBA":"https://images.dc.connect.sportradar.com/b1k3u/afb95cc9f1d34d39a8da45cfc5bf7244","ARAE SMEL CATANDUVA":"https://images.dc.connect.sportradar.com/b1k3u/63d9d2db82b5494caff6925f5331009c","FEAC FRANCA BASQUETE":"https://images.dc.connect.sportradar.com/b1k3u/87165eb4b6a143eea2ddfd54c4abe1bd","SESI ARARAQUARA":"https://images.dc.connect.sportradar.com/b1k3u/5b53fef2ebbf48fa87ae2b8a6ccb3add","SAO JOSE DOS CAMPOS BASKETBALL":"https://images.dc.connect.sportradar.com/b1k3u/a5afa8ebaea443a49f970a8dd3a0a15e","PRO ESPORTE SOROCABA":"https://images.dc.connect.sportradar.com/b1k3u/d32a68d438494c909b32d0320d927ff7","MOGI BASQUETE":"https://images.dc.connect.sportradar.com/b1k3u/44c811b61038426fbe247602e4b83f10","F R TUPA":"https://images.dc.connect.sportradar.com/b1k3u/87199c70f2fa48ecbf9bcc7d83aa3f5a","CLUB ATHLETICO PAULISTANO":"https://images.dc.connect.sportradar.com/b1k3u/ced4b6374a564be2ac14a489ff2c25d0","E C PINHEIROS":"https://images.dc.connect.sportradar.com/b1k3u/5452bf1b3e374619b914e24a26796123","S C CORINTHIANS PAULISTA":"https://images.dc.connect.sportradar.com/b1k3u/e92033e9d0694759ae7a4035723530d3","S E PALMEIRAS":"https://images.dc.connect.sportradar.com/b1k3u/f67fc529dced4e2ebe1c607321221bba","SESI FRANCA BASQUETE":"https://images.dc.connect.sportradar.com/b1k3u/fe492f1d8f444636b5bffa2543ee6962","CLUBE CAMPINEIRO DE REGATAS E NATACAO":"https://images.dc.connect.sportradar.com/b1k3u/c2cdfa43a33440a5bd5dee9351d03221","SAO BERNARDO BASQUETE":"https://images.dc.connect.sportradar.com/b1k3u/ae2a95c545ed47c1b622a3dab1435412","HIPICA CAMPINAS":"https://images.dc.connect.sportradar.com/b1k3u/99e866ce645a4516957afb21a617f4c9","BAURU BASKET":"https://images.dc.connect.sportradar.com/b1k3u/03ae335e0a7f4254b48198c9f2285a51","CLUBE PAINEIRAS DO MORUMBY":"https://images.dc.connect.sportradar.com/b1k3u/3a625e95c0994db7b4824959940809e7","CLUBE ESPERIA":"https://images.dc.connect.sportradar.com/b1k3u/d053f7de7e7e4b0da5424a1a961a7335","LIMEIRA BASQUETE":"https://images.dc.connect.sportradar.com/b1k3u/e757bdeab7a64e7a8876ba087b76e2ba","SOROCABA BASQUETE":"https://images.dc.connect.sportradar.com/b1k3u/553efab27613497a915db6e3b65ee802","CLUBE ATLETICO CRAVINHOS":"https://images.dc.connect.sportradar.com/b1k3u/e2960a622ef1429186d4374a0f0331e4","INTERNACIONAL DE REGATAS":"https://images.dc.connect.sportradar.com/b1k3u/6ed18e98d503497da64f2008e1af2975","JANDIRA SELAR ACADEMIAJ1 INST LINO":"https://images.dc.connect.sportradar.com/b1k3u/a10f92bc5b3f46bab53cc1b9d218942a"}};
function bbChave(x) { return String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim(); }
/* Nome do time sem a categoria no fim (a CBB escreve "Cerrado Basquete -15"; a categoria já aparece no jogo) */
function bbNomeLimpo(nome) { return String(nome || '').replace(/\s*-\s*(1[0-9]|2[0-3])\s*$/, '').trim(); }
/* Nomes diferentes do MESMO time, confirmados pelo Magno: { UF: { 'CHAVE DO NOME': 'Nome que aparece' } } */
const BB_UNIR = {"RJ":{"FLUMINESE F C":"FLUMINENSE F.C.","FLUMINENSE F C":"FLUMINENSE F.C.","ABIG IGUABA GRANDE":"ABIG - IGUABA GRANDE","ABIG JIC SHARK S":"ABIG - JIC - SHARK'S","TIJUCA BASKET":"TIJUCA TC - RAIZEIRAS","TIJUCA T C RAIZEIRAS":"TIJUCA TC - RAIZEIRAS"},"DF":{"FILADELFIA BASQUETE 2":"Filadélfia Basquete"},"SP":{"MOG":"MOGI BASQUETE","COR":"S.C. CORINTHIANS PAULISTA","PIN":"E.C. PINHEIROS","BAU":"BAURU BASKET","CAP":"CLUB ATHLETICO PAULISTANO","SJC":"SÃO JOSÉ DOS CAMPOS BASKETBALL","FRA":"SESI FRANCA BASQUETE"}}; /* confirmado em 23/11/2026 */
/* Junta as variações de nome: tira a categoria, aplica BB_UNIR e, quando só muda ponto, espaço ou acento,
   usa a grafia mais frequente. Guarda o nome original da fonte em mandF / visF. */
function bbUnificar(jogos) {
  const limpo = (uf, n) => { const l = bbNomeLimpo(n); return (BB_UNIR[uf] && BB_UNIR[uf][bbChave(l)]) || l; };
  const conta = {};
  jogos.forEach(j => [j.mand, j.vis].forEach(n => { const l = limpo(j.uf, n), k = j.uf + '|' + bbChave(l); (conta[k] = conta[k] || {})[l] = (conta[k][l] || 0) + 1; }));
  const melhor = {};
  Object.keys(conta).forEach(k => { melhor[k] = Object.keys(conta[k]).sort((a, b) => conta[k][b] - conta[k][a] || (b.normalize('NFD').length - b.length) - (a.normalize('NFD').length - a.length) || a.localeCompare(b))[0]; });
  jogos.forEach(j => { j.mandF = j.mand; j.visF = j.vis;
    j.mand = melhor[j.uf + '|' + bbChave(limpo(j.uf, j.mand))]; j.vis = melhor[j.uf + '|' + bbChave(limpo(j.uf, j.vis))]; });
  return jogos;
}
const BB_SIGLAS_K = {}; Object.keys(BB_SIGLAS).forEach(n => { BB_SIGLAS_K[bbChave(n)] = BB_SIGLAS[n]; });
function bbEscudo(uf, clube) {
  const k = bbChave(bbNomeLimpo(clube));
  if (uf === 'RJ') { const s = BB_SIGLAS_K[k] || (BB_ESCUDOS.indexOf(k) >= 0 ? k : ''); return s ? 'assets/escudos/' + s + '.png' : ''; }
  const m = BB_LOGOS[uf]; return (m && m[k]) || '';
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
/* Se a CBB tirar um escudo do ar, a imagem quebrada some (o nome do time continua). */
document.addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && /geniussports|sportradar/.test(t.src)) t.style.display = 'none'; }, true);
