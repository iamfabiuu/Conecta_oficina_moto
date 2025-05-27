// Configuração do Firebase (USE SUAS PRÓPRIAS CREDENCIAIS)

// Inicializa o Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore(); // <- Agora sim, db está definido!

// Referência para o serviço de autenticação
const auth = firebase.auth();

// Elementos do DOM
const userNameElement = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");

const ctxClientes = document.getElementById("graficoClientes").getContext("2d");
const ctxPecas = document
  .getElementById("graficoPecasEstoque")
  .getContext("2d");
const ctxUltVenda = document.getElementById("graficoUltVenda").getContext("2d");
const ctxVendasMes = document
  .getElementById("graficoVendasMes")
  .getContext("2d");

let graficoClientes, graficoPecas, graficoUltVenda, graficoVendasMes;

const chartNeonOptionsBase = {
  responsive: true,
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        color: "#00ffcc",
        font: {
          family: "'Poppins', sans-serif",
          size: 13,
          weight: "bold",
        },
        padding: 15,
      },
    },
    tooltip: {
      backgroundColor: "#000",
      titleColor: "#00ffcc",
      bodyColor: "#ffffff",
      borderColor: "#00ffcc",
      borderWidth: 1,
      cornerRadius: 8,
    },
  },
  layout: {
    padding: 10,
  },
};

async function carregarDadosEGraficos() {
  const loader = document.getElementById("loader");

  try {
    // Mostra o loader
    loader.classList.remove("fade-out");

    // Clientes
    const clientesSnapshot = await db.collection("clientes").get();
    const totalClientes = clientesSnapshot.size;

    if (graficoClientes) graficoClientes.destroy();
    graficoClientes = new Chart(ctxClientes, {
      type: "polarArea",
      data: {
        labels: ["Clientes"],
        datasets: [
          {
            data: [totalClientes],
            backgroundColor: ["rgba(0, 255, 204, 0.5)"],
            borderColor: ["#00ffcc"],
            borderWidth: 2,
          },
        ],
      },
      options: {
        ...chartNeonOptionsBase,
      },
    });

    // Produtos
    const produtosSnapshot = await db.collection("produtos").get();
    const categorias = {};
    let totalPecas = 0;
    let valorTotal = 0;

    produtosSnapshot.forEach((doc) => {
      const p = doc.data();
      const quantidade = p.quantidade || 0;
      const preco = p.preco || 0;

      categorias[p.categoria] = (categorias[p.categoria] || 0) + quantidade;

      totalPecas += quantidade;
      valorTotal += quantidade * preco;
    });

    document.getElementById("totalPecas").textContent = `${totalPecas} peças`;
    document.getElementById("valorEstoque").textContent = `R$ ${valorTotal
      .toFixed(2)
      .replace(".", ",")}`;

    if (graficoPecas) graficoPecas.destroy();
    graficoPecas = new Chart(ctxPecas, {
      type: "pie",
      data: {
        labels: Object.keys(categorias),
        datasets: [
          {
            label: "Estoque por categoria",
            data: Object.values(categorias),
            backgroundColor: [
              "#00ffc3cc",
              "#ff00ccaa",
              "#9400ffcc",
              "#00aaffcc",
              "#ff9900cc",
              "#ff0066cc",
              "#00ff88cc",
            ],
            borderColor: "#00ffcc",
            borderWidth: 2,
            hoverOffset: 10,
          },
        ],
      },
      options: {
        ...chartNeonOptionsBase,
      },
    });

    // Última venda
    const vendasSnapshot = await db
      .collection("vendas")
      .orderBy("data", "desc")
      .limit(1)
      .get();
    let valorUltimaVenda = 0;
    if (!vendasSnapshot.empty)
      valorUltimaVenda = vendasSnapshot.docs[0].data().total || 0;

    if (graficoUltVenda) graficoUltVenda.destroy();
    graficoUltVenda = new Chart(ctxUltVenda, {
      type: "doughnut",
      data: {
        labels: ["Última Venda", "Faltando para R$1000"],
        datasets: [
          {
            data: [valorUltimaVenda, 1000 - valorUltimaVenda],
            backgroundColor: ["#00ffccaa", "#222"],
            borderColor: ["#00ffcc", "#444"],
            borderWidth: 2,
          },
        ],
      },
      options: {
        ...chartNeonOptionsBase,
      },
    });

    // Vendas do mês
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = agora.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const primeiroDiaProximoMes = new Date(ano, mes + 1, 1);

    const vendasMesSnapshot = await db
      .collection("vendas")
      .where("data", ">=", primeiroDia.toISOString())
      .where("data", "<", primeiroDiaProximoMes.toISOString())
      .get();

    const vendasPorDia = {};
    for (let d = 1; d <= 31; d++) vendasPorDia[d] = 0;
    vendasMesSnapshot.forEach((doc) => {
      const v = doc.data();
      const dataVenda = new Date(v.data);
      const dia = dataVenda.getDate();
      vendasPorDia[dia] += v.total || 0;
    });

    const labelsFiltrados = Object.keys(vendasPorDia).filter(
      (dia) => vendasPorDia[dia] > 0
    );
    const dataFiltrada = labelsFiltrados.map((dia) => vendasPorDia[dia]);

    if (graficoVendasMes) graficoVendasMes.destroy();
    graficoVendasMes = new Chart(ctxVendasMes, {
      type: "line",
      data: {
        labels: labelsFiltrados,
        datasets: [
          {
            label: "Vendas por Dia",
            data: dataFiltrada,
            borderColor: "#00ffcc",
            backgroundColor: "#00ffcc33",
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "#00ffcc",
            pointRadius: 4,
          },
        ],
      },
      options: {
        ...chartNeonOptionsBase,
        scales: {
          x: {
            ticks: {
              color: "#00ffcc",
              font: { family: "Inter", size: 12 },
            },
            grid: {
              color: "#00ffcc22",
            },
          },
          y: {
            ticks: {
              color: "#00ffcc",
              font: { family: "Inter", size: 12 },
            },
            grid: {
              color: "#00ffcc22",
            },
          },
        },
      },
    });

    // 🔥 Tudo carregado — esconder loader
    loader.classList.add("fade-out");
    setTimeout(() => loader.remove(), 500);
  } catch (err) {
    console.error("Erro ao carregar gráficos:", err);
    alert("Erro ao carregar dados. Verifique sua conexão.");
    loader.classList.add("fade-out");
  }
}

// Única função para verificar login e carregar dados
auth.onAuthStateChanged((user) => {
  if (user) {
    // Mostrar nome do usuário
    const displayName = user.displayName || user.email.split("@")[0];
    userNameElement.textContent = displayName;

    carregarDadosEGraficos();
  } else {
    window.location.href = "../pages/loginoficial.html";
  }
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
