
import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

import {
  ref,
  push,
  set,
  update,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

// ==================================================
// DIDICALO — aplicação partilhada Diana + Gonçalo
// ==================================================

const $ = (selector) => document.querySelector(selector);

const authScreen = $("#authScreen");
const appScreen = $("#appScreen");

const authForm = $("#authForm");
const authTitle = $("#authTitle");
const authSubtitle = $("#authSubtitle");
const nameInput = $("#nameInput");
const nameLabel = $("#nameLabel");
const emailInput = $("#emailInput");
const passwordInput = $("#passwordInput");
const authSubmit = $("#authSubmit");
const authMessage = $("#authMessage");
const switchText = $("#switchText");
const switchAuth = $("#switchAuth");

const logoutButton = $("#logoutButton");
const userName = $("#userName");
const userAvatar = $("#userAvatar");
const syncText = $("#syncText");

const mainNav = $("#mainNav");
const pageTitle = $("#pageTitle");
const sectionTitle = $("#sectionTitle");

const addButton = $("#addButton");
const itemForm = $("#itemForm");
const itemTitle = $("#itemTitle");
const itemCategory = $("#itemCategory");
const itemDate = $("#itemDate");
const itemAmount = $("#itemAmount");
const itemDetails = $("#itemDetails");
const cancelButton = $("#cancelButton");
const itemsList = $("#itemsList");

const agendaCount = $("#agendaCount");
const taskCount = $("#taskCount");
const planCount = $("#planCount");
const savingsTotal = $("#savingsTotal");
const toastElement = $("#toast");

let isRegisterMode = false;
let activeView = "overview";
let allItems = {};
let stopItemsListener = null;
let toastTimeout = null;

const viewTitles = {
  overview: "O vosso espaço.",
  agenda: "Agenda partilhada",
  tasks: "Tarefas e listas",
  plans: "Planos e ideias",
  expenses: "Despesas",
  notes: "Notas e recados",
  games: "Jogos para dois",
  challenges: "Perguntas e desafios"
};

const sectionTitles = {
  overview: "O que vamos organizar?",
  agenda: "Os próximos momentos",
  tasks: "O que falta fazer?",
  plans: "O que queremos fazer juntos?",
  expenses: "Registo de despesas",
  notes: "Notas para guardar",
  games: "Um momento para jogar",
  challenges: "Vamos descobrir algo novo?"
};

const categoryNames = {
  agenda: "Agenda",
  tasks: "Tarefa",
  plans: "Plano",
  expenses: "Despesa",
  notes: "Nota",
  challenges: "Desafio"
};

// ==================================================
// MENSAGENS E UTILITÁRIOS
// ==================================================

function showAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.remove("hidden");
  authMessage.style.color = isError ? "#ff7777" : "#f5a04b";
}

function clearAuthMessage() {
  authMessage.textContent = "";
  authMessage.classList.add("hidden");
}

function showToast(message, isError = false) {
  if (!toastElement) return;

  toastElement.textContent = message;
  toastElement.classList.remove("hidden");
  toastElement.style.color = isError ? "#ff7777" : "";

  if (toastTimeout) clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toastElement.classList.add("hidden");
  }, 3500);
}

function showAppMessage(message, isError = false) {
  if (syncText) {
    syncText.textContent = message;
    syncText.style.color = isError ? "#ff7777" : "";
  }
}

