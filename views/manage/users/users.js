document.addEventListener('DOMContentLoaded', function () {
  const usersTable = document.getElementById('usersTable').getElementsByTagName('tbody')[0];

  const searchId = document.getElementById('searchId');
  const searchEmail = document.getElementById('searchEmail');
  const searchUsername = document.getElementById('searchUsername');
  const searchName = document.getElementById('searchName');
  const searchState = document.getElementById('searchState');
  const searchAutoState = document.getElementById('searchAutoState');

  const searchButton = document.getElementById('searchButton');

  const viewModal = document.getElementById('viewModal');
  const editModal = document.getElementById('editModal');
  const modalContent = document.getElementById('modalContent');
  const editForm = document.getElementById('editForm');
  const closeButtons = document.querySelectorAll('.close');

  // Modal handling functions
  function showModal(modal) {
    modal.style.display = 'block';
    // Trigger reflow
    modal.offsetHeight;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function hideModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }, 300); // Match the CSS transition duration
  }

  // Close button handlers
  closeButtons.forEach((close) => {
    close.onclick = function () {
      hideModal(close.closest('.modal'));
    };
  });

  // Click outside modal to close
  window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
      hideModal(event.target);
    }
  };

  // Escape key to close modal
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      const openModal = document.querySelector('.modal[style*="display: block"]');
      if (openModal) {
        hideModal(openModal);
      }
    }
  });

  // Fetch and display users
  async function fetchUsers(queryParams = {}) {
    try {
      const query = new URLSearchParams(queryParams).toString();
      let response = await fetch(`/manage/api/users/find?${query}`);
      let data = await response.json();
      populateTable(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  function escapeForHTML(str) {
    if (str === null || typeof str === 'undefined') {
      return '';
    }
    if (typeof str === 'number') {
      return str.toString();
    }
    return str.replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/"/g, '&quot;');
  }

  function populateTable(users) {
    usersTable.innerHTML = '';
    users.forEach((user) => {
      let row1 = usersTable.insertRow();
      let row2 = usersTable.insertRow();
      row1.innerHTML = `
                <td rowspan="2">${user.id}</td>
                <td rowspan="2">${escapeForHTML(user.email)}</td>
                <td rowspan="2">${user.userstate}</td>
                <td rowspan="2">${user.checkinstate ? 'On' : 'Off'}</td>
                <td rowspan="2">${user.checkinReport}</td>
                <td>${escapeForHTML(user.username)} (${escapeForHTML(user.fullName)})</td>
                <td>${user.note}</td>
                <td rowspan="2" class="actions">
                    <button class="view-token" onclick="viewDetails(${user.id}, 'api_token', '${escapeForHTML(user.api_token)}')">View API Token</button>
                    <button class="view-token" onclick="viewDetails(${user.id}, 'checkintoken', '${escapeForHTML(user.checkintoken)}')">View Check-in Token</button>
                    <button class="delete" onclick="deleteUser(${user.id})">Delete</button>
                    <button class="generate-onetime" onclick="generateOneTime(${user.id})">Generate OneTime</button>
                    <button class="refresh-api" onclick="refreshApiToken(${user.id})">Refresh API Token</button>
                    <button class="session-refresh" onclick="sessionRefresh(${user.id})">Session Refresh</button>
                    <button class="edit" onclick="editUser(${user.id}, '${escapeForHTML(user.username)}', '${escapeForHTML(user.userstate)}', '${escapeForHTML(user.checkinstate)}', '${escapeForHTML(user.checkintoken)}', '${escapeForHTML(user.note)}')">Edit</button>
                </td>
            `;
      row2.classList.add('row-spanned');
    });
  }

  searchButton.addEventListener('click', function () {
    const queryParams = {
      id: searchId.value,
      email: searchEmail.value,
      username: searchUsername.value,
      fullName: searchName.value,
      userstate: searchState.value,
      checkinstate: searchAutoState.value,
    };
    fetchUsers(queryParams);
  });

  [searchId, searchEmail, searchUsername, searchName, searchState, searchAutoState].forEach(
    (input) => {
      input.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          searchButton.click();
        }
      });
    }
  );

  window.copyToClipboard = function (text) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert('Copied to clipboard');
      })
      .catch((err) => {
        console.error('Error copying to clipboard:', err);
      });
  };

  window.viewDetails = function (id, type, token) {
    modalContent.innerHTML = `
            <h2>User ID: ${id}</h2>
            <p>${type === 'api_token' ? 'API Token' : 'Check-in Token'}: ${token}</p>
            <button onclick="copyToClipboard('${token}')">Copy ${type === 'api_token' ? 'API Token' : 'Check-in Token'}</button>
        `;
    showModal(viewModal);
  };

  window.editUser = function (id, username, userstate, checkinstate, checkintoken, note) {
    document.getElementById('editUserId').value = id;
    document.getElementById('editUsername').value = username.replace(/\\n/g, '\n');
    document.getElementById('editUserState').value = userstate;
    document.getElementById('editCheckinState').value = checkinstate;
    document.getElementById('editCheckinToken').value = checkintoken;
    document.getElementById('editNote').value = note.replace(/\\n/g, '\n');
    showModal(editModal);
  };

  editForm.onsubmit = async function (event) {
    event.preventDefault();
    const id = document.getElementById('editUserId').value;
    const username = document.getElementById('editUsername').value;
    const userstate = document.getElementById('editUserState').value;
    const checkinstate = document.getElementById('editCheckinState').value;
    const checkintoken = document.getElementById('editCheckinToken').value;
    const note = document.getElementById('editNote').value;
    try {
      await fetch(`/manage/api/users/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, username, userstate, checkinstate, checkintoken, note }),
      });
      fetchUsers();
      hideModal(editModal);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  window.deleteUser = async function (id) {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await fetch(`/manage/api/users/delete/${id}`, { method: 'DELETE' });
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  window.generateOneTime = async function (id) {
    try {
      const response = await fetch(`/manage/api/users/generate-onetime/${id}`, { method: 'GET' });
      const data = await response.json();
      alert(`Generated OneTime for User ID: ${data.id}`);
    } catch (error) {
      console.error('Error generating one-time token:', error);
    }
  };

  window.refreshApiToken = async function (id) {
    try {
      const response = await fetch(`/manage/api/users/refresh-api-token/${id}`, { method: 'POST' });
      const data = await response.json();
      alert(`API Token refreshed for User ID: ${data.id}`);
      fetchUsers();
    } catch (error) {
      console.error('Error refreshing API token:', error);
    }
  };

  window.sessionRefresh = async function (id) {
    try {
      const response = await fetch(`/manage/api/users/session-refresh/${id}`, { method: 'GET' });
      const data = await response.json();
      alert(`Session refreshed for User ID: ${data.id}`);
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  };

  fetchUsers();
});
