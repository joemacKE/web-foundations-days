const API_URL = "https://jsonplaceholder.typicode.com/users";

const loadBtn = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusText = document.querySelector("#status");
const list = document.querySelector("#users-list");

let users = [];


// Display one user
function showUser(user) {
    const li = document.createElement("li");

    const name = document.createElement("h2");
    name.textContent = user.name;

    const email = document.createElement("p");
    email.textContent = `Email: ${user.email}`;

    const city = document.createElement("p");
    city.textContent = `City: ${user.address.city}`;

    const company = document.createElement("p");
    company.textContent = `Company: ${user.company.name}`;

    li.appendChild(name);
    li.appendChild(email);
    li.appendChild(city);
    li.appendChild(company);

    list.appendChild(li);
}


// Display any array of users
function renderUsers(listOfUsers) {
    list.textContent = "";

    if (listOfUsers.length === 0) {
        const message = document.createElement("li");
        message.textContent = "No users match your filter.";
        list.appendChild(message);
        return;
    }

    listOfUsers.forEach(showUser);
}


// Load users from the API
async function loadUsers() {
    statusText.textContent = "Loading users...";
    loadBtn.disabled = true;
    list.textContent = "";

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`Status ${response.status}`);
        }

        users = await response.json();

        renderUsers(users);

        statusText.textContent = `Loaded ${users.length} users.`;

    } catch (error) {
        statusText.textContent =
            "Could not load users. Please try again.";

        console.error(error);

    } finally {
        loadBtn.disabled = false;
    }
}


// Load users when the button is clicked
loadBtn.addEventListener("click", loadUsers);


// Filter users as the user types
filterInput.addEventListener("input", () => {
    const searchText = filterInput.value.trim().toLowerCase();

    const filteredUsers = users.filter((user) =>
        user.name.toLowerCase().includes(searchText)
    );

    renderUsers(filteredUsers);
});