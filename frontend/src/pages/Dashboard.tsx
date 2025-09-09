import { useNavigate } from "react-router-dom";
import { logout } from "../services/auth";

export default function Dashboard() {
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div style={{ padding: 32 }}>
      <h2>Bem-vindo ao Sistema de Alimentação Escolar!</h2>
      <p>Usuário: {localStorage.getItem("nome")}</p>
      <p>Perfil: {localStorage.getItem("perfil")}</p>
      <button onClick={handleLogout}>Sair</button>
    </div>
  );
}