function friendlyError(error) {
  const messages = {
    "auth/invalid-email":
      "O formato do email não é válido.",

    "auth/invalid-credential":
      "Email ou palavra-passe incorretos. Confirma os dados.",

    "auth/user-not-found":
      "Não encontrámos essa conta. Cria uma conta primeiro.",

    "auth/wrong-password":
      "A palavra-passe está incorreta.",

    "auth/email-already-in-use":
      "Este email já tem conta. Experimenta entrar.",

    "auth/weak-password":
      "A palavra-passe deve ter pelo menos 6 caracteres.",

    "auth/missing-password":
      "Escreve a palavra-passe.",

    "auth/too-many-requests":
      "Houve demasiadas tentativas. Espera um pouco e tenta novamente.",

    "auth/network-request-failed":
      "Sem ligação ao Firebase. Verifica a Internet.",

    "auth/operation-not-allowed":
      "O método Email/Password não está ativado no Firebase.",

    "auth/invalid-api-key":
      "A configuração Firebase não é válida. Verifica firebase-config.js.",

    "database/permission-denied":
      "A base de dados recusou o acesso. Confirma as regras do Realtime Database."
  };

  return messages[error?.code] ||
    `Ocorreu um erro: ${error?.code || error?.message || "desconhecido"}.`;
}

function setBusy(isBusy) {
  authSubmit.disabled = isBusy;
  authSubmit.style.opacity = isBusy ? "0.65" : "";
  authSubmit.style.cursor = isBusy ? "wait" : "";
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatEuro(amount) {
  return Number(amount || 0).toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR"
  });
}

// ==================================================
// ENTRAR / CRIAR CONTA
// ==================================================

function updateAuthMode() {
  clearAuthMessage();

  nameInput.classList.toggle("hidden", !isRegisterMode);
  nameLabel.classList.toggle("hidden", !isRegisterMode);

  nameInput.required = isRegisterMode;
  nameInput.autocomplete = isRegisterMode ? "name" : "off";

  passwordInput.autocomplete = isRegisterMode
    ? "new-password"
    : "current-password";

  authTitle.textContent = isRegisterMode
    ? "Criar o vosso acesso."
    : "Bem-vinda de volta.";

  authSubtitle.textContent = isRegisterMode
    ? "Cria a tua conta para entrares no espaço partilhado."
    : "Entra na tua conta para continuares.";

  authSubmit.innerHTML = isRegisterMode
    ? 'Criar conta <span>↗</span>'
    : 'Entrar na DIDICALO <span>↗</span>';

  switchText.textContent = isRegisterMode
    ? "Já tens conta?"
    : "Ainda não tens conta?";

  switchAuth.textContent = isRegisterMode
    ? "Entrar"
    : "Criar conta";
}

switchAuth.addEventListener("click", () => {
  isRegisterMode = !isRegisterMode;
  updateAuthMode();
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAuthMessage();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const name = nameInput.value.trim();

  if (!email || !password) {
    showAuthMessage("Preenche o email e a palavra-passe.", true);
    return;
  }

  if (isRegisterMode && !name) {
    showAuthMessage("Escreve o teu nome.", true);
    return;
  }

  setBusy(true);

  try {
    if (isRegisterMode) {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(credential.user, {
        displayName: name
      });

      showAuthMessage("Conta criada com sucesso!");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      clearAuthMessage();
    }
  } catch (error) {
    console.error("DIDICALO — erro de autenticação:", error);
    showAuthMessage(friendlyError(error), true);
  } finally {
    setBusy(false);
  }
});

// ==================================================
// TERMINAR SESSÃO
// ==================================================

logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
    showToast("Sessão terminada.");
  } catch (error) {
    console.error("Erro ao terminar sessão:", error);
    showToast(friendlyError(error), true);
  }
});

// ==================================================
// NAVEGAÇÃO
// ==================================================

function navigateTo(view) {
  activeView = viewTitles[view] ? view : "overview";

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.view === activeView
    );
  });

  pageTitle.textContent = viewTitles[activeView];
  sectionTitle.textContent = sectionTitles[activeView];

  const canAdd = Object.hasOwn(categoryNames, activeView);

  addButton.classList.toggle("hidden", !canAdd);
  itemForm.classList.add("hidden");

  if (activeView === "games") {
    showToast("Os jogos completos serão adicionados numa próxima fase.");
  }

  renderItems();
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    navigateTo(button.dataset.view);
  });
});

// ==================================================
// FORMULÁRIO DE NOVO REGISTO
// ==================================================

