// Firebase Configuração

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Variáveis globais
let clientesCarregados = [];
let clienteSelecionado = null;
let itensVenda = [];
let produtosGlobais = [];

// -------------------- FUNÇÕES GERAIS --------------------
function resetarFormulario() {
  location.reload();
}

// -------------------- CLIENTES --------------------
async function carregarClientes() {
  const select = document.getElementById("cliente");
  const buscaInput = document.getElementById("buscaCliente");
  select.innerHTML = '<option value="">Selecione um cliente</option>';

  const snapshot = await db.collection("clientes").get();
  clientesCarregados = [];

  snapshot.forEach((doc) => {
    const cliente = doc.data();
    cliente.id = doc.id;
    clientesCarregados.push(cliente);
  });

  atualizarOpcoesCliente("");

  // Evento para filtro de busca
  buscaInput.addEventListener("input", () => {
    const termo = buscaInput.value.toLowerCase();
    atualizarOpcoesCliente(termo);
  });

  // Evento para seleção do cliente
  select.addEventListener("change", async () => {
    const clienteId = select.value;
    if (!clienteId) {
      clienteSelecionado = null;
      document.getElementById("info-cliente").style.display = "none";
      document.getElementById("info-cliente").innerHTML = "";
      return;
    }

    const cliente = clientesCarregados.find((c) => c.id === clienteId);
    clienteSelecionado = cliente;

    document.getElementById("info-cliente").style.display = "block";
    document.getElementById("info-cliente").innerHTML = `
      <strong>CPF/CNPJ:</strong> ${cliente.cpf || cliente.cnpj || "-"}<br>
      <strong>Telefone:</strong> ${cliente.celular || "-"}<br>
      <strong>Endereço:</strong> ${cliente.endereco || "-"}
    `;
  });
}

// Função para atualizar as opções do select
function atualizarOpcoesCliente(filtro) {
  const select = document.getElementById("cliente");
  select.innerHTML = '<option value="">Selecione um cliente</option>';

  const clientesFiltrados = clientesCarregados.filter((cliente) =>
    cliente.nome.toLowerCase().includes(filtro)
  );

  clientesFiltrados.forEach((cliente) => {
    const option = document.createElement("option");
    option.value = cliente.id;
    option.textContent = cliente.nome;
    select.appendChild(option);
  });
}

// -------------------- PRODUTOS --------------------
async function carregarProdutos() {
  mostrarCarregando();

  const snapshot = await db.collection("produtos").get();
  if (snapshot.empty) {
    alert("Nenhum produto encontrado!");
    return;
  }

  const produtos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  produtosGlobais = ordenarProdutos(produtos);

  popularSelectProdutos(produtosGlobais);
  setupFiltroProdutos(produtosGlobais);
  setupSelectProduto();
}

function mostrarCarregando() {
  const select = document.getElementById("produto");
  select.innerHTML =
    "<option selected disabled>Carregando produtos...</option>";
}

function ordenarProdutos(produtos) {
  return produtos.sort((a, b) =>
    a.peca.toLowerCase().localeCompare(b.peca.toLowerCase())
  );
}

function popularSelectProdutos(produtos) {
  const select = document.getElementById("produto");
  select.innerHTML = '<option value="">Selecione um produto...</option>';

  produtos.forEach((produto) => {
    const option = document.createElement("option");
    option.value = produto.id;
    option.textContent = `${produto.peca} (Estoque: ${
      produto.quantidade || 0
    })`;
    option.dataset.estoque = produto.quantidade || 0;
    option.dataset.preco = parseFloat(produto.precoVenda || produto.preco || 0);
    select.appendChild(option);
  });
}

function popularSelectProdutos(produtos) {
  const select = document.getElementById("produto");
  select.innerHTML =
    '<option value="" disabled selected>Selecione um produto...</option>';

  if (produtos.length === 0) {
    const option = document.createElement("option");
    option.textContent = "Nenhum produto encontrado";
    option.value = "";
    select.appendChild(option);
    return;
  }

  produtos.forEach((produto) => {
    const option = document.createElement("option");
    option.value = produto.id || produto.peca;
    option.textContent = `${produto.peca} (Estoque: ${
      produto.quantidade || 0
    })`;
    option.dataset.estoque = produto.quantidade || 0;
    option.dataset.preco = parseFloat(produto.precoVenda || produto.preco || 0);
    select.appendChild(option);
  });
}

