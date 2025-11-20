// ====== LocalStorage Keys ======
const LS_KEYS = {
  PROFILE: "fitnessProfile",
  WORKOUTS: "fitnessWorkouts",
  GOALS: "fitnessGoals",
  THEME: "fitnessTheme",
  ONBOARD: "fitnessOnboarded",
  ACHIEVEMENTS: "fitnessAchievements",
};

// ====== In-memory State ======
let profile = null;
let workouts = [];
let goals = [];
let dashboardRange = "all";
let achievements = [];

// ====== Achievements Config ======
const ACHIEVEMENTS_CONFIG = [
  {
    id: "firstWorkout",
    title: "First workout",
    description: "You logged your very first workout. Nice start!",
    condition: (state) => state.totalWorkouts >= 1,
  },
  {
    id: "tenWorkouts",
    title: "10 workouts",
    description: "You’ve logged 10 workouts. Consistency!",
    condition: (state) => state.totalWorkouts >= 10,
  },
  {
    id: "firstGoalCompleted",
    title: "Goal finisher",
    description: "You completed your first goal.",
    condition: (state) => state.completedGoals >= 1,
  },
  {
    id: "streak3",
    title: "3-day streak",
    description: "Trained 3 days in a row.",
    condition: (state) => state.bestStreak >= 3,
  },
  {
    id: "streak7",
    title: "7-day streak",
    description: "A full week of training. Beast mode.",
    condition: (state) => state.bestStreak >= 7,
  },
];

// ====== Utility Functions ======
function loadFromLocalStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error parsing localStorage key:", key, e);
    return fallback;
  }
}

function saveToLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Error saving localStorage key:", key, e);
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString();
}

// Compute days between date and now (positive if in future).
function daysDifferenceFromNow(dateStr) {
  const today = new Date();
  const d = new Date(dateStr);
  const ms = d.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Normalize date string to YYYY-MM-DD
function normalizeDateStr(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().substring(0, 10);
}

// ====== Toasts ======
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toast-out 0.2s forwards";
    setTimeout(() => {
      toast.remove();
    }, 200);
  }, 2200);
}

// ====== Theme (Light / Dark) ======
function applyTheme(theme) {
  const body = document.body;
  if (theme === "dark") {
    body.classList.add("dark");
  } else {
    body.classList.remove("dark");
  }
}

function setupThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  let theme = loadFromLocalStorage(LS_KEYS.THEME, "light");
  applyTheme(theme);
  btn.textContent = theme === "dark" ? "☀️" : "🌙";

  btn.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme(theme);
    saveToLocalStorage(LS_KEYS.THEME, theme);
    btn.textContent = theme === "dark" ? "☀️" : "🌙";
  });
}

// ====== Navigation ======
function setupNavigation() {
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll(".page-section");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.dataset.target;

      navLinks.forEach((l) => l.classList.remove("active"));
      sections.forEach((s) => s.classList.remove("active"));

      link.classList.add("active");
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.add("active");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      const siteNav = document.getElementById("site-nav");
      siteNav.classList.remove("open");
    });
  });

  const navToggle = document.getElementById("nav-toggle");
  const siteNav = document.getElementById("site-nav");
  navToggle.addEventListener("click", () => {
    siteNav.classList.toggle("open");
  });
}

function setupQuickActions() {
  const quickWorkout = document.getElementById("quick-add-workout");
  const quickGoal = document.getElementById("quick-add-goal");

  quickWorkout.addEventListener("click", () => {
    document.querySelector('.nav-link[data-target="workouts"]').click();
    document.getElementById("workout-form").scrollIntoView({
      behavior: "smooth",
    });
  });

  quickGoal.addEventListener("click", () => {
    document.querySelector('.nav-link[data-target="goals"]').click();
    document.getElementById("goal-form").scrollIntoView({
      behavior: "smooth",
    });
  });
}

// ====== Avatar ======
function updateAvatarFromProfile() {
  const avatar = document.getElementById("user-avatar");
  if (!avatar) return;
  const name = profile && profile.name ? profile.name.trim() : "";
  if (!name) {
    avatar.textContent = "?";
    return;
  }
  const parts = name.split(/\s+/);
  const initials =
    (parts[0]?.[0] || "").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
  avatar.textContent = initials || "?";
}

