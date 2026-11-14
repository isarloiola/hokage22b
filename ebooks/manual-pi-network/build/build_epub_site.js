const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createZip(entries) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const entry of entries) {
    const fileNameBuf = Buffer.from(entry.name, 'utf8');
    const isStored = Boolean(entry.store);
    const uncompressedData = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const crc = crc32(uncompressedData);
    const uncompressedSize = uncompressedData.length;

    let compressedData = uncompressedData;
    let method = 0; // Stored

    if (!isStored) {
      compressedData = zlib.deflateRawSync(uncompressedData);
      method = 8; // Deflate
    }
    const compressedSize = compressedData.length;

    // Local Header (30 bytes + filename)
    const lh = Buffer.alloc(30 + fileNameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0); // signature
    lh.writeUInt16LE(20, 4); // version needed (2.0)
    lh.writeUInt16LE(0, 6); // flags
    lh.writeUInt16LE(method, 8); // compression method
    lh.writeUInt16LE(0, 10); // mod time
    lh.writeUInt16LE(0, 12); // mod date
    lh.writeUInt32LE(crc, 14); // crc32
    lh.writeUInt32LE(compressedSize, 18); // compressed size
    lh.writeUInt32LE(uncompressedSize, 22); // uncompressed size
    lh.writeUInt16LE(fileNameBuf.length, 26); // filename length
    lh.writeUInt16LE(0, 28); // extra field length
    fileNameBuf.copy(lh, 30);

    localHeaders.push(lh, compressedData);

    // Central Directory Header (46 bytes + filename)
    const cd = Buffer.alloc(46 + fileNameBuf.length);
    cd.writeUInt32LE(0x02014b50, 0); // signature
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0, 8); // flags
    cd.writeUInt16LE(method, 10); // compression method
    cd.writeUInt16LE(0, 12); // mod time
    cd.writeUInt16LE(0, 14); // mod date
    cd.writeUInt32LE(crc, 16); // crc32
    cd.writeUInt32LE(compressedSize, 20); // compressed size
    cd.writeUInt32LE(uncompressedSize, 24); // uncompressed size
    cd.writeUInt16LE(fileNameBuf.length, 28); // filename length
    cd.writeUInt16LE(0, 30); // extra field length
    cd.writeUInt16LE(0, 32); // comment length
    cd.writeUInt16LE(0, 34); // disk number start
    cd.writeUInt16LE(0, 36); // internal file attributes
    cd.writeUInt32LE(0, 38); // external file attributes
    cd.writeUInt32LE(offset, 42); // relative offset of local header
    fileNameBuf.copy(cd, 46);

    centralHeaders.push(cd);
    offset += lh.length + compressedData.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const cd of centralHeaders) {
    centralDirSize += cd.length;
  }

  // End of Central Directory (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk number with start of central dir
  eocd.writeUInt16LE(entries.length, 8); // total entries on disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12); // size of central dir
  eocd.writeUInt32LE(centralDirOffset, 16); // offset of central dir
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

// Build EPUB package
const packageOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:f47ac10b-58cc-4372-a567-0e02b2c3d479</dc:identifier>
    <dc:title>Além do Clique: O Guia Definitivo do Construtor Web3, Geopolítica Monetária e Futuros Hipotéticos</dc:title>
    <dc:creator>HOKAGE22B &amp; Isar Loiola</dc:creator>
    <dc:language>pt-BR</dc:language>
    <dc:date>2026-11-09</dc:date>
    <dc:description>E-book completo e aprofundado a partir da trilha oficial de hokage22b.com/construir, expandindo conceitos de velocidade da moeda, arquitetura de sandbox, geopolítica de desdolarização, CBDCs, soberania de dados e cenários futuros da economia descentralizada.</dc:description>
  </metadata>
  <manifest>
    <item id="capitulo1" href="capitulo1.xhtml" media-type="application/xhtml+xml"/>
    <item id="capitulo2" href="capitulo2.xhtml" media-type="application/xhtml+xml"/>
    <item id="capitulo3" href="capitulo3.xhtml" media-type="application/xhtml+xml"/>
    <item id="capitulo4" href="capitulo4.xhtml" media-type="application/xhtml+xml"/>
    <item id="capitulo5" href="capitulo5.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="toc">
    <itemref idref="capitulo1"/>
    <itemref idref="capitulo2"/>
    <itemref idref="capitulo3"/>
    <itemref idref="capitulo4"/>
    <itemref idref="capitulo5"/>
  </spine>
