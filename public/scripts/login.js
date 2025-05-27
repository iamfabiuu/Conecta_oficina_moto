// Configuração do Firebase

// Inicializa o Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();

// Função para fazer login
function login(email, password) {
  auth
    .signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Login bem-sucedido
      const user = userCredential.user;
      console.log("Usuário logado:", user);
      window.location.href = "home.html";
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error("Erro no login:", errorMessage);
      alert(getFriendlyErrorMessage(errorCode));
    });
}

// Traduz mensagens de erro
function getFriendlyErrorMessage(errorCode) {
  switch (errorCode) {
    case "auth/invalid-email":
      return "O e-mail fornecido é inválido.";
    case "auth/user-disabled":
      return "Esta conta foi desativada.";
    case "auth/user-not-found":
      return "Nenhum usuário encontrado com este e-mail.";
    case "auth/wrong-password":
      return "Senha incorreta.";
    default:
      return "Ocorreu um erro ao fazer login. Tente novamente.";
  }
}

// Mostrar/ocultar senha
function togglePassword() {
  const passwordInput = document.getElementById("password");
  const icon = document.querySelector(".toggle-password");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    passwordInput.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}

// Verifica estado de autenticação
auth.onAuthStateChanged((user) => {
  if (user) {
    window.location.href = "home.html";
  }
});

// Event listener para o formulário
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  login(email, password);
});
