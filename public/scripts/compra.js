// Inicialização do Firebase

// Inicializa o Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// Referências aos elementos do DOM
const formCompras = document.getElementById("form-compras");
const formComprasMobile = document.getElementById("form-compras-mobile");
const productTable = document
  .getElementById("product-table")
  .getElementsByTagName("tbody")[0];
const margemRange = document.getElementById("margem");
const margemValue = document.getElementById("margem-value");
const precoVenda = document.getElementById("preco-venda");
const precoCusto = document.getElementById("preco-custo");
const precoUnitario = document.getElementById("preco");
const verificarCodigoBtn = document.querySelector("#verificar-codigo + button");
const codigoStatus = document.getElementById("codigo-status");
const filtroCodigo = document.getElementById("filtro-codigo");
const filtroPeca = document.getElementById("filtro-peca");
const filtroFornecedor = document.getElementById("filtro-fornecedor");
const filtroData = document.getElementById("filtro-data");
const limparFiltrosBtn = document.getElementById("limpar-filtros");
const abrirPopupBtn = document.getElementById("abrir-popup");
const fecharPopupBtn = document.getElementById("fechar-popup");
const popupCadastro = document.getElementById("popup-cadastro");

// Variáveis globais
let produtos = [];
let produtosUnsubscribe = null;
let editandoProdutoId = null;

// Funções de inicialização
document.addEventListener("DOMContentLoaded", function () {
  // Carrega os produtos
  carregarProdutos();

  // Configura listeners para os filtros
  configurarFiltros();

  // Configura o logout
  document.getElementById("logoutBtn").addEventListener("click", logout);

  // Configura listeners do formulário principal
  formCompras.addEventListener("submit", cadastrarProduto);
  margemRange.addEventListener("input", updateMargemValue);
  precoCusto.addEventListener("input", updateMargemValue);
  verificarCodigoBtn.addEventListener("click", verificarProduto);

  // Configura data atual como padrão
  document.getElementById("data").valueAsDate = new Date();
  document.getElementById("data-mobile").valueAsDate = new Date();
});

// Função para mostrar notificação
function mostrarNotificacao(mensagem, tipo = "sucesso") {
  const notificacao = document.createElement("div");
  notificacao.className = `notificacao notificacao-${tipo}`;
  notificacao.innerHTML = `
    <i data-lucide="${
      tipo === "sucesso"
        ? "check-circle"
        : tipo === "erro"
        ? "alert-circle"
        : "info"
    }"></i>
    <span>${mensagem}</span>
  `;

  document.body.appendChild(notificacao);
  lucide.createIcons();

  // Animação de entrada
  setTimeout(() => {
    notificacao.style.opacity = "1";
    notificacao.style.transform = "translateY(0)";
  }, 10);

  // Remove após 5 segundos
  setTimeout(() => {
    notificacao.style.opacity = "0";
    notificacao.style.transform = "translateY(-20px)";
    setTimeout(() => notificacao.remove(), 300);
  }, 5000);
}

// Função para limpar formulário
function limparFormulario() {
  formCompras.reset();
  document.getElementById("margem").value = 30;
  updateMargemValue();
  codigoStatus.innerHTML = "";
  editandoProdutoId = null;

  // Restaura o listener original caso esteja editando
  formCompras.removeEventListener("submit", atualizarProduto);
  formCompras.addEventListener("submit", cadastrarProduto);

  // Foco no primeiro campo
  document.getElementById("codigo-interno").focus();

  // Restaura data atual
  document.getElementById("data").valueAsDate = new Date();
}

// Função para carregar produtos em tempo real
function carregarProdutos() {
  // Remove listener anterior se existir
  if (produtosUnsubscribe) {
    produtosUnsubscribe();
  }

  // Cria novo listener em tempo real
  produtosUnsubscribe = db
    .collection("produtos")
    .orderBy("createdAt", "desc")
    .onSnapshot(
      (snapshot) => {
        produtos = [];
        productTable.innerHTML = "";

        snapshot.forEach((doc) => {
          const produto = doc.data();
          produto.id = doc.id;
          produtos.push(produto);
          adicionarProdutoNaTabela(produto);
        });

        // Atualiza contadores no dashboard (se estiver na página)
        if (typeof atualizarDashboard === "function") {
          atualizarDashboard(produtos);
        }

        // Atualiza lista de produtos na página de vendas (se estiver na página)
        if (typeof atualizarListaVendas === "function") {
          atualizarListaVendas(produtos);
        }
      },
      (error) => {
        console.error("Erro ao carregar produtos:", error);
        mostrarNotificacao(
          "Erro ao carregar produtos. Por favor, recarregue a página.",
          "erro"
        );
      }
    );
}