function setupFiltroProdutos(produtos) {
  if (document.getElementById("filtro-produto")) return;

  const select = document.getElementById("produto");
  const container = select.parentElement;

  const input = document.createElement("input");
  input.id = "filtro-produto";
  input.placeholder = "Buscar produto...";
  input.style.cssText = "margin-bottom: 5px; width: 100%;";
  container.insertBefore(input, select);

  input.addEventListener("input", () => {
    const filtro = input.value.toLowerCase();
    const filtrados = produtos.filter((p) =>
      p.peca.toLowerCase().includes(filtro)
    );
    popularSelectProdutos(filtrados);
    document.getElementById("estoque-disponivel").style.display = "none";
  });

  // Inicializa com a lista completa
  popularSelectProdutos(produtos);
}

function setupSelectProduto() {
  const select = document.getElementById("produto");

  select.addEventListener("change", (e) => {
    const option = e.target.options[e.target.selectedIndex];
    const preco = parseFloat(option.dataset.preco || 0);
    const estoque = parseInt(option.dataset.estoque || 0);

    document.getElementById("preco-unitario").value = preco.toFixed(2);
    document.getElementById("quantidade").value = 1;

    const infoEstoque = document.getElementById("estoque-disponivel");
    if (option.value) {
      infoEstoque.textContent = `Estoque disponível: ${estoque}`;
      infoEstoque.style.display = "block";
    } else {
      infoEstoque.style.display = "none";
    }
  });
}

// -------------------- ITENS VENDA --------------------
document.getElementById("btn-adicionar").addEventListener("click", () => {
  const select = document.getElementById("produto");
  const option = select.options[select.selectedIndex];
  const produtoId = option.value;
  const produtoNome = option.textContent;
  const preco = parseFloat(document.getElementById("preco-unitario").value);
  const quantidade = parseInt(document.getElementById("quantidade").value);
  const estoque = parseInt(option.dataset.estoque);

  if (!produtoId) {
    alert("Selecione um produto válido.");
    return;
  }

  if (quantidade > estoque) {
    alert("Quantidade excede o estoque disponível!");
    return;
  }

  if (quantidade <= 0 || isNaN(quantidade)) {
    alert("Quantidade inválida.");
    return;
  }

  const subtotal = quantidade * preco;
  itensVenda.push({ produtoId, produtoNome, quantidade, preco, subtotal });

  atualizarTabela();
  calcularTotais();
});