// ====== Onboarding ======
function setupOnboarding() {
  const overlay = document.getElementById("onboarding-overlay");
  const form = document.getElementById("onboarding-form");
  const skipBtn = document.getElementById("onboard-skip");

  const alreadyOnboarded = loadFromLocalStorage(LS_KEYS.ONBOARD, false);
  if (alreadyOnboarded) {
    overlay.classList.add("hidden");
    return;
  }

  if (profile && profile.name && profile.name.trim()) {
    saveToLocalStorage(LS_KEYS.ONBOARD, true);
    overlay.classList.add("hidden");
    return;
  }

  if (profile && profile.name) {
    document.getElementById("onboard-name").value = profile.name;
  }

  overlay.classList.remove("hidden");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("onboard-name").value.trim();
    const focus = document.getElementById("onboard-focus").value;

    if (!profile) {
      profile = {};
    }
    profile.name = name || profile.name || "";
    profile.focus = focus || "";
    saveToLocalStorage(LS_KEYS.PROFILE, profile);
    saveToLocalStorage(LS_KEYS.ONBOARD, true);

    loadProfile();
    updateDashboardStats();
    showToast("Welcome aboard!", "success");

    overlay.classList.add("hidden");
  });

  skipBtn.addEventListener("click", () => {
    saveToLocalStorage(LS_KEYS.ONBOARD, true);
    overlay.classList.add("hidden");
  });
}

// ====== Profile ======
function loadProfile() {
  profile = loadFromLocalStorage(LS_KEYS.PROFILE, {
    name: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    targetWeight: "",
    focus: "",
  });

  const nameInput = document.getElementById("profile-name");
  const ageInput = document.getElementById("profile-age");
  const genderInput = document.getElementById("profile-gender");
  const heightInput = document.getElementById("profile-height");
  const weightInput = document.getElementById("profile-weight");
  const targetWeightInput = document.getElementById("profile-target-weight");

  nameInput.value = profile.name || "";
  ageInput.value = profile.age || "";
  genderInput.value = profile.gender || "";
  heightInput.value = profile.height || "";
  weightInput.value = profile.weight || "";
  targetWeightInput.value = profile.targetWeight || "";

  updateDashboardGreeting();
  updateProfileBMI();
  updateAvatarFromProfile();
}

function setupProfileForm() {
  const form = document.getElementById("profile-form");
  const messageEl = document.getElementById("profile-form-message");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    profile.name = document.getElementById("profile-name").value.trim();
    profile.age = document.getElementById("profile-age").value;
    profile.gender = document.getElementById("profile-gender").value;
    profile.height = document.getElementById("profile-height").value;
    profile.weight = document.getElementById("profile-weight").value;
    profile.targetWeight = document.getElementById(
      "profile-target-weight"
    ).value;

    saveToLocalStorage(LS_KEYS.PROFILE, profile);
    updateDashboardGreeting();
    updateDashboardStats();
    updateProfileBMI();
    updateAvatarFromProfile();

    messageEl.textContent = "Profile saved!";
    messageEl.style.color = "green";
    showToast("Profile updated", "success");
    setTimeout(() => (messageEl.textContent = ""), 2000);
  });
}

function updateDashboardGreeting() {
  const greetingEl = document.getElementById("dashboard-greeting");
  const name = profile && profile.name ? profile.name : "Athlete";
  greetingEl.textContent = `Welcome, ${name}!`;
}

function updateProfileBMI() {
  const height = parseFloat(profile.height);
  const weight = parseFloat(profile.weight);
  const bmiEl = document.getElementById("profile-bmi");

  if (!height || !weight || height <= 0 || weight <= 0) {
    bmiEl.textContent = "–";
    return;
  }

  const heightMeters = height / 100;
  const bmi = weight / (heightMeters * heightMeters);
  bmiEl.textContent = bmi.toFixed(1);
}

// ====== Workouts ======
function loadWorkouts() {
  workouts = loadFromLocalStorage(LS_KEYS.WORKOUTS, []);
  renderWorkoutsTable();
}