// Função para adicionar produto na tabela
function adicionarProdutoNaTabela(produto) {
  const row = productTable.insertRow();

  // Formata a data
  const dataFormatada = formatarData(produto.data);

  // Calcula o valor total
  const total = (produto.quantidade * produto.preco).toFixed(2);

  row.innerHTML = `
    <td>${produto.codigo}</td>
    <td>${produto.peca} (${produto.categoria})</td>
    <td>${produto.quantidade}</td>
    <td>R$ ${produto.preco.toFixed(2)}</td>
    <td>R$ ${total}</td>
    <td>${produto.fornecedor}</td>
    <td>${dataFormatada}</td>
    <td class="acoes">
      <button class="btn-editar" data-id="${produto.id}">
        <i data-lucide="pencil"></i>
      </button>
      <button class="btn-excluir" data-id="${produto.id}">
        <i data-lucide="trash-2"></i>
      </button>
    </td>
  `;

  // Atualiza ícones do Lucide
  lucide.createIcons();

  // Adiciona eventos aos botões
  row
    .querySelector(".btn-editar")
    .addEventListener("click", () => editarProduto(produto.id));
  row
    .querySelector(".btn-excluir")
    .addEventListener("click", () => excluirProduto(produto.id));
}

// Função para formatar data
function formatarData(dataString) {
  if (!dataString) return "";

  const options = { day: "2-digit", month: "2-digit", year: "numeric" };
  const date = new Date(dataString);

  // Verifica se a data é válida
  if (isNaN(date.getTime())) {
    return dataString; // Retorna o valor original se não for uma data válida
  }

  return date.toLocaleDateString("pt-BR", options);
}

