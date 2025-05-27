// Função compartilhada para verificar autenticação
function checkAuth(requiredAuth) {
  auth.onAuthStateChanged((user) => {
    if (requiredAuth && !user) {
      window.location.href = "../index.html";
    } else if (!requiredAuth && user) {
      window.location.href = "dashboard.html";
    }
  });
}
