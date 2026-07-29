const express = require('express');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const app = express();
app.use(express.json());

const validKeys = new Map();

// RUTA PRINCIPAL (Para UptimeRobot y evitar el estado 'Down' en Render)
app.get('/', (req, res) => {
    res.status(200).send('MONTANA HUB ONLINE 24/7');
});

// Endpoint de verificación de keys para Roblox
app.post('/verify', (req, res) => {
    const { key } = req.body;
    if (!validKeys.has(key)) {
        return res.json({ success: false });
    }

    const expiresAt = validKeys.get(key);
    if (expiresAt !== null && Date.now() > expiresAt) {
        validKeys.delete(key);
        return res.json({ success: false });
    }

    return res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor activo en el puerto ${PORT}`);
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const CREATOR_ID = process.env.CREATOR_ID || "1441441717910896802"; 
const TOKEN = process.env.TOKEN;     

client.once('ready', async () => {
    console.log(`Bot conectado como ${client.user.tag}`);
    
    const commands = [
        new SlashCommandBuilder()
            .setName('genkey')
            .setDescription('Genera una key para Montana Hub')
            .addStringOption(option =>
                option.setName('time')
                    .setDescription('Tiempo (ej: 1h, 30m, 2d o vacío para permanente)')
                    .setRequired(false)
            )
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Comando registrado con éxito.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'genkey') {
        if (interaction.user.id !== CREATOR_ID) {
            return interaction.reply({ content: 'No tienes permiso para generar keys.', ephemeral: true });
        }

        const timeStr = interaction.options.getString('time');
        let expiresAt = null;
        let durationText = "Permanente ♾️";

        if (timeStr) {
            const value = parseInt(timeStr);
            const unit = timeStr.slice(-1).toLowerCase();
            let ms = 0;
            if (unit === 'm') ms = value * 60 * 1000;
            else if (unit === 'h') ms = value * 60 * 60 * 1000;
            else if (unit === 'd') ms = value * 24 * 60 * 60 * 1000;

            if (ms > 0) {
                expiresAt = Date.now() + ms;
                durationText = timeStr;
            }
        }

        const segment = () => Math.random().toString(36).substring(2, 8).toUpperCase();
        const newKey = `${segment()}-${segment()}-${segment()}-${segment()}`;
        
        validKeys.set(newKey, expiresAt);

        await interaction.reply({ 
            content: `🔑 **Key generada para Montana Hub:**\n\`\`\`${newKey}\`\`\`\n⏱️ **Duración:** ${durationText}`, 
            ephemeral: true 
        });
    }
});

client.login(TOKEN);