</package>`;

const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

const navXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="pt-BR">
<head>
  <title>Sumário</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; margin: 5%; color: #111; }
    h1 { color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    ol { list-style-type: decimal; padding-left: 20px; }
    li { margin-bottom: 8px; }
    a { color: #2563eb; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Sumário</h1>
    <ol>
      <li><a href="capitulo1.xhtml">Capítulo 1: O Fim da Espera Passiva e a Realidade Econômica</a></li>
      <li><a href="capitulo2.xhtml">Capítulo 2: Anatomia do Pi Browser e Segurança Radical</a></li>
      <li><a href="capitulo3.xhtml">Capítulo 3: Geopolítica Monetária Contemporânea</a></li>
      <li><a href="capitulo4.xhtml">Capítulo 4: Futuros Hipotéticos: Três Cenários para a Década de 2030</a></li>
      <li><a href="capitulo5.xhtml">Capítulo 5: O Plano Prático de Ação do Construtor</a></li>
    </ol>
  </nav>
</body>
</html>`;

const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:f47ac10b-58cc-4372-a567-0e02b2c3d479"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>Além do Clique: O Guia Definitivo do Construtor Web3</text></docTitle>
  <navMap>
    <navPoint id="np-1" playOrder="1"><navLabel><text>Capítulo 1: O Fim da Espera Passiva</text></navLabel><content src="capitulo1.xhtml"/></navPoint>
    <navPoint id="np-2" playOrder="2"><navLabel><text>Capítulo 2: Anatomia do Pi Browser</text></navLabel><content src="capitulo2.xhtml"/></navPoint>
    <navPoint id="np-3" playOrder="3"><navLabel><text>Capítulo 3: Geopolítica Monetária</text></navLabel><content src="capitulo3.xhtml"/></navPoint>
    <navPoint id="np-4" playOrder="4"><navLabel><text>Capítulo 4: Futuros Hipotéticos</text></navLabel><content src="capitulo4.xhtml"/></navPoint>
    <navPoint id="np-5" playOrder="5"><navLabel><text>Capítulo 5: Plano Prático de Ação</text></navLabel><content src="capitulo5.xhtml"/></navPoint>
  </navMap>
</ncx>`;

const capitulo1 = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <title>Capítulo 1: O Fim da Espera Passiva</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; margin: 5%; color: #111; }
    h1 { color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    h2 { color: #2563eb; margin-top: 1.5em; }
    blockquote { background: #f8fafc; border-left: 4px solid #3b82f6; margin: 1.5em 0; padding: 10px 16px; }
    table { width: 100%; border-collapse: collapse; margin: 1.5em 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
    th { background: #f1f5f9; }
  </style>
</head>
<body>
  <h1>Capítulo 1: O Fim da Espera Passiva e a Realidade Econômica</h1>
  <p>Durante anos, milhões de indivíduos aderiram a redes móveis e ecossistemas descentralizados condicionados pelo estímulo básico da recompensa rotineira: acionar diariamente um comando em tela e supor que a listagem especulativa em corretoras centralizadas resolveria o mistério da criação de riqueza.</p>
  <p>Conforme elucidado pela plataforma <strong>HOKAGE22B</strong>, essa mentalidade espectadora é a antítese do desenvolvimento monetário sustentável. O valor de qualquer meio de troca reside na sua <strong>Velocidade de Circulação</strong> e na capacidade de liquidar contratos, produtos e serviços reais sem fricção.</p>
  
  <blockquote>
    <strong>A Regra da Utilidade Econômica:</strong> O valor de uma rede é estritamente proporcional à quantidade e complexidade de problemas materiais que ela soluciona no cotidiano das pessoas comuns.
  </blockquote>

  <h2>A Transição: Do Espectador ao Construtor</h2>
  <table>
    <tr>
      <th>Atributo</th>
      <th>Pioneiro Espectador</th>
      <th>Pioneiro Construtor</th>
    </tr>
    <tr>
      <td><strong>Atitude</strong></td>
      <td>Espera passiva e reclamações sobre prazos de terceiros.</td>
      <td>Desenvolve dApps, cria vitrines e promove o comércio P2P.</td>
    </tr>
    <tr>
      <td><strong>Segurança</strong></td>
      <td>Suscetível a fraudes de airdrops e golpes de custódia.</td>
      <td>Domina o princípio Zero-Trust e guarda rigorosamente suas chaves.</td>
    </tr>
    <tr>
      <td><strong>Visão de Mercado</strong></td>
      <td>Especulativa (foco em liquidar tudo por moeda estatal).</td>
      <td>Soberana (foco em construir uma economia paralela autônoma).</td>
    </tr>
  </table>
</body>
</html>`;