function setupWorkoutForm() {
  const form = document.getElementById("workout-form");
  const resetBtn = document.getElementById("workout-form-reset");
  const msgEl = document.getElementById("workout-form-message");
  const dateInput = document.getElementById("workout-date");

  dateInput.value = new Date().toISOString().substring(0, 10);

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const idInput = document.getElementById("workout-id");
    const typeInput = document.getElementById("workout-type");
    const exerciseInput = document.getElementById("workout-exercise");
    const setsInput = document.getElementById("workout-sets");
    const repsInput = document.getElementById("workout-reps");
    const weightDurationInput = document.getElementById(
      "workout-weight-duration"
    );
    const notesInput = document.getElementById("workout-notes");

    const date = dateInput.value;
    const type = typeInput.value;
    const exerciseName = exerciseInput.value.trim();
    const sets = setsInput.value ? parseInt(setsInput.value, 10) : null;
    const reps = repsInput.value ? parseInt(repsInput.value, 10) : null;
    const weightOrDuration = weightDurationInput.value
      ? parseFloat(weightDurationInput.value)
      : null;
    const notes = notesInput.value.trim();

    if (!date || !type || !exerciseName) {
      msgEl.textContent = "Date, type, and exercise name are required.";
      msgEl.style.color = "red";
      showToast("Please fill required fields", "error");
      return;
    }

    if (idInput.value) {
      const id = idInput.value;
      const workout = workouts.find((w) => w.id === id);
      if (workout) {
        workout.date = date;
        workout.type = type;
        workout.exerciseName = exerciseName;
        workout.sets = sets;
        workout.reps = reps;
        workout.weightOrDuration = weightOrDuration;
        workout.notes = notes;
      }
      msgEl.textContent = "Workout updated!";
      showToast("Workout updated", "success");
    } else {
      const newWorkout = {
        id: String(Date.now()),
        date,
        type,
        exerciseName,
        sets,
        reps,
        weightOrDuration,
        notes,
      };
      workouts.push(newWorkout);
      msgEl.textContent = "Workout saved!";
      showToast("Workout saved", "success");
    }

    msgEl.style.color = "green";
    saveToLocalStorage(LS_KEYS.WORKOUTS, workouts);
    renderWorkoutsTable();
    updateDashboardStats();
    setTimeout(() => (msgEl.textContent = ""), 2000);
    resetWorkoutForm();
  });

  resetBtn.addEventListener("click", () => {
    resetWorkoutForm();
  });
}

function resetWorkoutForm() {
  const form = document.getElementById("workout-form");
  const idInput = document.getElementById("workout-id");
  const dateInput = document.getElementById("workout-date");
  form.reset();
  idInput.value = "";
  dateInput.value = new Date().toISOString().substring(0, 10);
  document.getElementById("workout-form-title").textContent = "Add Workout";
}

function applyWorkoutFilters(data) {
  const typeFilter = document.getElementById("filter-workout-type").value;
  const fromDate = document.getElementById("filter-date-from").value;
  const toDate = document.getElementById("filter-date-to").value;

  return data.filter((w) => {
    if (typeFilter !== "All" && typeFilter !== "" && w.type !== typeFilter) {
      return false;
    }
    if (fromDate && w.date < fromDate) {
      return false;
    }
    if (toDate && w.date > toDate) {
      return false;
    }
    return true;
  });
}