function atualizarTabela() {
  const tbody = document.querySelector("#itens-table tbody");
  tbody.innerHTML = "";

  itensVenda.forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.produtoNome}</td>
      <td>${item.quantidade}</td>
      <td>R$ ${item.preco.toFixed(2)}</td>
      <td>R$ ${item.subtotal.toFixed(2)}</td>
      <td><button onclick="removerItem(${index})">Remover</button></td>
    `;
    tbody.appendChild(row);
  });
}

function removerItem(index) {
  itensVenda.splice(index, 1);
  atualizarTabela();
  calcularTotais();
}

function calcularTotais() {
  const subtotal = itensVenda.reduce((acc, item) => acc + item.subtotal, 0);
  const frete = parseFloat(document.getElementById("valor-frete").value) || 0;

  document.getElementById("subtotal").textContent = `R$ ${subtotal.toFixed(2)}`;
  document.getElementById("frete-valor").textContent = `R$ ${frete.toFixed(2)}`;
  document.getElementById("total-venda").textContent = `R$ ${(
    subtotal + frete
  ).toFixed(2)}`;
}

// -------------------- FRETE --------------------
document.getElementById("tem-frete").addEventListener("change", (e) => {
  document.getElementById("frete-detalhes").style.display = e.target.checked
    ? "block"
    : "none";
  calcularTotais();
});

document.getElementById("valor-frete").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
  calcularTotais();
});

// -------------------- FINALIZAR VENDA --------------------
document
  .getElementById("btn-finalizar")
  .addEventListener("click", async (e) => {
    e.preventDefault();

    if (!clienteSelecionado || itensVenda.length === 0) {
      alert("Selecione um cliente e adicione pelo menos um item!");
      return;
    }

    // Função para gerar código de 6 caracteres aleatórios
    function gerarCodigoVenda() {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let codigo = "";
      for (let i = 0; i < 6; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return codigo;
    }

    const codigoVenda = gerarCodigoVenda(); // Gera o código antes de salvar

    const venda = {
      codigo: codigoVenda,
      cliente: clienteSelecionado.nome,
      clienteId: document.getElementById("cliente").value,
      itens: itensVenda,
      formaPagamento: document.getElementById("forma-pagamento").value,
      observacoes: document.getElementById("observacoes").value,
      enderecoEntrega: document.getElementById("endereco-entrega").value,
      frete: parseFloat(document.getElementById("valor-frete").value) || 0,
      total:
        itensVenda.reduce((acc, item) => acc + item.subtotal, 0) +
        (parseFloat(document.getElementById("valor-frete").value) || 0),
      data: new Date().toISOString(),
    };

    try {
      await db.runTransaction(async (transaction) => {
        // PRIMEIRO: Fazer todas as leituras
        const produtosRefs = venda.itens.map((item) =>
          db.collection("produtos").doc(item.produtoId)
        );

        const produtosDocs = await Promise.all(
          produtosRefs.map((ref) => transaction.get(ref))
        );

        // Verificar estoques antes de qualquer escrita
        produtosDocs.forEach((doc, index) => {
          if (!doc.exists) {
            throw new Error(
              `Produto ${venda.itens[index].produtoNome} não existe mais.`
            );
          }

          const produtoData = doc.data();
          const estoqueAtual = produtoData.quantidade || 0;
          const quantidadeVenda = venda.itens[index].quantidade;

          if (estoqueAtual < quantidadeVenda) {
            throw new Error(
              `Estoque insuficiente para o produto ${venda.itens[index].produtoNome}. Disponível: ${estoqueAtual}`
            );
          }
        });

        // SEGUNDO: Fazer todas as atualizações de estoque
        produtosDocs.forEach((doc, index) => {
          const produtoRef = produtosRefs[index];
          const quantidadeVenda = venda.itens[index].quantidade;
          const estoqueAtual = doc.data().quantidade || 0;

          transaction.update(produtoRef, {
            quantidade: estoqueAtual - quantidadeVenda,
          });
        });

        // TERCEIRO: Registrar a venda
        const vendaRef = db.collection("vendas").doc();
        transaction.set(vendaRef, venda);
      });

      alert("Venda registrada com sucesso!");
      gerarNotaFiscal(venda);
      resetarFormulario();
    } catch (error) {
      alert("Erro ao registrar venda: " + error.message);
    }
  });

function resetarFormulario() {
  // Reseta variáveis JS
  clienteSelecionado = null;
  itensVenda = [];

  // Reseta selects e inputs
  const selectCliente = document.getElementById("cliente");
  const selectProduto = document.getElementById("produto");

  if (selectCliente) selectCliente.value = "";
  if (selectProduto) {
    selectProduto.value = "";
    document.getElementById("preco-unitario").value = "";
    document.getElementById("quantidade").value = 1;
    document.getElementById("estoque-disponivel").style.display = "none";
  }

  // Limpa info do cliente
  const infoCliente = document.getElementById("info-cliente");
  if (infoCliente) {
    infoCliente.style.display = "none";
    infoCliente.innerHTML = "";
  }

  // Limpa tabela de itens
  const tbody = document.querySelector("#itens-table tbody");
  if (tbody) tbody.innerHTML = "";

  // Reseta valores de frete e totais
  document.getElementById("tem-frete").checked = false;
  document.getElementById("frete-detalhes").style.display = "none";
  document.getElementById("valor-frete").value = "";
  document.getElementById("subtotal").textContent = "R$ 0.00";
  document.getElementById("frete-valor").textContent = "R$ 0.00";
  document.getElementById("total-venda").textContent = "R$ 0.00";

  // Reseta campos de observações, endereço, forma de pagamento
  const observacoes = document.getElementById("observacoes");
  if (observacoes) observacoes.value = "";

  const enderecoEntrega = document.getElementById("endereco-entrega");
  if (enderecoEntrega) enderecoEntrega.value = "";

  const formaPagamento = document.getElementById("forma-pagamento");
  if (formaPagamento) formaPagamento.value = "";

  // Se quiser, coloca o foco no select cliente
  if (selectCliente) selectCliente.focus();
}

document.getElementById("btn-cancelar").addEventListener("click", (e) => {
  e.preventDefault();
  resetarFormulario();
});

// -------------------- GERAR NOTA FISCAL --------------------
function gerarNotaFiscal(venda) {
  const doc = new jspdf.jsPDF();
  const margemEsquerda = 15;
  let y = 20;

  // Fundo branco para o corpo inteiro
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  // Cabeçalho verde translúcido (simulado sem alpha)
  doc.setFillColor(0, 255, 204); // verde 00ffcc
  doc.rect(0, 0, 210, 35, "F");

  // Texto do cabeçalho em preto escuro (#101010)
  doc.setFontSize(20);
  doc.setFont("Inter", "bold");
  doc.setTextColor(16, 16, 16); // 101010
  doc.text("CONECTA OFICINA MOTO", margemEsquerda, 22);

  // Subtítulo "NOTA DE PEDIDO" - preto escuro
  doc.setFontSize(12);
  doc.setFont("Inter", "normal");
  doc.text("NOTA DE PEDIDO", margemEsquerda, 32);

  y = 50;

  // Dados do pedido - letras pretas no corpo branco
  const codigoPedido = venda.codigo || gerarCodigoAleatorio(6);

  doc.setFontSize(12);
  doc.setFont("Inter", "bold");
  doc.setTextColor(16, 16, 16);
  doc.text("Pedido nº:", margemEsquerda, y);
  doc.setFont("Inter", "normal");
  doc.text(codigoPedido, margemEsquerda + 30, y);
  y += 12;

  doc.setFont("Inter", "bold");
  doc.text("Cliente:", margemEsquerda, y);
  doc.setFont("Inter", "normal");
  doc.text(venda.cliente, margemEsquerda + 30, y);
  y += 10;

  doc.setFont("Inter", "bold");
  doc.text("Endereço de Entrega:", margemEsquerda, y);
  doc.setFont("Inter", "normal");
  doc.text(venda.enderecoEntrega || "Não informado", margemEsquerda + 60, y);
  y += 10;

  doc.setFont("Inter", "bold");
  doc.text("Data:", margemEsquerda, y);
  doc.setFont("Inter", "normal");
  doc.text(new Date(venda.data).toLocaleString(), margemEsquerda + 30, y);
  y += 18;

  // Cabeçalho da tabela (fundo cinza claro pra contraste suave)
  doc.setFillColor(240, 240, 240);
  doc.rect(margemEsquerda, y - 12, 180, 12, "F");

  doc.setFontSize(11);
  doc.setFont("Inter", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Produto", margemEsquerda + 2, y);
  doc.text("Qtd", margemEsquerda + 85, y, { align: "right" });
  doc.text("Valor Unit.", margemEsquerda + 120, y, { align: "right" });
  doc.text("Subtotal", margemEsquerda + 170, y, { align: "right" });
  y += 10;

  // Itens da venda - texto cinza escuro
  doc.setFont("Inter", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  venda.itens.forEach((item) => {
    const larguraNomeProduto = 80;
    const linhasNome = doc.splitTextToSize(
      item.produtoNome,
      larguraNomeProduto
    );

    doc.text(linhasNome, margemEsquerda + 2, y);
    doc.text(item.quantidade.toString(), margemEsquerda + 85, y, {
      align: "right",
    });
    doc.text(`R$ ${item.preco.toFixed(2)}`, margemEsquerda + 120, y, {
      align: "right",
    });
    doc.text(`R$ ${item.subtotal.toFixed(2)}`, margemEsquerda + 170, y, {
      align: "right",
    });

    y += linhasNome.length * 7;

    if (y > 270) {
      doc.addPage();
      y = 30;
    }
  });

  y += 20;
  doc.setFontSize(13);
  doc.setFont("Inter", "bold");
  doc.setTextColor(16, 16, 16);
  doc.text(`Frete: R$ ${venda.frete.toFixed(2)}`, margemEsquerda, y);
  y += 12;
  doc.text(`Total Geral: R$ ${venda.total.toFixed(2)}`, margemEsquerda, y);
  y += 20;

  // Observações - itálico cinza médio
  if (venda.observacoes) {
    doc.setFontSize(11);
    doc.setFont("Inter", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("Observações:", margemEsquerda, y);
    y += 8;
    doc.setFont("Inter", "normal");
    doc.setTextColor(70, 70, 70);
    const linhasObs = doc.splitTextToSize(venda.observacoes, 180);
    doc.text(linhasObs, margemEsquerda, y);
  }

  // Rodapé discreto - cinza médio
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "CONECTA OFICINA MOTO - Seu loja de revenda de Peças de Motos",
    margemEsquerda,
    290
  );

  // Salvar PDF
  doc.save(`nota-pedido-${codigoPedido}.pdf`);
}

// Função utilitária para gerar código aleatório de 6 caracteres
function gerarCodigoAleatorio(tamanho = 6) {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "";
  for (let i = 0; i < tamanho; i++) {
    const index = Math.floor(Math.random() * caracteres.length);
    codigo += caracteres.charAt(index);
  }
  return codigo;
}

async function carregarHistoricoVendas() {
  const tbody = document.querySelector("#tabela-historico tbody");
  tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

  try {
    const snapshot = await db
      .collection("vendas")
      .orderBy("data", "desc")
      .get();

    if (snapshot.empty) {
      tbody.innerHTML =
        "<tr><td colspan='5'>Nenhuma venda registrada.</td></tr>";
      return;
    }

    tbody.innerHTML = ""; // limpa para inserir os dados

    snapshot.forEach((doc) => {
      const venda = doc.data();

      const idVenda = venda.codigo || doc.id; // Usa o código gerado ou o ID do doc como fallback
      const dataFormatada = new Date(venda.data).toLocaleString();
      const totalFormatado = venda.total.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idVenda}</td>
        <td>${venda.cliente}</td>
        <td>${dataFormatada}</td>
        <td>${totalFormatado}</td>
        <td><button onclick='gerarNotaFiscal(${JSON.stringify(venda).replace(
          /'/g,
          "\\'"
        )})'>Nota Fiscal</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan='5'>Erro ao carregar histórico: ${error.message}</td></tr>`;
  }
}

