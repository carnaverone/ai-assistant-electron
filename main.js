// main.js
// ChatGPT Electron by Andaroth
// https://github.com/Andaroth/ai-assistant-electron

require('dotenv').config(); // Charger les variables d'environnement

const { formatDate, sanitizeInput } = require('./utils/functions');
const { log, logError } = require('./logger');
const { Menu, app, BrowserWindow, session } = require('electron');
const prompt = require('electron-prompt');
const fs = require('fs');
const path = require('path');

log('Application démarrée');

const availableAIs = [
  { label: "ChatGPT", url: 'https://chat.openai.com' },
  { label: "Copilot", url: 'https://copilot.microsoft.com/' },
  { label: "MistralAI", url: 'https://chat.mistral.ai/chat' }
];

let win;
let userSettings;

const isMac = process.platform === "darwin";
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');
const sessionFile = path.join(userDataPath, 'sessions.json');

const defaultSettings = {
  theme: "default.css",
  streamer: false,
  assistant: "ChatGPT",
};

// Chargement des préférences utilisateur
function loadUserPreferences() {
  try {
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
    }
    const configFile = fs.readFileSync(configPath, 'utf-8');
    userSettings = JSON.parse(configFile);
    return userSettings;
  } catch (error) {
    logError(`Erreur de chargement des préférences : ${error.message}`);
    return defaultSettings;
  }
}

function changeAssistant(label, url, save = false, killCookies = true) {
  try {
    if (killCookies) win.webContents.session.clearStorageData({ storages: ['cookies'] });
    win.loadURL(url);
    if (save) {
      const updatedSettings = { ...userSettings, assistant: label };
      fs.writeFileSync(configPath, JSON.stringify(updatedSettings), 'utf-8');
      userSettings = updatedSettings;
    }
  } catch (error) {
    logError(`Erreur lors du changement d'assistant : ${error.message}`);
  }
}

function changeUserTheme(name, reload = false) {
  try {
    const updatedSettings = { ...userSettings, theme: name };
    fs.writeFileSync(configPath, JSON.stringify(updatedSettings), 'utf-8');
    userSettings = updatedSettings;

    const cssFile = path.join(userDataPath, name);
    if (fs.existsSync(cssFile) && path.extname(cssFile) === '.css') {
      const cssContent = fs.readFileSync(cssFile, 'utf8');
      win.webContents.insertCSS(cssContent);
    } else {
      logError(`Erreur : fichier CSS ${name} introuvable`);
      if (reload) win.reload();
    }
  } catch (error) {
    logError(`Erreur lors du changement de thème : ${error.message}`);
  }
}

// Création de la fenêtre principale
function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: false,
    webPreferences: { nodeIntegration: true, session: session.defaultSession }
  });

  win.webContents.on('did-finish-load', () => {
    generateMenu();
    changeUserTheme(userSettings.theme);
  });

  win.loadURL(availableAIs.find(ai => ai.label === userSettings.assistant)?.url || availableAIs[0].url);
  win.on('closed', () => win = null);
}

// Génération du menu de l'application
function generateMenu() {
  const menuTemplate = [
    {
      label: "Assistant AI",
      submenu: availableAIs.map(ai => ({
        label: ai.label,
        type: "radio",
        checked: userSettings.assistant === ai.label,
        click: () => changeAssistant(ai.label, ai.url, true)
      }))
    },
    {
      label: 'Options',
      submenu: [
        { label: "Mode Streamer", type: "checkbox", checked: userSettings.streamer, click: () => toggleStreamer() }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  userSettings = loadUserPreferences();
  createWindow();
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

app.on('activate', () => {
  if (win === null) createWindow();
});
