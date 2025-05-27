// Inicialização do Firebase (substitua com suas configurações)

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Aguarda o DOM estar completamente carregado
document.addEventListener("DOMContentLoaded", function () {
  // Configuração dos toggles de senha
  document.querySelectorAll(".toggle-password").forEach((icon) => {
    icon.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      const passwordInput = document.getElementById(targetId);

      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        this.classList.remove("fa-eye");
        this.classList.add("fa-eye-slash");
      } else {
        passwordInput.type = "password";
        this.classList.remove("fa-eye-slash");
        this.classList.add("fa-eye");
      }
    });
  });

  // Validação do formulário
  const registerForm = document.getElementById("registerForm");
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Desabilita o botão para evitar múltiplos cliques
    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Cadastrando...";

    // Coleta os dados do formulário
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const birthdate = document.getElementById("birthdate").value;
    const gender = document.getElementById("gender").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Validações básicas
    if (password !== confirmPassword) {
      alert("As senhas não coincidem!");
      submitBtn.disabled = false;
      submitBtn.textContent = "CADASTRAR";
      return;
    }

    if (password.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres!");
      submitBtn.disabled = false;
      submitBtn.textContent = "CADASTRAR";
      return;
    }

    try {
      // Cria o usuário no Firebase Auth
      const userCredential = await auth.createUserWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;

      // Formata o telefone (remove caracteres não numéricos)
      const formattedPhone = phone.replace(/\D/g, "");

      // Cria o documento do usuário no Firestore
      await db
        .collection("usuarios")
        .doc(user.uid)
        .set({
          dadosPessoais: {
            nomeCompleto: name,
            dataNascimento: birthdate,
            genero: gender,
          },
          contato: {
            email: email,
            telefone: formattedPhone,
            telefoneFormatado: formatPhoneNumber(phone),
          },
          statusConta: {
            verificado: false,
            ativo: true,
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
            ultimoLogin: null,
          },
          preferencias: {
            receberEmails: true,
            receberSms: false,
          },
        });

      // Envia email de verificação (opcional)
      await user.sendEmailVerification();

      // Redireciona após cadastro bem-sucedido
      alert(
        "Cadastro realizado com sucesso! Verifique seu email para confirmar sua conta."
      );
      window.location.href = "home.html";
    } catch (error) {
      console.error("Erro no cadastro:", error);

      // Tratamento de erros comuns
      let errorMessage = "Erro ao cadastrar. Por favor, tente novamente.";

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "Este email já está em uso por outra conta.";
          break;
        case "auth/invalid-email":
          errorMessage = "O email fornecido é inválido.";
          break;
        case "auth/weak-password":
          errorMessage = "A senha é muito fraca. Use pelo menos 6 caracteres.";
          break;
      }

      alert(errorMessage);
      submitBtn.disabled = false;
      submitBtn.textContent = "CADASTRAR";
    }
  });
});

// Função para formatar número de telefone
function formatPhoneNumber(phone) {
  // Remove tudo que não é dígito
  const cleaned = ("" + phone).replace(/\D/g, "");

  // Verifica se tem o DDD (11 dígitos com 9º dígito)
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }

  // Formato padrão (10 dígitos)
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  // Retorna o original se não conseguir formatar
  return phone;
}

// Validação em tempo real do telefone (formata enquanto digita)
document.getElementById("phone")?.addEventListener("input", function (e) {
  const input = e.target;
  const value = input.value.replace(/\D/g, "");

  if (value.length > 11) {
    input.value = value.slice(0, 11);
    return;
  }

  // Aplica a máscara
  if (value.length > 0) {
    let formattedValue = "";

    if (value.length <= 2) {
      formattedValue = `(${value}`;
    } else if (value.length <= 6) {
      formattedValue = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length <= 10) {
      formattedValue = `(${value.slice(0, 2)}) ${value.slice(
        2,
        6
      )}-${value.slice(6)}`;
    } else {
      formattedValue = `(${value.slice(0, 2)}) ${value.slice(
        2,
        7
      )}-${value.slice(7, 11)}`;
    }

    input.value = formattedValue;
  }
});
