/**
 * Basquete Brasil — backend (Google Apps Script), conta basquetebrasil.base@gmail.com
 * Mesma estrutura de login do Klaus TV (senha protegida com sal + SHA-256, senha provisória por e-mail,
 * troca obrigatória no primeiro acesso, sessão de 12 h).
 *
 * Planilhas lidas (só os nossos backups; o site nunca lê a federação direto):
 *   Backup RJ – FBERJ, Backup RS – FGB, Backup CBB – Federações estaduais, Backup CBB – CBI  -> abas Jogos e Classificacao
 * Planilha privada (nunca vai para o site): Basquete Brasil – Narradores (privado)
 *   Usuarios: A Login | B Nome de exibição | C Nome completo | D CPF | E E-mail | F Perfil | G Ativo | H Senha protegida | I Trocar senha | J Último acesso | K Criado em
 *   Pedidos:  A Data | B Nome completo | C Login desejado | D CPF | E E-mail | F Canal | G Aceitou termos | H Situação | I Observação
 *   Contratacoes: A ID do jogo | B UF | C Categoria | D Data | E Mandante | F Visitante | G Login | H Nome | I Link | J Registrado em
 *
 * Publicar: Implantar > Nova implantação > App da Web > Executar como: Eu > Quem pode acessar: Qualquer pessoa.
 * Depois rode uma vez, pelo editor, a função criarDono() (cria a senha provisória do Magno e manda por e-mail).
 */
const SITE = 'https://basquetebrasil.com';
const NARRADORES_ID = '1owmWHQqNgBn3Ez9LIpIETG1pzTafyg5Q8v5Kpp0bIOA';
const BACKUPS = [
  { uf: 'RJ', id: '1JF5dUiKoZjrZXAHTkCY4FJpxYUN0u-ZfV5VIshG0mqg' },
  { uf: 'RS', id: '1K5Yf5Xs9nPIn55FsuBAnxBPiGKFwoup1kVte1ET4IOU' },
  { uf: 'CBB', id: '1i-9yuC5xmodzc5p3YobSOmeE4-_AQqA2zdvbyj5nrhg' },
  { uf: 'CBI', id: '1-qdGj6lJhiOAYEFeYGby_EtaQvsU0gXnb_tPZwdlrVY' } // Backup CBB – CBI (nacional de clubes; as linhas usam UF "BR")
];
const HORAS_SESSAO = 12;

function doGet() { return responder({ ok: true, msg: 'Basquete Brasil backend ativo' }); }

function doPost(e) {
  let p = {};
  try { p = JSON.parse(e.postData.contents || '{}'); } catch (err) { return responder({ ok: false, erro: 'Pedido inválido.' }); }
  if (p.acao === 'calendario') return responder(calendario());
  if (p.acao === 'atualizacoes') return responder(atualizacoes());
  if (p.acao === 'visita') return responder(contarVisita(p.novo));
  if (p.acao === 'sugerirLink') { const l = LockService.getScriptLock(); l.waitLock(20000); try { return responder(sugerirLink(p.id, p.link)); } finally { l.releaseLock(); } }
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    switch (p.acao) {
      case 'pedirCadastro': return responder(pedirCadastro(p));
      case 'login': return responder(login(p.usuario, p.senha));
      case 'eu': return responder(eu(p.token));
      case 'trocarSenha': return responder(trocarSenha(p.token, p.senhaAtual, p.senhaNova));
      case 'sair': CacheService.getScriptCache().remove('s_' + p.token); return responder({ ok: true });
      case 'meusJogos': return responder(meusJogos(p.token));
      case 'marcarJogo': return responder(marcarJogo(p.token, p.id, p.link, p.papel));
      case 'desmarcarJogo': return responder(desmarcarJogo(p.token, p.id));
      case 'listarPedidos': return responder(listarPedidos(p.token));
      case 'aprovarPedido': return responder(aprovarPedido(p.token, p.linha));
      case 'recusarPedido': return responder(recusarPedido(p.token, p.linha, p.motivo));
      case 'listarUsuarios': return responder(listarUsuarios(p.token));
      case 'ativarUsuario': return responder(ativarUsuario(p.token, p.usuario, p.ativo));
      case 'listarVideos': return responder(listarVideos(p.token));
      case 'decidirVideo': return responder(decidirVideo(p.token, p.linha, p.aprovar));
      default: return responder({ ok: false, erro: 'Ação desconhecida.' });
    }
  } catch (err) {
    return responder({ ok: false, erro: 'Erro no servidor: ' + err.message });
  } finally { lock.releaseLock(); }
}