// Referências aos elementos
const buscaInput = document.getElementById("busca-historico");
const btnAtualizar = document.getElementById("btn-atualizar-historico");

// Função adaptada com filtro
async function carregarHistoricoVendas(filtro = "") {
  const tbody = document.querySelector("#tabela-historico tbody");
  tbody.innerHTML = "<tr><td colspan='4'>Carregando...</td></tr>";

  try {
    const snapshot = await db
      .collection("vendas")
      .orderBy("data", "desc")
      .get();

    if (snapshot.empty) {
      tbody.innerHTML =
        "<tr><td colspan='4'>Nenhuma venda registrada.</td></tr>";
      return;
    }

    tbody.innerHTML = "";

    snapshot.forEach((doc) => {
      const venda = doc.data();
      const id = doc.id.toLowerCase();
      const cliente = venda.cliente?.toLowerCase() || "";

      const filtroLower = filtro.toLowerCase();
      const corresponde =
        id.includes(filtroLower) || cliente.includes(filtroLower);

      if (filtro === "" || corresponde) {
        const dataFormatada = new Date(venda.data).toLocaleString();
        const totalFormatado = venda.total.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${doc.id}</td>
          <td>${venda.cliente}</td>
          <td>${dataFormatada}</td>
          <td>${totalFormatado}</td>
          <td>
            <button onclick='gerarNotaFiscal(${JSON.stringify(venda).replace(
              /'/g,
              "\\'"
            )})'>
              Nota Fiscal
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      }
    });

    // Se não tiver nenhum resultado
    if (tbody.innerHTML.trim() === "") {
      tbody.innerHTML =
        "<tr><td colspan='5'>Nenhuma venda corresponde à busca.</td></tr>";
    }
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan='5'>Erro ao carregar histórico: ${error.message}</td></tr>`;
  }
}

// Atualiza ao clicar no botão
btnAtualizar.addEventListener("click", () => {
  const termo = buscaInput.value.trim();
  carregarHistoricoVendas(termo);
});

// (Opcional) Atualiza em tempo real enquanto digita
buscaInput.addEventListener("input", () => {
  const termo = buscaInput.value.trim();
  carregarHistoricoVendas(termo);
});

// Logout
logoutBtn.addEventListener("click", () => {
  auth
    .signOut()
    .then(() => {
      console.log("Logout realizado com sucesso!");
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Erro ao fazer logout:", error);
      alert("Erro ao sair. Tente novamente.");
    });
});

const hamburger = document.getElementById("hamburger");
const menu = document.querySelector(".menu");

hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("active");
  menu.classList.toggle("active");
});

// -------------------- INICIALIZAÇÃO --------------------
window.onload = () => {
  carregarClientes();
  carregarProdutos();
  carregarHistoricoVendas(); // <<<<< adiciona aqui
  calcularTotais();
};