// Função para cadastrar produto
async function cadastrarProduto(e) {
  e.preventDefault();

  // Obtém os valores do formulário
  const produto = {
    codigo: document.getElementById("codigo-interno").value,
    peca: document.getElementById("peca").value,
    quantidade: parseInt(document.getElementById("quantidade").value),
    preco: parseFloat(document.getElementById("preco").value),
    fornecedor: document.getElementById("fornecedor").value,
    categoria: document.getElementById("categoria").value,
    data: document.getElementById("data").value,
    precoCusto: parseFloat(document.getElementById("preco-custo").value),
    margem: parseFloat(document.getElementById("margem").value),
  };

  // Validações básicas
  if (editandoProdutoId) {
    // Atualiza produto existente
    await db.collection("produtos").doc(editandoProdutoId).update(produto);
    mostrarNotificacao("Produto atualizado com sucesso!", "sucesso");
    editandoProdutoId = null; // Limpa o estado de edição
  } else {
    // Adiciona novo produto
    await db.collection("produtos").add(produto);
    mostrarNotificacao("Produto cadastrado com sucesso!", "sucesso");
  }

  formCompras.reset();
  carregarProdutos();

  try {
    // Verifica se o código já existe
    const querySnapshot = await db
      .collection("produtos")
      .where("codigo", "==", codigo)
      .get();

    if (!querySnapshot.empty && !editandoProdutoId) {
      // Pergunta se deseja adicionar ao estoque existente
      const confirmar = confirm(
        `O código ${codigo} já existe. Deseja adicionar esta quantidade ao produto existente?`
      );

      if (confirmar) {
        // Atualiza o produto existente
        const doc = querySnapshot.docs[0];
        const produtoExistente = doc.data();
        const novaQuantidade = produtoExistente.quantidade + quantidade;

        await db.collection("produtos").doc(doc.id).update({
          quantidade: novaQuantidade,
          preco: preco,
          data: data,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        mostrarNotificacao(
          `Quantidade do produto "${peca}" atualizada com sucesso! Nova quantidade: ${novaQuantidade}`
        );
        limparFormulario();
        return;
      } else {
        return; // Cancela o cadastro
      }
    }

    // Se estiver editando, atualiza o produto existente
    if (editandoProdutoId) {
      await db.collection("produtos").doc(editandoProdutoId).update({
        codigo,
        peca,
        quantidade,
        preco,
        fornecedor,
        categoria,
        data,
        precoCusto: precoCustoValue,
        margem,
        precoVenda: precoVenda.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      mostrarNotificacao(`Produto "${peca}" atualizado com sucesso!`);
    } else {
      // Cria um novo produto
      await db.collection("produtos").add({
        codigo,
        peca,
        quantidade,
        preco,
        fornecedor,
        categoria,
        data,
        precoCusto: precoCustoValue,
        margem,
        precoVenda: precoVenda.value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      mostrarNotificacao(`Produto "${peca}" cadastrado com sucesso!`);
    }

    limparFormulario();
  } catch (error) {
    console.error("Erro ao cadastrar/atualizar produto:", error);
    mostrarNotificacao(
      "Erro ao cadastrar/atualizar produto. Por favor, tente novamente.",
      "erro"
    );
  }
}

// Função para atualizar produto
async function atualizarProduto(e) {
  e.preventDefault();
  await cadastrarProduto(e);
}

// Função para editar produto
function editarProduto(id) {
  const produto = produtos.find((p) => p.id === id);

  if (!produto) {
    mostrarNotificacao("Produto não encontrado para edição.", "erro");
    return;
  }

  editandoProdutoId = id;

  // Preenche o formulário com os dados do produto
  document.getElementById("codigo-interno").value = produto.codigo;
  document.getElementById("peca").value = produto.peca;
  document.getElementById("quantidade").value = produto.quantidade;
  document.getElementById("preco").value = produto.preco;
  document.getElementById("fornecedor").value = produto.fornecedor;
  document.getElementById("categoria").value = produto.categoria;
  document.getElementById("data").value = produto.data;
  document.getElementById("preco-custo").value = produto.precoCusto;
  document.getElementById("margem").value = produto.margem;
  updateMargemValue();

  // Remove o listener do submit atual
  formCompras.removeEventListener("submit", cadastrarProduto);

  // Adiciona novo listener para atualização
  formCompras.addEventListener("submit", atualizarProduto);

  // Rola até o formulário
  document
    .querySelector(".form-container")
    .scrollIntoView({ behavior: "smooth" });
  mostrarNotificacao(
    `Editando produto "${produto.peca}". Preencha os novos dados e clique em "Cadastrar Produto" para atualizar.`,
    "aviso"
  );
}

// Função para excluir produto
async function excluirProduto(id) {
  const produto = produtos.find((p) => p.id === id);
  if (!produto) {
    mostrarNotificacao("Produto não encontrado para exclusão.", "erro");
    return;
  }

  const confirmar = confirm(
    `Tem certeza que deseja excluir o produto "${produto.peca}" (${produto.codigo})?`
  );

  if (!confirmar) return;

  try {
    await db.collection("produtos").doc(id).delete();
    mostrarNotificacao(`Produto "${produto.peca}" excluído com sucesso!`);
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    mostrarNotificacao(
      "Erro ao excluir produto. Por favor, tente novamente.",
      "erro"
    );
  }
}

// Função para atualizar produto
async function atualizarProduto(id, dadosAtualizados) {
  const produto = produtos.find((p) => p.id === id);
  if (!produto) {
    mostrarNotificacao("Produto não encontrado para atualização.", "erro");
    return;
  }

  const confirmar = confirm(
    `Tem certeza que deseja atualizar o produto "${produto.peca}" (${produto.codigo})?`
  );

  if (!confirmar) return;

  try {
    await db.collection("produtos").doc(id).update(dadosAtualizados);
    mostrarNotificacao(`Produto "${produto.peca}" atualizado com sucesso!`);
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    mostrarNotificacao(
      "Erro ao atualizar produto. Por favor, tente novamente.",
      "erro"
    );
  }
}

// Função para atualizar o valor da margem
function updateMargemValue() {
  const margem = margemRange.value;
  margemValue.textContent = `${margem}%`;

  // Calcula o preço de venda se o preço de custo estiver definido
  if (precoCusto.value) {
    const custo = parseFloat(precoCusto.value);
    const precoVendaCalculado = custo * (1 + margem / 100);
    precoVenda.value = precoVendaCalculado.toFixed(2);

    // Atualiza também o preço unitário (opcional)
    precoUnitario.value = precoVendaCalculado.toFixed(2);
  }
}

// Função para verificar produto
async function verificarProduto() {
  const codigo = document.getElementById("verificar-codigo").value.trim();

  if (!codigo) {
    codigoStatus.innerHTML =
      '<span class="error">Digite um código para verificar</span>';
    mostrarNotificacao("Digite um código para verificar", "aviso");
    return;
  }

  try {
    const querySnapshot = await db
      .collection("produtos")
      .where("codigo", "==", codigo)
      .get();

    if (querySnapshot.empty) {
      codigoStatus.innerHTML = '<span class="success">Código disponível</span>';
      mostrarNotificacao(
        `Código "${codigo}" está disponível para uso`,
        "sucesso"
      );
    } else {
      const produto = querySnapshot.docs[0].data();
      codigoStatus.innerHTML = `
        <span class="warning">Código já cadastrado</span>
        <div class="produto-info">
          <p><strong>Produto:</strong> ${produto.peca}</p>
          <p><strong>Quantidade:</strong> ${produto.quantidade}</p>
          <p><strong>Preço:</strong> R$ ${produto.preco.toFixed(2)}</p>
        </div>
      `;
      mostrarNotificacao(
        `Código "${codigo}" já cadastrado para o produto "${produto.peca}"`,
        "aviso"
      );
    }
  } catch (error) {
    console.error("Erro ao verificar código:", error);
    codigoStatus.innerHTML =
      '<span class="error">Erro ao verificar código</span>';
    mostrarNotificacao("Erro ao verificar código", "erro");
  }
}

// Função para configurar filtros
function configurarFiltros() {
  // Listener para os campos de filtro
  [filtroCodigo, filtroPeca, filtroFornecedor, filtroData].forEach((filter) => {
    filter.addEventListener("input", aplicarFiltros);
  });

  // Listener para o botão limpar filtros
  limparFiltrosBtn.addEventListener("click", limparFiltros);
}

// Função para aplicar filtros
function aplicarFiltros() {
  const codigoFiltro = filtroCodigo.value.toLowerCase();
  const pecaFiltro = filtroPeca.value.toLowerCase();
  const fornecedorFiltro = filtroFornecedor.value.toLowerCase();
  const dataFiltro = filtroData.value;

  // Limpa a tabela
  productTable.innerHTML = "";

  // Filtra os produtos
  const produtosFiltrados = produtos.filter((produto) => {
    const codigoMatch = produto.codigo.toLowerCase().includes(codigoFiltro);
    const pecaMatch = produto.peca.toLowerCase().includes(pecaFiltro);
    const fornecedorMatch = produto.fornecedor
      .toLowerCase()
      .includes(fornecedorFiltro);
    const dataMatch = dataFiltro ? produto.data === dataFiltro : true;

    return codigoMatch && pecaMatch && fornecedorMatch && dataMatch;
  });

  // Adiciona os produtos filtrados na tabela
  produtosFiltrados.forEach((produto) => {
    adicionarProdutoNaTabela(produto);
  });
}

// Função para limpar filtros
function limparFiltros() {
  filtroCodigo.value = "";
  filtroPeca.value = "";
  filtroFornecedor.value = "";
  filtroData.value = "";

  // Recarrega todos os produtos
  productTable.innerHTML = "";
  produtos.forEach((produto) => {
    adicionarProdutoNaTabela(produto);
  });

  mostrarNotificacao("Filtros limpos com sucesso", "sucesso");
}

// Atualiza valor da margem no mobile
document
  .getElementById("margem-mobile")
  ?.addEventListener("input", function () {
    document.getElementById(
      "margem-value-mobile"
    ).textContent = `${this.value}%`;
  });

// Função para logout
function logout() {
  auth
    .signOut()
    .then(() => {
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Erro ao fazer logout:", error);
      mostrarNotificacao(
        "Erro ao fazer logout. Por favor, tente novamente.",
        "erro"
      );
    });
}

const hamburger = document.getElementById("hamburger");
const menu = document.querySelector(".menu");

hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("active");
  menu.classList.toggle("active");
});

// Event listeners
formCompras.addEventListener("submit", cadastrarProduto);
margemRange.addEventListener("input", updateMargemValue);
precoCusto.addEventListener("input", updateMargemValue);
verificarCodigoBtn.addEventListener("click", verificarProduto);