function renderWorkoutsTable() {
  const tbody = document.getElementById("workouts-table-body");
  const emptyCard = document.getElementById("workouts-empty-state");
  tbody.innerHTML = "";

  const filtered = applyWorkoutFilters(workouts);

  if (!filtered.length) {
    emptyCard.style.display = "flex";
    return;
  } else {
    emptyCard.style.display = "none";
  }

  filtered
    .sort((a, b) => (a.date > b.date ? -1 : 1))
    .forEach((w) => {
      const tr = document.createElement("tr");
      tr.dataset.id = w.id;

      const setsReps =
        w.sets || w.reps ? `${w.sets || 0} x ${w.reps || 0}` : "–";
      const weightDur =
        w.weightOrDuration != null ? `${w.weightOrDuration}` : "–";

      tr.innerHTML = `
        <td>${formatDate(w.date)}</td>
        <td>${w.type}</td>
        <td>${w.exerciseName}</td>
        <td>${setsReps}</td>
        <td>${weightDur}</td>
        <td>${w.notes || ""}</td>
        <td>
          <button class="btn small" data-action="edit">Edit</button>
          <button class="btn small secondary" data-action="delete">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
}

function setupWorkoutFilters() {
  const applyBtn = document.getElementById("apply-workout-filters");
  const clearBtn = document.getElementById("clear-workout-filters");

  applyBtn.addEventListener("click", () => {
    renderWorkoutsTable();
  });

  clearBtn.addEventListener("click", () => {
    document.getElementById("filter-workout-type").value = "All";
    document.getElementById("filter-date-from").value = "";
    document.getElementById("filter-date-to").value = "";
    renderWorkoutsTable();
  });

  const tbody = document.getElementById("workouts-table-body");
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const row = btn.closest("tr");
    const id = row.dataset.id;
    if (!id) return;

    if (action === "edit") {
      editWorkout(id);
    } else if (action === "delete") {
      deleteWorkout(id);
    }
  });
}

function editWorkout(id) {
  const workout = workouts.find((w) => w.id === id);
  if (!workout) return;

  document.getElementById("workout-id").value = workout.id;
  document.getElementById("workout-date").value = workout.date;
  document.getElementById("workout-type").value = workout.type;
  document.getElementById("workout-exercise").value = workout.exerciseName;
  document.getElementById("workout-sets").value = workout.sets || "";
  document.getElementById("workout-reps").value = workout.reps || "";
  document.getElementById("workout-weight-duration").value =
    workout.weightOrDuration != null ? workout.weightOrDuration : "";
  document.getElementById("workout-notes").value = workout.notes || "";

  document.getElementById("workout-form-title").textContent = "Edit Workout";
  document.querySelector('.nav-link[data-target="workouts"]').click();
}

function deleteWorkout(id) {
  const confirmDelete = window.confirm("Delete this workout?");
  if (!confirmDelete) return;

  workouts = workouts.filter((w) => w.id !== id);
  saveToLocalStorage(LS_KEYS.WORKOUTS, workouts);
  renderWorkoutsTable();
  updateDashboardStats();
  showToast("Workout deleted", "success");
}

// ====== Goals ======
function loadGoals() {
  goals = loadFromLocalStorage(LS_KEYS.GOALS, []);
  renderGoalsList();
}

function setupGoalForm() {
  const form = document.getElementById("goal-form");
  const msgEl = document.getElementById("goal-form-message");

  const today = new Date().toISOString().substring(0, 10);
  document.getElementById("goal-start-date").value = today;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("goal-name").value.trim();
    const category = document.getElementById("goal-category").value;
    const targetValue = parseFloat(
      document.getElementById("goal-target-value").value
    );
    const currentValue = parseFloat(
      document.getElementById("goal-current-value").value
    );
    const startDate = document.getElementById("goal-start-date").value;
    const targetDate = document.getElementById("goal-target-date").value;

    if (!name || !category || !startDate || !targetDate) {
      msgEl.textContent = "Please fill in all required fields.";
      msgEl.style.color = "red";
      showToast("Please fill required fields", "error");
      return;
    }

    if (!(targetValue > 0) || !(currentValue >= 0)) {
      msgEl.textContent = "Values must be positive numbers.";
      msgEl.style.color = "red";
      showToast("Invalid numeric values", "error");
      return;
    }

    const goal = {
      id: String(Date.now()),
      name,
      category,
      targetValue,
      currentValue,
      startDate,
      targetDate,
      isCompleted: false,
    };

    goals.push(goal);
    saveToLocalStorage(LS_KEYS.GOALS, goals);
    renderGoalsList();
    updateDashboardStats();

    msgEl.textContent = "Goal saved!";
    msgEl.style.color = "green";
    showToast("Goal saved", "success");
    setTimeout(() => (msgEl.textContent = ""), 2000);
    form.reset();
    document.getElementById("goal-start-date").value = today;
  });
}

function setupGoalsListEvents() {
  const listEl = document.getElementById("goals-list");
  listEl.addEventListener("click", goalCardClickHandler);
}

function calculateGoalProgress(goal) {
  if (!goal.targetValue || goal.targetValue <= 0) return 0;
  const ratio = goal.currentValue / goal.targetValue;
  const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  return percent;
}

function renderGoalsList() {
  const listEl = document.getElementById("goals-list");
  const emptyCard = document.getElementById("goals-empty-state");
  listEl.innerHTML = "";

  if (!goals.length) {
    emptyCard.style.display = "flex";
    return;
  } else {
    emptyCard.style.display = "none";
  }

  goals
    .slice()
    .sort((a, b) => {
      if (a.isCompleted && !b.isCompleted) return 1;
      if (!a.isCompleted && b.isCompleted) return -1;
      return a.targetDate < b.targetDate ? -1 : 1;
    })
    .forEach((goal) => {
      const card = document.createElement("div");
      card.className = "goal-card";
      card.dataset.id = goal.id;

      const progress = calculateGoalProgress(goal);
      const daysLeft = daysDifferenceFromNow(goal.targetDate);

      card.innerHTML = `
        <div class="goal-header">
          <div>
            <div class="goal-name">${goal.name}</div>
            <div class="goal-category">${goal.category}</div>
          </div>
          <div class="goal-dates">
            Target: ${formatDate(goal.targetDate)}<br/>
            ${
              goal.isCompleted
                ? "Completed"
                : daysLeft >= 0
                ? `${daysLeft} days left`
                : "Past deadline"
            }
          </div>
        </div>
        <div class="goal-progress-row">
          <div class="progress-bar" style="max-width: 260px;">
            <div class="progress-bar-fill" style="width: ${progress}%;"></div>
          </div>
          <span class="goal-progress-label">${progress}%</span>
        </div>
        <div class="goal-progress-inputs">
          <span style="font-size:0.8rem;">Current value:</span>
          <input type="number" class="goal-current-input" value="${
            goal.currentValue
          }" step="0.1" min="0" />
          <button class="btn small" data-action="update">Update</button>
        </div>
        <div class="goal-actions">
          <button class="btn small" data-action="complete" ${
            goal.isCompleted ? "disabled" : ""
          }>
            Mark Complete
          </button>
          <button class="btn small secondary" data-action="delete">
            Delete
          </button>
        </div>
      `;

      listEl.appendChild(card);
    });
}

function goalCardClickHandler(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const card = e.target.closest(".goal-card");
  if (!card) return;
  const id = card.dataset.id;
  const action = btn.dataset.action;

  if (action === "update") {
    const input = card.querySelector(".goal-current-input");
    const val = parseFloat(input.value);
    if (!(val >= 0)) {
      alert("Please enter a valid value.");
      return;
    }
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;
    goal.currentValue = val;
    saveToLocalStorage(LS_KEYS.GOALS, goals);
    renderGoalsList();
    updateDashboardStats();
    showToast("Goal progress updated", "success");
  } else if (action === "complete") {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;
    goal.isCompleted = true;
    goal.currentValue = goal.targetValue;
    saveToLocalStorage(LS_KEYS.GOALS, goals);
    renderGoalsList();
    updateDashboardStats();
    showToast("Goal completed 🎯", "success");
  } else if (action === "delete") {
    const confirmDelete = window.confirm("Delete this goal?");
    if (!confirmDelete) return;
    goals = goals.filter((g) => g.id !== id);
    saveToLocalStorage(LS_KEYS.GOALS, goals);
    renderGoalsList();
    updateDashboardStats();
    showToast("Goal deleted", "success");
  }
}

// ====== Achievements ======
function loadAchievements() {
  achievements = loadFromLocalStorage(LS_KEYS.ACHIEVEMENTS, []);
}

function updateAchievementsUI() {
  const list = document.getElementById("achievements-list");
  if (!list) return;

  list.innerHTML = "";

  if (!achievements.length) {
    const li = document.createElement("li");
    li.textContent = "No achievements yet. Keep training!";
    list.appendChild(li);
    return;
  }

  ACHIEVEMENTS_CONFIG.forEach((cfg) => {
    if (!achievements.includes(cfg.id)) return;
    const li = document.createElement("li");
    li.className = "achievement-item";
    li.innerHTML = `
      <div class="achievement-title">🏅 ${cfg.title}</div>
      <div class="achievement-desc">${cfg.description}</div>
    `;
    list.appendChild(li);
  });
}

function checkAndUnlockAchievements(state) {
  let newOnes = [];

  ACHIEVEMENTS_CONFIG.forEach((cfg) => {
    if (!achievements.includes(cfg.id) && cfg.condition(state)) {
      achievements.push(cfg.id);
      newOnes.push(cfg);
    }
  });

  if (newOnes.length) {
    saveToLocalStorage(LS_KEYS.ACHIEVEMENTS, achievements);
    newOnes.forEach((cfg) => {
      showToast(`Achievement unlocked: ${cfg.title}`, "success");
    });
  }

  updateAchievementsUI();
}

// ====== Dashboard Helpers ======
function filterWorkoutsForRange(allWorkouts, range) {
  const now = new Date();
  if (range === "all") return allWorkouts.slice();

  if (range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return allWorkouts.filter((w) => {
      const d = new Date(w.date);
      d.setHours(0, 0, 0, 0);
      return d >= start && d <= now;
    });
  }

  if (range === "month") {
    const year = now.getFullYear();
    const month = now.getMonth();
    return allWorkouts.filter((w) => {
      const d = new Date(w.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }

  return allWorkouts.slice();
}

function calculateStreaks() {
  const datesSet = new Set(
    workouts
      .map((w) => normalizeDateStr(w.date))
      .filter((d) => d !== null)
  );
  const dates = Array.from(datesSet).sort();

  if (!dates.length) {
    return { current: 0, best: 0 };
  }

  let best = 1;
  let currentCount = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff =
      (curr.setHours(0, 0, 0, 0) - prev.setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24);
    if (diff === 1) {
      currentCount += 1;
      if (currentCount > best) best = currentCount;
    } else {
      currentCount = 1;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let current = 0;
  let cursor = new Date(today);

  while (true) {
    const key = cursor.toISOString().substring(0, 10);
    if (datesSet.has(key)) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return { current, best };
}

// ====== Dashboard Stats ======
function updateDashboardStats() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const workoutsThisWeek = workouts.filter((w) => {
    const d = new Date(w.date);
    d.setHours(0, 0, 0, 0);
    return d >= startOfWeek && d <= now;
  }).length;

  document.getElementById("stat-workouts-week").textContent =
    workoutsThisWeek;

  const filtered = filterWorkoutsForRange(workouts, dashboardRange);
  document.getElementById("stat-workouts-total").textContent =
    filtered.length;

  const currentWeight = profile && profile.weight ? profile.weight : null;
  document.getElementById("stat-current-weight").textContent = currentWeight
    ? `${currentWeight} kg`
    : "–";

  const counts = filtered.reduce((acc, w) => {
    if (!w.type) return acc;
    acc[w.type] = (acc[w.type] || 0) + 1;
    return acc;
  }, {});

  const byTypeList = document.getElementById("stat-workouts-by-type");
  byTypeList.innerHTML = "";
  const types = Object.keys(counts);
  if (!types.length) {
    const li = document.createElement("li");
    li.textContent = "No data yet for this range.";
    byTypeList.appendChild(li);
  } else {
    const maxCount = Math.max(...types.map((t) => counts[t]));
    types.forEach((type) => {
      const li = document.createElement("li");
      const labelSpan = document.createElement("span");
      labelSpan.textContent = `${type}: ${counts[type]}`;

      const bar = document.createElement("div");
      bar.className = "type-bar";
      const fill = document.createElement("div");
      fill.className = "type-bar-fill";
      const widthPercent = (counts[type] / maxCount) * 100;
      fill.style.width = widthPercent + "%";
      bar.appendChild(fill);

      li.appendChild(labelSpan);
      li.appendChild(bar);
      byTypeList.appendChild(li);
    });
  }

  const topTypeEl = document.getElementById("stat-top-type");
  if (!types.length) {
    topTypeEl.textContent = "–";
  } else {
    let topType = types[0];
    let topCount = counts[topType];
    types.forEach((t) => {
      if (counts[t] > topCount) {
        topType = t;
        topCount = counts[t];
      }
    });
    topTypeEl.textContent = `${topType}`;
  }

  let totalTime = 0;
  let totalSets = 0;
  let totalReps = 0;
  filtered.forEach((w) => {
    if (w.type === "Cardio" && w.weightOrDuration) {
      totalTime += w.weightOrDuration;
    }
    if (w.type === "Strength") {
      if (w.sets) totalSets += w.sets;
      if (w.reps) totalReps += w.reps * (w.sets || 1);
    }
  });

  document.getElementById("stat-total-time").textContent =
    Math.round(totalTime) + " min";
  document.getElementById("stat-total-sets").textContent = totalSets;
  document.getElementById("stat-total-reps").textContent = totalReps;

  const streaks = calculateStreaks();
  document.getElementById(
    "stat-current-streak"
  ).textContent = `${streaks.current} day${streaks.current === 1 ? "" : "s"}`;
  document.getElementById(
    "stat-best-streak"
  ).textContent = `${streaks.best} day${streaks.best === 1 ? "" : "s"}`;

  const completedGoalsCount = goals.filter((g) => g.isCompleted).length;

  const achState = {
    totalWorkouts: workouts.length,
    completedGoals: completedGoalsCount,
    currentStreak: streaks.current,
    bestStreak: streaks.best,
  };
  checkAndUnlockAchievements(achState);

  const activeGoals = goals.filter((g) => !g.isCompleted);
  let activeGoal = null;
  if (activeGoals.length) {
    activeGoals.sort((a, b) => (a.targetDate < b.targetDate ? -1 : 1));
    activeGoal = activeGoals[0];
  }

  const nameEl = document.getElementById("stat-active-goal-name");
  const barEl = document.getElementById("stat-active-goal-progress");
  const labelEl = document.getElementById("stat-active-goal-progress-label");

  if (!activeGoal) {
    nameEl.textContent = "No active goals";
    barEl.style.width = "0%";
    labelEl.textContent = "0%";
    return;
  }

  nameEl.textContent = activeGoal.name;
  const progress = calculateGoalProgress(activeGoal);
  barEl.style.width = progress + "%";
  labelEl.textContent = progress + "%";
}

// ====== Dashboard Range Select ======
function setupDashboardRange() {
  const select = document.getElementById("dashboard-range");
  select.addEventListener("change", () => {
    dashboardRange = select.value;
    updateDashboardStats();
  });
}

// ====== Backup Controls ======
function setupBackupControls() {
  const exportBtn = document.getElementById("backup-export");
  const importBtn = document.getElementById("backup-import");
  const textarea = document.getElementById("backup-text");
  const msgEl = document.getElementById("backup-message");

  if (!exportBtn || !importBtn) return;

  exportBtn.addEventListener("click", () => {
    const data = {
      profile,
      workouts,
      goals,
      achievements,
    };
    textarea.value = JSON.stringify(data, null, 2);
    msgEl.textContent = "Data exported. Copy and save it somewhere safe.";
    msgEl.style.color = "green";
    showToast("Data exported", "success");
  });

  importBtn.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (!text) {
      msgEl.textContent = "Paste backup JSON first.";
      msgEl.style.color = "red";
      showToast("Nothing to import", "error");
      return;
    }

    try {
      const data = JSON.parse(text);
      if (data.profile) {
        profile = data.profile;
        saveToLocalStorage(LS_KEYS.PROFILE, profile);
      }
      if (Array.isArray(data.workouts)) {
        workouts = data.workouts;
        saveToLocalStorage(LS_KEYS.WORKOUTS, workouts);
      }
      if (Array.isArray(data.goals)) {
        goals = data.goals;
        saveToLocalStorage(LS_KEYS.GOALS, goals);
      }
      if (Array.isArray(data.achievements)) {
        achievements = data.achievements;
        saveToLocalStorage(LS_KEYS.ACHIEVEMENTS, achievements);
      }

      loadProfile();
      renderWorkoutsTable();
      renderGoalsList();
      updateDashboardStats();
      updateAchievementsUI();

      msgEl.textContent = "Data imported successfully.";
      msgEl.style.color = "green";
      showToast("Data imported", "success");
    } catch (e) {
      console.error(e);
      msgEl.textContent = "Invalid JSON. Please check and try again.";
      msgEl.style.color = "red";
      showToast("Import failed: invalid JSON", "error");
    }
  });
}

// ====== Footer Year ======
function updateFooterYear() {
  const yearEl = document.getElementById("footer-year");
  yearEl.textContent = new Date().getFullYear();
}

// ====== Init ======
function init() {
  setupNavigation();
  setupQuickActions();
  setupThemeToggle();
  updateFooterYear();

  loadProfile();
  setupProfileForm();

  loadWorkouts();
  setupWorkoutForm();
  setupWorkoutFilters();

  loadGoals();
  setupGoalForm();
  setupGoalsListEvents();

  loadAchievements();
  setupBackupControls();
  setupDashboardRange();

  updateDashboardStats();
  setupOnboarding();
}

document.addEventListener("DOMContentLoaded", init);

