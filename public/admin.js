const adminApp = document.getElementById('admin-app');
const adminIdentity = document.getElementById('admin-identity');
const usersList = document.getElementById('users-list');
const usersMessage = document.getElementById('users-message');
const adminTabs = [...document.querySelectorAll('[data-admin-tab]')];

async function initializeAdminPage() {
  try {
    const response = await window.apiFetch('/api/usuarios/sessao', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) {
      window.location.replace('Login-adm.html');
      return;
    }
    if (result.usuario.cargo !== 'ADMINISTRADOR') {
      window.location.replace('index.html');
      return;
    }

    adminIdentity.textContent = result.usuario.usuario;
    adminApp.hidden = false;
  } catch {
    window.location.replace('Login-adm.html');
  }
}

async function loadUsers() {
  usersMessage.textContent = 'Carregando usuários...';
  usersList.replaceChildren();

  try {
    const response = await window.apiFetch('/api/usuarios/usuarios', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.erro || 'Não foi possível carregar os usuários.');

    if (result.usuarios.length === 0) {
      usersMessage.textContent = 'Nenhum usuário cadastrado.';
      return;
    }

    for (const usuario of result.usuarios) {
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      const usernameCell = document.createElement('td');
      const roleCell = document.createElement('td');
      nameCell.textContent = usuario.nome || usuario.usuario;
      usernameCell.textContent = usuario.usuario;
      roleCell.textContent = usuario.cargo;
      row.append(nameCell, usernameCell, roleCell);
      usersList.append(row);
    }
    usersMessage.textContent = `${result.usuarios.length} usuário(s) cadastrado(s).`;
  } catch (error) {
    usersMessage.textContent = error.message || 'Não foi possível conectar ao servidor.';
  }
}

adminTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const activePanel = tab.dataset.adminTab;
    for (const item of adminTabs) {
      item.setAttribute('aria-selected', String(item === tab));
      document.getElementById(item.dataset.adminTab).hidden = item !== tab;
    }
    if (activePanel === 'panel-usuarios') loadUsers();
  });
});

document.getElementById('logout-button').addEventListener('click', async () => {
  try {
    await window.apiFetch('/api/usuarios/logout', { method: 'POST' });
  } finally {
    window.location.replace('Login-adm.html');
  }
});

initializeAdminPage();