function responder(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function norm(x) { return String(x == null ? '' : x).replace(/ /g, ' ').replace(/\s+/g, ' ').trim(); }
function chave(x) { return norm(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim(); }
function agora() { return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'); }
function planilha() { return SpreadsheetApp.openById(NARRADORES_ID); }
function abaN(nome) { return planilha().getSheetByName(nome); }

/* ================= CALENDÁRIO (público) ================= */
function idJogo(uf, camp, cat, num, data, mand) {
  return [uf, chave(camp), chave(cat), num ? 'N' + norm(num) : chave(data) + ' ' + chave(mand)].join('|');
}
function calendario() {
  const c = CacheService.getScriptCache(); const hit = c.get('cal1'); if (hit) return JSON.parse(hit);
  const jogos = []; const posicoes = {}; const fontes = [];
  BACKUPS.forEach(b => {
    let ss; try { ss = SpreadsheetApp.openById(b.id); } catch (e) { return; }
    const sj = ss.getSheetByName('Jogos');
    if (sj && sj.getLastRow() > 1) {
      const v = sj.getDataRange().getDisplayValues(); const cab = v[0].map(chave); const ix = n => cab.indexOf(chave(n));
      const I = { coleta: ix('Data da coleta'), uf: ix('UF'), fed: ix('Federação'), camp: ix('Campeonato'), cat: ix('Categoria'), fase: ix('Fase/Turno'), num: ix('Nº do jogo'),
        data: ix('Data do jogo'), hora: ix('Horário'), local: ix('Local'), mand: ix('Mandante'), pm: ix('Placar mandante'), pv: ix('Placar visitante'), vis: ix('Visitante'),
        sit: ix('Situação'), fonte: ix('Fonte (link)'), atu: ix('Última atualização na fonte (data/hora)') };
      const g = (r, k) => I[k] >= 0 ? norm(r[I[k]]) : '';
      v.slice(1).forEach(r => {
        const data = g(r, 'data'), mand = g(r, 'mand'), vis = g(r, 'vis');
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data) || !mand || !vis) return; // só jogos com data publicada pela fonte
        const uf = g(r, 'uf') || b.uf;
        jogos.push({ id: idJogo(uf, g(r, 'camp'), g(r, 'cat'), g(r, 'num'), data, mand), uf: uf, fed: g(r, 'fed'), camp: g(r, 'camp'), cat: g(r, 'cat'), fase: g(r, 'fase'),
          num: g(r, 'num'), data: data, hora: g(r, 'hora'), local: g(r, 'local'), mand: mand, pm: g(r, 'pm'), pv: g(r, 'pv'), vis: vis, sit: g(r, 'sit'),
          fonte: g(r, 'fonte'), atu: g(r, 'atu'), coleta: g(r, 'coleta') });
      });
      fontes.push(b.uf);
    }
    const sc = ss.getSheetByName('Classificacao');
    if (sc && sc.getLastRow() > 1) {
      const v = sc.getDataRange().getDisplayValues(); const cab = v[0].map(chave); const ix = n => cab.indexOf(chave(n));
      const iu = ix('UF'), ic = ix('Categoria'), ig = ix('Grupo/Chave'), ip = ix('Posição'), ik = ix('Clube'), icp = ix('Campeonato');
      v.slice(1).forEach(r => {
        if (!r[ik] || !r[ip]) return;
        const k = [norm(r[iu]) || b.uf, chave(r[ic]), chave(r[ik])].join('|');
        if (!posicoes[k]) posicoes[k] = { pos: norm(r[ip]), grupo: norm(r[ig]), camp: norm(r[icp]) };
      });
    }
  });
  const narr = {};
  const sh = abaN('Contratacoes');
  if (sh && sh.getLastRow() > 1) sh.getDataRange().getDisplayValues().slice(1).forEach(r => { if (r[0] && r[7]) narr[r[0]] = { nome: r[7], link: r[8], papel: r[10] || 'Narrador' }; });
  const videos = {};
  const sv = abaN('Videos');
  if (sv && sv.getLastRow() > 1) sv.getDataRange().getDisplayValues().slice(1).forEach(r => { if (r[0] && r[2] && r[6] === 'Aprovado' && !videos[r[0]]) videos[r[0]] = { link: r[2], titulo: r[3], canal: r[4] }; });
  const res = { ok: true, gerado: agora(), fontes: fontes, jogos: jogos, posicoes: posicoes, narradores: narr, videos: videos };
  try { c.put('cal1', JSON.stringify(res), 300); } catch (e) {}
  return res;
}
/* ================= ÚLTIMA ATUALIZAÇÃO (público) =================
 * Lê a aba Log_Coletas de cada backup e devolve, para cada fonte (cestinhas, jogos, súmulas, classificação...),
 * a linha mais recente: data em que a federação mexeu no arquivo/página (quando ela informa) e a data do nosso
 * último backup que deu certo. Não inventa data: se a fonte não informa, vai vazio. */
function atualizacoes() {
  const c = CacheService.getScriptCache(); const hit = c.get('atu1'); if (hit) return JSON.parse(hit);
  const itens = {};
  const ok = r => /^(ok|sem mudan)/i.test(norm(r));
  const dt = s => { const m = norm(s).match(/(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?/); return m ? m[3] + m[2] + m[1] + (m[4] || '00') + (m[5] || '00') : ''; };
  BACKUPS.forEach(b => {
    let sh; try { sh = SpreadsheetApp.openById(b.id).getSheetByName('Log_Coletas'); } catch (e) { return; }
    if (!sh || sh.getLastRow() < 2) return;
    sh.getDataRange().getDisplayValues().slice(1).forEach(r => {
      const fonte = norm(r[2]); if (!fonte) return;
      const k = b.uf + '|' + fonte; const quando = dt(r[0]);
      const it = itens[k] || (itens[k] = { uf: norm(r[1]) || b.uf, fonte: fonte, coleta: '', ordem: '', backup: '', fed: '', resultado: '' });
      if (quando >= it.ordem) { it.ordem = quando; it.coleta = norm(r[0]); it.resultado = norm(r[3]);
        const f = norm(r[6]); it.fed = /^\d{2}\//.test(f) ? f : ''; }
      if (ok(r[3]) && quando >= dt(it.backup)) it.backup = norm(r[0]);
    });
  });
  const lista = Object.keys(itens).map(k => itens[k]).sort((a, b) => b.ordem.localeCompare(a.ordem) || a.fonte.localeCompare(b.fonte));
  lista.forEach(i => { i.situacao = ok(i.resultado) ? 'ok' : /parcial/i.test(i.resultado) ? 'parcial' : 'falhou'; if (/parcial/i.test(i.resultado) && dt(i.coleta) > dt(i.backup)) i.backup = i.coleta; delete i.ordem; });
  const res = { ok: true, gerado: agora(), itens: lista };
  try { c.put('atu1', JSON.stringify(res), 600); } catch (e) {}
  return res;
}
function limparCacheCalendario() { CacheService.getScriptCache().remove('cal1'); }

/* ================= PEDIDO DE CADASTRO (público) ================= */
function cpfValido(cpf) {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = n => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}
function pedirCadastro(p) {
  const nome = norm(p.nome), login = norm(p.login).toLowerCase(), email = norm(p.email), canal = norm(p.canal);
  const cpf = String(p.cpf || '').replace(/\D/g, '');
  if (nome.split(' ').length < 2) return { ok: false, erro: 'Escreva o nome completo.' };
  if (!/^[a-z0-9._-]{3,30}$/.test(login)) return { ok: false, erro: 'Login: use de 3 a 30 letras minúsculas, números, ponto ou traço (sem espaço).' };
  if (!cpfValido(cpf)) return { ok: false, erro: 'CPF inválido. Confira os números.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, erro: 'E-mail inválido.' };
  if (p.aceite !== true) return { ok: false, erro: 'É preciso aceitar os termos de uso dos dados.' };
  if (achar(login)) return { ok: false, erro: 'Esse login já está em uso. Escolha outro.' };
  const ped = abaN('Pedidos');
  const ja = ped.getLastRow() > 1 && ped.getDataRange().getDisplayValues().slice(1).some(r => r[7] === 'Pendente' && (r[2] === login || String(r[3]).replace(/\D/g, '') === cpf));
  if (ja) return { ok: false, erro: 'Já existe um pedido pendente com esse login ou CPF. Aguarde a análise.' };
  ped.appendRow([agora(), nome, login, cpf, email, canal, 'SIM', 'Pendente', '']);
  const dono = linhas().find(u => u.perfil === 'Dono' && u.email);
  if (dono) MailApp.sendEmail({ to: dono.email, subject: 'Basquete Brasil — novo pedido de narrador', name: 'Basquete Brasil',
    htmlBody: '<p>Novo pedido de cadastro de narrador:</p><p><b>' + nome + '</b> (login desejado: ' + login + ')<br>E-mail: ' + email + '<br>Canal: ' + (canal || '—') +
      '</p><p>Para aprovar, entre em <a href="' + SITE + '/narrador.html">' + SITE + '/narrador.html</a> › Pedidos.</p>' });
  return { ok: true, msg: 'Pedido enviado. Você vai receber um e-mail quando o cadastro for aprovado.' };
}

/* ================= USUÁRIOS E SENHA (mesma estrutura do Klaus TV) ================= */
function linhas() {
  const v = abaN('Usuarios').getDataRange().getValues();
  return v.slice(1).map((r, i) => ({
    linha: i + 2, usuario: String(r[0]).trim().toLowerCase(), nome: String(r[1] || r[0]), nomeCompleto: String(r[2]), email: String(r[4]).trim(),
    perfil: String(r[5]).trim(), ativo: String(r[6]).trim().toUpperCase() !== 'NÃO', hash: String(r[7]), trocar: String(r[8]).trim().toUpperCase() === 'SIM'
  })).filter(u => u.usuario);
}
function achar(usuario) { usuario = String(usuario || '').trim().toLowerCase(); return linhas().find(u => u.usuario === usuario); }
function gerarSal() { return Utilities.getUuid().replace(/-/g, '').slice(0, 16); }
function hashSenha(senha, sal) {
  let d = sal + '|' + senha;
  for (let i = 0; i < 1000; i++) d = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, d, Utilities.Charset.UTF_8));
  return sal + '$' + d;
}
function confere(senha, guardado) { const sal = String(guardado).split('$')[0]; return !!sal && hashSenha(senha, sal) === guardado; }
function senhaProvisoria() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; let s = 'BB-';
  for (let i = 0; i < 8; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  return s;
}
function senhaValida(s) { return typeof s === 'string' && s.length >= 6; }
function novaSessao(u) { const t = Utilities.getUuid() + Utilities.getUuid().slice(0, 8); CacheService.getScriptCache().put('s_' + t, u.usuario, HORAS_SESSAO * 3600); return t; }
function daSessao(token) {
  if (!token) return null; const usuario = CacheService.getScriptCache().get('s_' + token); if (!usuario) return null;
  const u = achar(usuario); return (u && u.ativo) ? u : null;
}
function publico(u) { return { usuario: u.usuario, nome: u.nome, perfil: u.perfil, email: u.email, trocarSenha: u.trocar, ehDono: u.perfil === 'Dono' }; }
function login(usuario, senha) {
  const u = achar(usuario);
  if (!u || !u.ativo || !u.hash || !confere(String(senha || ''), u.hash)) return { ok: false, erro: 'Usuário ou senha incorretos.' };
  abaN('Usuarios').getRange(u.linha, 10).setValue(agora());
  return { ok: true, token: novaSessao(u), usuario: publico(u) };
}
function eu(token) { const u = daSessao(token); return u ? { ok: true, usuario: publico(u) } : { ok: false, erro: 'Sessão expirada. Entre de novo.' }; }
function trocarSenha(token, atual, nova) {
  const u = daSessao(token); if (!u) return { ok: false, erro: 'Sessão expirada. Entre de novo.' };
  if (!confere(String(atual || ''), u.hash)) return { ok: false, erro: 'A senha atual está errada.' };
  if (!senhaValida(nova)) return { ok: false, erro: 'A nova senha precisa ter pelo menos 6 caracteres.' };
  if (nova === atual) return { ok: false, erro: 'A nova senha precisa ser diferente da atual.' };
  if (String(nova).toLowerCase() === u.usuario) return { ok: false, erro: 'A nova senha não pode ser igual ao login.' };
  const sh = abaN('Usuarios'); sh.getRange(u.linha, 8).setValue(hashSenha(nova, gerarSal())); sh.getRange(u.linha, 9).setValue('NÃO');
  return { ok: true, msg: 'Senha alterada.' };
}
function enviarAcesso(email, nome, usuario, prov) {
  MailApp.sendEmail({ to: email, subject: 'Basquete Brasil — seu acesso de narrador', name: 'Basquete Brasil',
    htmlBody: '<p>Olá, ' + nome + '!</p><p>Seu acesso à <b>Área do narrador</b> do Basquete Brasil foi liberado.</p>' +
      '<p>Endereço: <a href="' + SITE + '/narrador.html">' + SITE + '/narrador.html</a><br>Login: <b>' + usuario + '</b><br>Senha provisória: <b>' + prov + '</b></p>' +
      '<p>No primeiro acesso o site vai pedir para você criar uma senha nova.</p><p>Basquete Brasil · Estatísticas do basquete de base</p>' });
}
/* Rode UMA vez pelo editor: autoriza planilha e e-mail e manda a senha provisória do Dono (Magno). */
function criarDono() {
  const u = linhas().find(x => x.perfil === 'Dono'); if (!u) throw new Error('Não há linha com perfil Dono na aba Usuarios.');
  const prov = senhaProvisoria(); const sh = abaN('Usuarios');
  sh.getRange(u.linha, 8).setValue(hashSenha(prov, gerarSal())); sh.getRange(u.linha, 9).setValue('SIM');
  enviarAcesso(u.email, u.nome, u.usuario, prov);
  Logger.log('Senha provisória enviada para ' + u.email + '. E-mails restantes hoje: ' + MailApp.getRemainingDailyQuota());
}

/* ================= ÁREA DO NARRADOR ================= */
function jogoPorId(id) { return (calendario().jogos || []).find(j => j.id === id); }
function linhasContr() { const sh = abaN('Contratacoes'); return sh.getLastRow() > 1 ? sh.getDataRange().getDisplayValues().slice(1).map((r, i) => ({ linha: i + 2, r: r })) : []; }
function meusJogos(token) {
  const u = daSessao(token); if (!u) return { ok: false, erro: 'Sessão expirada. Entre de novo.' };
  return { ok: true, jogos: linhasContr().filter(x => x.r[6] === u.usuario).map(x => ({ id: x.r[0], uf: x.r[1], cat: x.r[2], data: x.r[3], mand: x.r[4], vis: x.r[5], link: x.r[8], papel: x.r[10] || 'Narrador' })) };
}
const PAPEIS = { narrador: 'Narrador', canal: 'Canal (transmissão)', ambos: 'Narrador e canal' };
function marcarJogo(token, id, link, papel) {
  const u = daSessao(token); if (!u) return { ok: false, erro: 'Sessão expirada. Entre de novo.' };
  if (u.trocar) return { ok: false, erro: 'Troque a senha provisória antes de continuar.' };
  link = norm(link); if (!/^https:\/\/\S+$/.test(link)) return { ok: false, erro: 'Informe o link da transmissão começando com https://' };
  const j = jogoPorId(id); if (!j) return { ok: false, erro: 'Jogo não encontrado no calendário.' };
  const outro = linhasContr().find(x => x.r[0] === id && x.r[6] !== u.usuario);
  if (outro) return { ok: false, erro: 'Este jogo já tem narrador: ' + outro.r[7] + '. Fale com o Basquete Brasil se houver engano.' };
  const meu = linhasContr().find(x => x.r[0] === id && x.r[6] === u.usuario);
  const pp = PAPEIS[papel] || PAPEIS.narrador;
  const linha = [id, j.uf, j.cat, j.data + (j.hora ? ' ' + j.hora : ''), j.mand, j.vis, u.usuario, u.nome, link, agora(), pp];
  const sh = abaN('Contratacoes');
  if (meu) sh.getRange(meu.linha, 1, 1, linha.length).setValues([linha]); else sh.appendRow(linha);
  limparCacheCalendario();
  return { ok: true, msg: 'Jogo marcado como ' + pp.toLowerCase() + '. Seu nome já aparece no calendário.' };
}
function desmarcarJogo(token, id) {
  const u = daSessao(token); if (!u) return { ok: false, erro: 'Sessão expirada. Entre de novo.' };
  const meu = linhasContr().find(x => x.r[0] === id && (x.r[6] === u.usuario || u.perfil === 'Dono'));
  if (!meu) return { ok: false, erro: 'Você não está marcado neste jogo.' };
  abaN('Contratacoes').deleteRow(meu.linha); limparCacheCalendario();
  return { ok: true, msg: 'Jogo desmarcado.' };
}

/* ================= DONO: pedidos e usuários ================= */
function exigeDono(token) { const u = daSessao(token); if (!u) return { erro: { ok: false, erro: 'Sessão expirada. Entre de novo.' } }; if (u.perfil !== 'Dono') return { erro: { ok: false, erro: 'Só o administrador pode fazer isso.' } }; return { u: u }; }
function mascaraCpf(c) { c = String(c).replace(/\D/g, ''); return c.length === 11 ? '***.' + c.slice(3, 6) + '.***-' + c.slice(9) : ''; }
function listarPedidos(token) {
  const d = exigeDono(token); if (d.erro) return d.erro; const sh = abaN('Pedidos');
  const v = sh.getLastRow() > 1 ? sh.getDataRange().getDisplayValues().slice(1) : [];
  return { ok: true, pedidos: v.map((r, i) => ({ linha: i + 2, data: r[0], nome: r[1], login: r[2], cpf: mascaraCpf(r[3]), email: r[4], canal: r[5], situacao: r[7], obs: r[8] })).filter(x => x.nome) };
}
function aprovarPedido(token, linha) {
  const d = exigeDono(token); if (d.erro) return d.erro; const sh = abaN('Pedidos');
  const r = sh.getRange(Number(linha), 1, 1, 9).getDisplayValues()[0];
  if (r[7] !== 'Pendente') return { ok: false, erro: 'Este pedido não está pendente.' };
  if (achar(r[2])) return { ok: false, erro: 'Já existe um usuário com o login ' + r[2] + '.' };
  const prov = senhaProvisoria();
  abaN('Usuarios').appendRow([r[2], r[2], r[1], String(r[3]).replace(/\D/g, ''), r[4], 'Narrador', 'SIM', hashSenha(prov, gerarSal()), 'SIM', '', agora()]);
  sh.getRange(Number(linha), 8, 1, 2).setValues([['Aprovado', 'Aprovado por ' + d.u.usuario + ' em ' + agora()]]);
  enviarAcesso(r[4], r[1].split(' ')[0], r[2], prov);
  return { ok: true, msg: 'Narrador aprovado. A senha provisória foi enviada para ' + r[4] + '.' };
}
function recusarPedido(token, linha, motivo) {
  const d = exigeDono(token); if (d.erro) return d.erro; const sh = abaN('Pedidos');
  if (sh.getRange(Number(linha), 8).getDisplayValue() !== 'Pendente') return { ok: false, erro: 'Este pedido não está pendente.' };
  sh.getRange(Number(linha), 8, 1, 2).setValues([['Recusado', norm(motivo) || ('Recusado por ' + d.u.usuario + ' em ' + agora())]]);
  return { ok: true, msg: 'Pedido recusado.' };
}
function listarUsuarios(token) {
  const d = exigeDono(token); if (d.erro) return d.erro;
  return { ok: true, usuarios: linhas().map(u => ({ usuario: u.usuario, nome: u.nome, perfil: u.perfil, email: u.email, ativo: u.ativo, trocarSenha: u.trocar })) };
}
function ativarUsuario(token, usuario, ativo) {
  const d = exigeDono(token); if (d.erro) return d.erro; const u = achar(usuario); if (!u) return { ok: false, erro: 'Usuário não encontrado.' };
  if (u.perfil === 'Dono') return { ok: false, erro: 'O administrador não pode ser desativado.' };
  abaN('Usuarios').getRange(u.linha, 7).setValue(ativo ? 'SIM' : 'NÃO');
  return { ok: true, msg: 'Usuário ' + u.usuario + (ativo ? ' ativado.' : ' desativado.') };
}

/* ================= VÍDEOS DOS JOGOS (link enviado pelo público, conferido antes de aparecer) ================= */
const GENERICOS = { CLUBE: 1, CLUB: 1, BASQUETE: 1, BASKET: 1, BASKETBALL: 1, ESPORTE: 1, ESPORTES: 1, FUTEBOL: 1, REGATAS: 1, ATLETICO: 1, FOOTBALL: 1, ASSOCIACAO: 1, ESCOLINHA: 1, TENIS: 1, DE: 1, DA: 1, DO: 1, DOS: 1, DAS: 1, E: 1, A: 1, C: 1, R: 1, F: 1, S: 1, T: 1, B: 1, AC: 1, FC: 1, EC: 1, SUB: 1 };
function tokensTime(nome) { return chave(nome).split(' ').filter(t => t.length >= 3 && !GENERICOS[t]); }
function idYoutube(link) {
  const m = String(link || '').match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
}
function infoYoutube(vid) {
  try {
    const r = UrlFetchApp.fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + vid), { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return null;
    const j = JSON.parse(r.getContentText()); return { titulo: String(j.title || ''), canal: String(j.author_name || '') };
  } catch (e) { return null; }
}
/* Confere se o título do vídeo bate com o jogo: os dois times e (categoria ou data). Só aprova sozinho quando tudo bate. */
function conferirVideo(j, info) {
  const t = ' ' + chave(info.titulo) + ' ';
  const timeOk = nome => tokensTime(nome).some(k => t.indexOf(' ' + k + ' ') >= 0);
  const num = (String(j.cat).match(/\d{2}/) || [])[0];
  const catOk = !!num && new RegExp('(SUB|U) ?' + num + '( |$)').test(t.trim() + ' ');
  const d = String(j.data).split('/'); const dataOk = d.length === 3 && new RegExp('(^| )' + Number(d[0]) + ' 0?' + Number(d[1]) + '( |$)|(^| )' + d[0] + ' ' + d[1] + '( |$)').test(t.trim());
  const a = timeOk(j.mand), b = timeOk(j.vis);
  const nota = [a ? 'mandante ✓' : 'mandante ✗', b ? 'visitante ✓' : 'visitante ✗', catOk ? 'categoria ✓' : 'categoria ✗', dataOk ? 'data ✓' : 'data ✗'].join(', ');
  return { aprovado: a && b && (catOk || dataOk), nota: nota };
}
function jogoRealizado(j) {
  const m = String(j.data).match(/^(\d{2})\/(\d{2})\/(\d{4})$/); const hoje = Number(Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd'));
  return (j.pm !== '' && j.pv !== '') || /realiz|encerr|finaliz/i.test(j.sit) || (m && Number(m[3] + m[2] + m[1]) < hoje);
}
function sugerirLink(id, link) {
  const c = CacheService.getScriptCache(); const n = Number(c.get('sug_min') || 0);
  if (n > 30) return { ok: false, erro: 'Muitos envios agora. Tente de novo em alguns minutos.' }; c.put('sug_min', String(n + 1), 60);
  link = norm(link); const vid = idYoutube(link);
  if (!vid) return { ok: false, erro: 'Mande um link do YouTube (youtube.com ou youtu.be).' };
  const j = jogoPorId(id); if (!j) return { ok: false, erro: 'Jogo não encontrado no calendário.' };
  if (!jogoRealizado(j)) return { ok: false, erro: 'Só dá para enviar link de jogo que já aconteceu. O link de jogo agendado é colocado pelo narrador.' };
  const sh = abaN('Videos'); const v = sh.getLastRow() > 1 ? sh.getDataRange().getDisplayValues().slice(1) : [];
  if (v.some(r => r[0] === id && idYoutube(r[2]) === vid)) return { ok: false, erro: 'Esse link já foi enviado para este jogo. Obrigado!' };
  if (v.some(r => r[0] === id && r[6] === 'Aprovado')) return { ok: false, erro: 'Este jogo já tem vídeo. Obrigado!' };
  const info = infoYoutube(vid);
  if (!info) return { ok: false, erro: 'Não consegui abrir esse vídeo no YouTube. Confira se ele é público.' };
  const conf = conferirVideo(j, info);
  const limpo = 'https://www.youtube.com/watch?v=' + vid;
  sh.appendRow([id, j.data + ' · ' + j.cat + ' · ' + j.mand + ' x ' + j.vis, limpo, info.titulo, info.canal, 'público', conf.aprovado ? 'Aprovado' : 'Pendente', 'Automática: ' + conf.nota, agora()]);
  if (conf.aprovado) { limparCacheCalendario(); return { ok: true, aprovado: true, msg: 'Obrigado! O vídeo confere com o jogo e já aparece no calendário.' }; }
  return { ok: true, aprovado: false, msg: 'Obrigado! O título do vídeo não confirma tudo sozinho, então ele vai para análise antes de aparecer.' };
}
function listarVideos(token) {
  const d = exigeDono(token); if (d.erro) return d.erro; const sh = abaN('Videos');
  const v = sh.getLastRow() > 1 ? sh.getDataRange().getDisplayValues().slice(1) : [];
  return { ok: true, videos: v.map((r, i) => ({ linha: i + 2, jogo: r[1], link: r[2], titulo: r[3], canal: r[4], origem: r[5], situacao: r[6], verif: r[7], data: r[8] })).filter(x => x.link) };
}
function decidirVideo(token, linha, aprovar) {
  const d = exigeDono(token); if (d.erro) return d.erro; const sh = abaN('Videos');
  if (sh.getRange(Number(linha), 7).getDisplayValue() !== 'Pendente') return { ok: false, erro: 'Este vídeo não está pendente.' };
  sh.getRange(Number(linha), 7).setValue(aprovar ? 'Aprovado' : 'Recusado');
  sh.getRange(Number(linha), 8).setValue(sh.getRange(Number(linha), 8).getDisplayValue() + ' · ' + (aprovar ? 'aprovado' : 'recusado') + ' por ' + d.u.usuario + ' em ' + agora());
  limparCacheCalendario();
  return { ok: true, msg: aprovar ? 'Vídeo aprovado: já aparece no calendário.' : 'Vídeo recusado.' };
}
/* Rode uma vez pelo editor depois de colar esta versão: autoriza o acesso ao YouTube (UrlFetch). */
function autorizarYoutube() { Logger.log(JSON.stringify(infoYoutube('dQw4w9WgXcQ'))); }

/* ================= CONTADOR DE VISITAS (igual ao Klaus TV; Magno, 23/11/2026) =================
 * Início e Calendário chamam 'visita'. novo=1 só na 1ª visita do dia daquele navegador (soma 1); novo=0 só lê o total.
 * O total fica nas Propriedades do script (chave 'visitas'). */
function contarVisita(novo) {
  const pr = PropertiesService.getScriptProperties(); const ler = () => Number(pr.getProperty('visitas') || 0);
  if (!novo) return { ok: true, total: ler() };
  const l = LockService.getScriptLock(); if (!l.tryLock(5000)) return { ok: true, total: ler() };
  try { const t = ler() + 1; pr.setProperty('visitas', String(t)); return { ok: true, total: t }; } finally { l.releaseLock(); }
}