addButton.addEventListener("click", () => {
  if (!Object.hasOwn(categoryNames, activeView)) return;

  itemForm.classList.remove("hidden");
  itemCategory.value = activeView;
  itemTitle.focus();
});

cancelButton.addEventListener("click", () => {
  itemForm.reset();
  itemForm.classList.add("hidden");
});

itemForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const user = auth.currentUser;

  if (!user) {
    showToast("Inicia sessão antes de guardar.", true);
    return;
  }

  const title = itemTitle.value.trim();
  const category = itemCategory.value;
  const details = itemDetails.value.trim();
  const date = itemDate.value;
  const amountText = itemAmount.value.trim();
  const amount = amountText === "" ? null : Number(amountText);

  if (!title) {
    showToast("Escreve um título.", true);
    return;
  }

  if (!Object.hasOwn(categoryNames, category)) {
    showToast("Seleciona uma categoria válida.", true);
    return;
  }

  if (
    amount !== null &&
    (!Number.isFinite(amount) || amount < 0)
  ) {
    showToast("Indica um valor válido.", true);
    return;
  }

  const saveButton = itemForm.querySelector('[type="submit"]');
  saveButton.disabled = true;

  try {
    const newRef = push(ref(db, "shared/items"));

    await set(newRef, {
      title,
      category,
      details,
      date: date || "",
      amount,
      done: false,
      createdAt: Date.now(),
      createdBy: user.uid
    });

    itemForm.reset();
    itemForm.classList.add("hidden");

    showToast("Registo guardado e partilhado!");
  } catch (error) {
    console.error("DIDICALO — erro ao guardar:", error);
    showToast(friendlyError(error), true);
  } finally {
    saveButton.disabled = false;
  }
});

// ==================================================
// LISTA PARTILHADA
// ==================================================

function createElement(tag, className, text = "") {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text) element.textContent = text;

  return element;
}

function renderItems() {
  itemsList.replaceChildren();

  const entries = Object.entries(allItems)
    .filter(([, item]) => item && typeof item === "object")
    .filter(([, item]) => {
      if (activeView === "overview") return true;
      if (activeView === "games") return false;

      return item.category === activeView;
    })
    .sort(([, a], [, b]) => (b.createdAt || 0) - (a.createdAt || 0));

  if (activeView === "games") {
    const empty = createElement(
      "div",
      "empty-state",
      "Em breve: jogos para dois."
    );
    itemsList.appendChild(empty);
    return;
  }

  if (entries.length === 0) {
    const empty = createElement(
      "div",
      "empty-state",
      activeView === "overview"
        ? "Ainda não há registos. Adicionem o primeiro!"
        : "Ainda não existem registos nesta área."
    );

    itemsList.appendChild(empty);
    return;
  }

  for (const [id, item] of entries) {
    const card = createElement("article", "item-card");
    const top = createElement("div", "item-card-top");
    const textArea = createElement("div", "item-card-content");

    const category = createElement(
      "span",
      "item-category",
      categoryNames[item.category] || "Registo"
    );

    const title = createElement("h4", "item-title", item.title || "Sem título");
    textArea.append(category, title);

    if (item.details) {
      textArea.appendChild(
        createElement("p", "item-details", item.details)
      );
    }

    const metadata = createElement("div", "item-metadata");

    if (item.date) {
      metadata.appendChild(
        createElement("span", "", `◷ ${formatDate(item.date)}`)
      );
    }

    if (item.amount !== null && item.amount !== undefined) {
      metadata.appendChild(
        createElement("span", "", formatEuro(item.amount))
      );
    }

    if (metadata.childElementCount > 0) {
      textArea.appendChild(metadata);
    }

    top.appendChild(textArea);

    if (item.category === "tasks") {
      const doneButton = createElement(
        "button",
        "secondary-button item-action",
        item.done ? "Reabrir" : "Concluída"
      );

      doneButton.type = "button";
      doneButton.addEventListener("click", async () => {
        try {
          await update(ref(db, `shared/items/${id}`), {
            done: !item.done
          });
        } catch (error) {
          console.error("Erro ao atualizar tarefa:", error);
          showToast(friendlyError(error), true);
        }
      });

      top.appendChild(doneButton);

      if (item.done) {
        title.classList.add("completed");
        card.classList.add("is-completed");
      }
    }

    const footer = createElement("div", "item-card-footer");

    footer.appendChild(
      createElement("span", "item-author",
        item.createdBy === auth.currentUser?.uid
          ? "Adicionado por ti"
          : "Adicionado ao espaço partilhado"
      )
    );

    const deleteButton = createElement(
      "button",
      "delete-button",
      "Eliminar"
    );

    deleteButton.type = "button";

    deleteButton.addEventListener("click", async () => {
      if (!window.confirm(`Eliminar "${item.title || "este registo"}"?`)) {
        return;
      }

      try {
        await remove(ref(db, `shared/items/${id}`));
        showToast("Registo eliminado.");
      } catch (error) {
        console.error("Erro ao eliminar:", error);
        showToast(friendlyError(error), true);
      }
    });

    footer.appendChild(deleteButton);
    card.append(top, footer);
    itemsList.appendChild(card);
  }
}

