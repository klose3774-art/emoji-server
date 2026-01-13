const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;
const MESSAGES_FILE = path.join(__dirname, "tasks.txt");

app.use(session({
    secret: 'a-secret-key-for-the-session',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

if (!fs.existsSync(MESSAGES_FILE)) {
    fs.writeFileSync(MESSAGES_FILE, "[]", "utf8");
}

function readMessages() {
    try {
        const data = fs.readFileSync(MESSAGES_FILE, "utf8");
        return data.trim() === "" ? [] : JSON.parse(data);
    } catch {
        return [];
    }
}

function writeMessages(messages) {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf8");
}

const isAuthenticated = (req, res, next) => {
    if (req.session.user) next();
    else res.status(401).json({ error: "No autorizado" });
};

app.post("/login", (req, res) => {
    const { password } = req.body;
    const peruTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Lima",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(new Date()).replace(":", "");

    if (password === peruTime) {
        req.session.user = { username: "admin" };
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.post("/logout", (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get("/check-auth", (req, res) => {
    res.json({ isAuthenticated: !!req.session.user });
});

// ahora la ruta también requiere sesión (cookies)
app.post("/save-message", isAuthenticated, (req, res) => {
    const { title } = req.body;

    if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "Título inválido" });
    }

    const messages = readMessages();
    const newTask = {
        id: messages.length ? Math.max(...messages.map(m => m.id)) + 1 : 1,
        title: title.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    messages.push(newTask);
    writeMessages(messages);

    res.status(201).json(newTask);
});


app.get("/messages", isAuthenticated, (req, res) => {
    res.json(readMessages());
});

app.put("/messages/:id", isAuthenticated, (req, res) => {
    const { title, completed } = req.body;
    const id = parseInt(req.params.id, 10);
    const messages = readMessages();
    const task = messages.find(m => m.id === id);

    if (!task) return res.status(404).json({ error: "No encontrado" });

    if (typeof title === "string") task.title = title.trim();
    if (typeof completed === "boolean") task.completed = completed;

    task.updatedAt = new Date().toISOString();
    writeMessages(messages);
    res.json(task);
});

app.delete("/messages/:id", isAuthenticated, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const messages = readMessages();
    const index = messages.findIndex(m => m.id === id);

    if (index === -1) return res.status(404).json({ error: "No encontrado" });

    messages.splice(index, 1);
    writeMessages(messages);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});