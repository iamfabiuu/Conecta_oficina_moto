// Configuração do Firebase

// Inicialização do Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Cache de elementos DOM e estado da aplicação
const appState = {
  elements: {
    form: null,
    idInput: null,
    tipoPessoa: null,
    campoCpf: null,
    campoCnpj: null,
    tabela: null,
    btnSubmit: null,
  },
  editMode: false,
  currentDocId: null,
  clientes: [],
};

document.addEventListener("DOMContentLoaded", async function () {
  console.log("DOM carregado, iniciando script...");

  // Inicialização dos elementos
  initElements();
  if (!verifyEssentialElements()) return;

  // Configurações iniciais
  initMasks();
  initEventListeners();
  await gerarNovoId();
  await carregarClientes();

  // Função para inicializar elementos DOM
  function initElements() {
    appState.elements = {
      form: document.getElementById("form-cliente"),
      idInput: document.getElementById("id-cliente"),
      tipoPessoa: document.getElementById("tipo-pessoa"),
      campoCpf: document.getElementById("campo-cpf"),
      campoCnpj: document.getElementById("campo-cnpj"),
      tabela: document.querySelector("#clientes-table tbody"),
      btnSubmit: document.querySelector("#form-cliente button[type='submit']"),
    };
  }

  // Verifica elementos essenciais
  function verifyEssentialElements() {
    const { form, idInput, tipoPessoa, tabela } = appState.elements;
    if (!form || !idInput || !tipoPessoa || !tabela) {
      console.error("Elementos essenciais não encontrados!");
      return false;
    }
    return true;
  }

  // Configura máscaras dos campos
  function initMasks() {
    $("#cpf").mask("000.000.000-00");
    $("#cnpj").mask("00.000.000/0000-00");
    $("#celular").mask("(00) 00000-0000");
    $("#cep").mask("00000-000");
  }

  // Configura event listeners
  function initEventListeners() {
    const { tipoPessoa, form, tabela } = appState.elements;

    // Evento de tipo de pessoa
    tipoPessoa.addEventListener("change", handleTipoPessoaChange);

    // Submit do formulário
    form.addEventListener("submit", handleFormSubmit);

    // Event delegation para tabela
    tabela.addEventListener("click", handleTableClick);
  }

  // Verifique se o usuário está logado
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      console.log("Usuário autenticado:", user.uid);
      carregarClientes(); // Só carrega os clientes se estiver autenticado
    } else {
      console.log("Usuário não autenticado");
      // Redirecione para a página de login
      window.location.href = "/login.html";
    }
  });

  function handleTipoPessoaChange() {
    const tipo = this.value;
    const { campoCpf, campoCnpj } = appState.elements;

    campoCpf.style.display = tipo === "fisica" ? "block" : "none";
    campoCnpj.style.display = tipo === "juridica" ? "block" : "none";

    // CPF/CNPJ agora são opcionais
    document.getElementById("cpf").required = false;
    document.getElementById("cnpj").required = false;
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    console.log("Tentando salvar cliente...");

    try {
      const clienteData = getFormData();

      if (appState.editMode) {
        await db
          .collection("clientes")
          .doc(appState.currentDocId)
          .update(clienteData);
        console.log("Cliente atualizado no Firebase");
        showAlert("Cliente atualizado com sucesso!");
      } else {
        await db.collection("clientes").add(clienteData);
        console.log("Cliente adicionado ao Firebase");
        showAlert("Cliente cadastrado com sucesso!");
      }

      await limparFormulario();
      await carregarClientes();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      showAlert(`Erro ao salvar: ${error.message}`, "error");
    }
  }

  function handleTableClick(e) {
    const btn = e.target.closest("button");
    if (!btn) return;

    const { id } = btn.dataset;

    if (btn.classList.contains("btn-editar")) {
      editarCliente(id);
    } else if (btn.classList.contains("btn-excluir")) {
      excluirCliente(id);
    }
  }

  // Função para mostrar alertas
  function showAlert(message, type = "success") {
    const alertClass = type === "error" ? "alert-error" : "alert-success";
    const alertBox = document.createElement("div");
    alertBox.className = `alert ${alertClass}`;
    alertBox.textContent = message;

    document.body.appendChild(alertBox);

    setTimeout(() => {
      alertBox.remove();
    }, 3000);
  }

  // Função para obter dados do formulário
  function getFormData() {
    return {
      id: appState.elements.idInput.value,
      tipo: appState.elements.tipoPessoa.value,
      nome: document.getElementById("nome").value,
      documento:
        appState.elements.tipoPessoa.value === "fisica"
          ? document.getElementById("cpf").value
          : document.getElementById("cnpj").value,
      celular: document.getElementById("celular").value,
      email: document.getElementById("email").value,
      cep: document.getElementById("cep").value,
      endereco: document.getElementById("endereco").value,
      numero: document.getElementById("numero").value,
      complemento: document.getElementById("complemento").value,
      bairro: document.getElementById("bairro").value,
      cidade: document.getElementById("cidade").value,
      estado: document.getElementById("estado").value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      ...(!appState.editMode && {
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    };
  }

  // Função para carregar clientes
  async function carregarClientes() {
    console.log("Carregando clientes...");
    try {
      const snapshot = await db
        .collection("clientes")
        .orderBy("createdAt", "desc")
        .get();

      appState.clientes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      renderClientes();
      console.log(
        `${appState.clientes.length} clientes carregados com sucesso`
      );
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      appState.elements.tabela.innerHTML =
        '<tr><td colspan="6">Erro ao carregar clientes</td></tr>';
    }
  }

  // Função para renderizar clientes na tabela
  function renderClientes() {
    const { clientes } = appState;
    const { tabela } = appState.elements;

    if (clientes.length === 0) {
      tabela.innerHTML =
        '<tr><td colspan="6">Nenhum cliente cadastrado</td></tr>';
      return;
    }

    tabela.innerHTML = clientes
      .map(
        (cliente) => `
        <tr>
          <td>${cliente.id}</td>
          <td>${cliente.nome}</td>
          <td>${cliente.documento || "---"}</td>
          <td>${cliente.celular || "---"}</td>
          <td>${cliente.cidade || ""}/${cliente.estado || ""}</td>
          <td>
            <button class="btn-editar" data-id="${cliente.id}">
              <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn-excluir" data-id="${cliente.id}">
              <i class="fas fa-trash"></i> Excluir
            </button>
          </td>
        </tr>
      `
      )
      .join("");

    // Adicionar eventos nos botões após renderização
    document.querySelectorAll(".btn-editar").forEach((btn) => {
      btn.addEventListener("click", () => editarCliente(btn.dataset.id));
    });

    document.querySelectorAll(".btn-excluir").forEach((btn) => {
      btn.addEventListener("click", () => excluirCliente(btn.dataset.id));
    });
  }

  // Função para preencher o formulário com os dados do cliente
  function fillForm(cliente) {
    const { idInput, tipoPessoa } = appState.elements;

    idInput.value = cliente.id || "";
    tipoPessoa.value = cliente.tipo || "fisica";
    document.getElementById("nome").value = cliente.nome || "";
    document.getElementById("cpf").value =
      cliente.tipo === "fisica" ? cliente.documento : "";
    document.getElementById("cnpj").value =
      cliente.tipo === "juridica" ? cliente.documento : "";
    document.getElementById("celular").value = cliente.celular || "";
    document.getElementById("email").value = cliente.email || "";
    document.getElementById("cep").value = cliente.cep || "";
    document.getElementById("endereco").value = cliente.endereco || "";
    document.getElementById("numero").value = cliente.numero || "";
    document.getElementById("complemento").value = cliente.complemento || "";
    document.getElementById("bairro").value = cliente.bairro || "";
    document.getElementById("cidade").value = cliente.cidade || "";
    document.getElementById("estado").value = cliente.estado || "";
  }

  // Função para editar cliente no Firebase
  async function editarCliente(docId) {
    try {
      const doc = await db.collection("clientes").doc(docId).get();

      if (doc.exists) {
        const cliente = doc.data();
        cliente.id = doc.id; // adiciona o id manualmente

        appState.editMode = true;
        appState.currentDocId = docId;

        fillForm(cliente);

        appState.elements.tipoPessoa.dispatchEvent(new Event("change"));
        appState.elements.btnSubmit.textContent = "Atualizar Cliente";

        document.querySelector(".form-container").scrollIntoView({
          behavior: "smooth",
        });
      } else {
        showAlert("Cliente não encontrado!", "error");
      }
    } catch (error) {
      console.error("Erro ao editar:", error);
      showAlert("Erro ao carregar cliente para edição", "error");
    }
  }

  // Função para excluir cliente
  async function excluirCliente(docId) {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    try {
      await db.collection("clientes").doc(docId).delete();
      await carregarClientes(); // essa função precisa atualizar o estado e chamar renderClientes()
      showAlert("Cliente excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir:", error);
      showAlert("Erro ao excluir cliente", "error");
    }
  }

  // Função para limpar formulário
  async function limparFormulario() {
    const { form, tipoPessoa, campoCpf, campoCnpj, btnSubmit } =
      appState.elements;

    form.reset();
    appState.editMode = false;
    appState.currentDocId = null;
    tipoPessoa.value = "";
    campoCpf.style.display = "none";
    campoCnpj.style.display = "none";
    document.getElementById("cpf").required = false;
    document.getElementById("cnpj").required = false;
    btnSubmit.textContent = "Salvar Cliente";
    await gerarNovoId();
  }

  // Função para gerar novo ID
  async function gerarNovoId() {
    try {
      const snapshot = await db
        .collection("clientes")
        .orderBy("id", "desc")
        .limit(1)
        .get();

      let novoId = "C001";

      if (!snapshot.empty) {
        const ultimoId = snapshot.docs[0].data().id;
        const numero = parseInt(ultimoId.replace("C", "")) + 1;
        novoId = "C" + numero.toString().padStart(3, "0");
      }

      appState.elements.idInput.value = novoId;
    } catch (error) {
      console.error("Erro ao gerar ID:", error);
      appState.elements.idInput.value = "C001";
    }
  }
});

const hamburger = document.getElementById("hamburger");
const menu = document.querySelector(".menu");

hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("active");
  menu.classList.toggle("active");
});

// 2️⃣ BOTÃO DE LOGOUT
// =============================================
logoutBtn.addEventListener("click", () => {
  auth
    .signOut()
    .then(() => {
      console.log("Logout realizado com sucesso!");
      window.location.href = "index.html"; // Redireciona para login
    })
    .catch((error) => {
      console.error("Erro ao fazer logout:", error);
      alert("Erro ao sair. Tente novamente.");
    });
});