const capitulo2 = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <title>Capítulo 2: Anatomia do Pi Browser e Segurança Radical</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; margin: 5%; color: #111; }
    h1 { color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; color: #991b1b; }
    code { background: #f1f5f9; padding: 2px 5px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Capítulo 2: Anatomia do Pi Browser e Segurança Radical</h1>
  <p>O Pi Browser não é um navegador trivial. Ele foi construído como um <strong>Sandbox Web3 Isolado</strong>, cujo propósito é desacoplar com total rigor a identidade pública do usuário de suas chaves criptográficas mestras.</p>
  
  <h2>A Tríade Arquitetural:</h2>
  <ul>
    <li><strong>1. Carteira Isolada (wallet.pi):</strong> Ambiente restrito onde residem os algoritmos de assinatura e custódia. Suas chaves criptográficas jamais são compartilhadas com aplicações externas.</li>
    <li><strong>2. Pi Platform SDK:</strong> Interface de programação que possibilita aos dApps autorizados solicitar autenticação de usuário (UID/username) e despachos de pagamento P2P sem jamais tocar em senhas.</li>
    <li><strong>3. Sandbox de Isolamento:</strong> Mecanismo que bloqueia a injeção não autorizada de scripts em background e impede rastreadores agressivos de mapear dispositivos.</li>
  </ul>

  <div class="warning">
    <strong>REGRA INVIOLÁVEL:</strong> A Passphrase (frase de 24 palavras) <em>nunca</em> deve ser informada a nenhum website ou dApp. O único local legítimo em todo o ecossistema para digitação da frase secreta é a tela de desbloqueio original do <code>wallet.pi</code>.
  </div>
</body>
</html>`;

const capitulo3 = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <title>Capítulo 3: Geopolítica Monetária Contemporânea</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; margin: 5%; color: #111; }
    h1 { color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    h2 { color: #2563eb; }
  </style>
</head>
<body>
  <h1>Capítulo 3: O Tabuleiro Geopolítico Global</h1>
  <p>A ascensão de ecossistemas com dezenas de milhões de identidades autenticadas via KYC não pode ser analisada em um vácuo tecnológico. Ela se desdobra em paralelo à maior reconfiguração do sistema financeiro global dos últimos 80 anos.</p>

  <h2>A Queda do Monopólio SWIFT e a Desdolarização</h2>
  <p>A utilização reiterada do dólar como vetor de coerção geopolítica incentivou o bloco dos BRICS e demais economias emergentes a estruturarem redes soberanas de pagamento multilateral. No entanto, as soluções estatais concorrentes — as CBDCs (Moedas Digitais de Banco Central, como o Drex brasileiro e o e-CNY chinês) — carregam o risco inerente do panóptico financeiro: controle programático do gasto, censura de contas e expiração mandatória de saldo.</p>
  
  <h2>A Camada de Humanidade Contra a Proliferação de Bots</h2>
  <p>Na era dos Modelos de Linguagem e da Inteligência Artificial em escala industrial, a internet tradicional ruiu sob perfis automatizados, fraudes de engenharia social e desinformação. Ao exigir a validação de humanidade (Proof of Human KYC), ecossistemas como o examinado pelo HOKAGE22B estabelecem um bem raro na geopolítica digital contemporânea: a certeza de interação econômica e contratual entre indivíduos de carne e osso.</p>
</body>
</html>`;

const capitulo4 = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <title>Capítulo 4: Futuros Hipotéticos</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; margin: 5%; color: #111; }
    h1 { color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    .scenario { background: #f8fafc; border-left: 4px solid #6366f1; padding: 12px; margin: 1em 0; }
  </style>
</head>
<body>
  <h1>Capítulo 4: Cenários Prospectivos para a Década de 2030</h1>

  <div class="scenario">
    <h3>Cenário 1: O Circuito Comunitário Resiliente</h3>
    <p>Diante da hiper-regulação das moedas estatais e taxação em tempo real via CBDCs, pequenas comunidades comerciais e redes de microempreendedores passam a adotar sistemas P2P descentralizados como trilha primária de troca, preservando a autonomia local de serviços, alimentos e mercadorias.</p>
  </div>

  <div class="scenario">
    <h3>Cenário 2: A Infraestrutura Bipolar</h3>
    <p>O comércio internacional divide-se em blocos regionais concorrentes. Redes descentralizadas públicas operam como a "ponte neutra" utilizada por exportadores e importadores do Sul Global para liquidar ativos sem sujeição à jurisdição exclusiva de qualquer potência hegemônica.</p>
  </div>

  <div class="scenario">
    <h3>Cenário 3: A Economia Agêntica e a Auditoria de Humanidade</h3>
    <p>Agentes autônomos de inteligência artificial realizam trilhões de transações por segundo. Para garantir acesso a serviços físicos e transações éticas, a chave criptográfica atrelada a uma identidade humana validada torna-se o ativo mais valorizado do ecossistema econômico.</p>
  </div>
</body>
</html>`;

const capitulo5 = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <title>Capítulo 5: O Plano Prático de Ação do Construtor</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; margin: 5%; color: #111; }
    h1 { color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    ul { list-style-type: square; }
  </style>
</head>
<body>
  <h1>Capítulo 5: O Plano Prático de Ação do Construtor</h1>
  <p>Para deixar a plateia e se juntar aos arquitetos do novo arranjo financeiro, o construtor Web3 deve executar o seguinte roteiro sistemático:</p>

  <ul>
    <li><strong>Passo 1: Blindagem de Chaves.</strong> Armazene a passphrase de 24 palavras em suporte físico durável (papel impermeável ou metal), fora de fotos na nuvem ou gerenciadores de texto digitais.</li>
    <li><strong>Passo 2: Criação da Vitrine Comercial.</strong> Utilize ferramentas como as do portal HOKAGE22B para expor serviços, produtos e chaves públicas com total transparência.</li>
    <li><strong>Passo 3: Adoção da Precificação Prática.</strong> Implemente modelos de precificação mista no comércio local (moeda fiduciária para custear reposição de estoque somada a criptoativos para capitalização futura).</li>
    <li><strong>Passo 4: Qualificação do Debate.</strong> Abandone o hype e as promessas de ganhos milagrosos. Construa autoridade participando de debates sérios em redes técnicas, como no perfil do X <code>@hokage22b</code>.</li>
    <li><strong>Passo 5: Operação de Nó Validador.</strong> Contribua com a descentralização computacional da rede operando nós ativos e auditando as transações na blockchain.</li>
  </ul>
</body>
</html>`;

const entries = [
  { name: 'mimetype', data: 'application/epub+zip', store: true },
  { name: 'META-INF/container.xml', data: containerXml },
  { name: 'OEBPS/package.opf', data: packageOpf },
  { name: 'OEBPS/nav.xhtml', data: navXhtml },
  { name: 'OEBPS/toc.ncx', data: tocNcx },
  { name: 'OEBPS/capitulo1.xhtml', data: capitulo1 },
  { name: 'OEBPS/capitulo2.xhtml', data: capitulo2 },
  { name: 'OEBPS/capitulo3.xhtml', data: capitulo3 },
  { name: 'OEBPS/capitulo4.xhtml', data: capitulo4 },
  { name: 'OEBPS/capitulo5.xhtml', data: capitulo5 }
];

const epubBuffer = createZip(entries);
const epubOut = path.resolve('site/downloads/Alem-do-Clique-Guia-Definitivo.epub');
const legacyEpub = path.resolve('site/downloads/Manual-Pi-Network.epub');

fs.writeFileSync(epubOut, epubBuffer);
fs.writeFileSync(legacyEpub, epubBuffer);

console.log('EPUB criado com sucesso! Tamanho:', epubBuffer.length, 'bytes');
console.log('Arquivos salvos:');
console.log(' ->', epubOut);
console.log(' ->', legacyEpub);