// ==================================================
// ESTATÍSTICAS DO PAINEL
// ==================================================

function updateStats() {
  const items = Object.values(allItems).filter(
    (item) => item && typeof item === "object"
  );

  const agenda = items.filter((item) => item.category === "agenda");
  const tasks = items.filter((item) => item.category === "tasks");
  const plans = items.filter((item) => item.category === "plans");
  const expenses = items.filter((item) => item.category === "expenses");

  agendaCount.textContent = String(agenda.length);

  taskCount.textContent = String(
    tasks.filter((item) => !item.done).length
  );

  planCount.textContent = String(plans.length);

  // O valor apresentado corresponde às despesas registadas,
  // não a uma conta-poupança ou a dinheiro disponível.
  savingsTotal.textContent = formatEuro(
    expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  );

  const savingsCard = savingsTotal.closest(".stat-card");

  if (savingsCard) {
    const label = savingsCard.querySelector("span");
    const description = savingsCard.querySelector("small");

    if (label) label.textContent = "DESPESAS";
    if (description) description.textContent = "total registado";
  }
}

// ==================================================
// SINCRONIZAÇÃO FIREBASE EM TEMPO REAL
// ==================================================

function startRealtimeSync() {
  if (stopItemsListener) stopItemsListener();

  showAppMessage("A ligar à base de dados...");

  stopItemsListener = onValue(
    ref(db, "shared/items"),
    (snapshot) => {
      allItems = snapshot.val() || {};

      updateStats();
      renderItems();

      showAppMessage("Ligado · sincronização ativa");
    },
    (error) => {
      console.error("DIDICALO — erro na base de dados:", error);
      showAppMessage("Erro de sincronização", true);
      showToast(friendlyError(error), true);
    }
  );
}

// ==================================================
// ESTADO DA AUTENTICAÇÃO
// ==================================================

onAuthStateChanged(auth, (user) => {
  if (user) {
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    const displayName =
      user.displayName ||
      (user.email ? user.email.split("@")[0] : "Utilizador");

    userName.textContent = displayName;
    userAvatar.textContent = displayName.charAt(0).toUpperCase();

    startRealtimeSync();
    navigateTo("overview");

    console.log("DIDICALO: sessão ativa.");
  } else {
    appScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");

    if (stopItemsListener) {
      stopItemsListener();
      stopItemsListener = null;
    }

    allItems = {};

    agendaCount.textContent = "0";
    taskCount.textContent = "0";
    planCount.textContent = "0";
    savingsTotal.textContent = formatEuro(0);

    itemsList.replaceChildren();
    showAppMessage("Sessão terminada");

    console.log("DIDICALO: sem sessão ativa.");
  }
});

console.log("DIDICALO iniciado.");
