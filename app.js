const Discord = require("discord.js")
require("dotenv").config()
const { Client, Intents, MessageEmbed } = require("discord.js")
const client = new Client({
    intents: [Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS],
    ws: { properties: { $browser: "Discord iOS" } }
})
const { readdirSync } = require("fs")
const moment = require("moment")
const humanizeDuration = require("humanize-duration")
const Timeout = new Set()
client.slash = new Discord.Collection()
const { REST } = require("@discordjs/rest")
const { Routes } = require("discord-api-types/v9")
const path = require("path")
const { keepalive } = require("./keepalive")
const commands = []
readdirSync("./commands/").map(async dir => {
    readdirSync(`./commands/${dir}/`).map(async (cmd) => {
        commands.push(require(path.join(__dirname, `./commands/${dir}/${cmd}`)))
    })
})
const rest = new REST({ version: "9" }).setToken(process.env.token);

(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(process.env.botID),
            { body: commands }
        )
        console.log("\x1b[34m%s\x1b[0m", "Successfully reloaded application (/) commands.")
    } catch (error) {
        console.error(error)
    }
})();

["slash", "anticrash"].forEach(handler => {
    require(`./handlers/${handler}`)(client)
})
client.on("ready", () => {
    console.log("\x1b[34m%s\x1b[0m", `Logged in as ${client.user.tag}!`)
    const statuses = [ // status bot
        "Hentaiz",
        `with ${client.guilds.cache.size} servers`,
        "Youtube",
        "Slash command",
        "Spotify",
        "soundcloud",
        "Twitch"
    ]
    let index = 0
    setInterval(() => {
        if (index === statuses.length) index = 0
        const status = statuses[index]
        client.user.setActivity(`${status}`, {
            type: "LISTENING",
            browser: "DISCORD IOS"
        })
        index++
    }, 60000)
})
client.on("messageCreate", async (message) => {
    if (message.attachments.first() !== undefined && message.content !== "") {
        console.log("\x1b[32m%s\x1b[0m", `[${moment().format("YYYY-MM-DD HH:mm:ss")}] ${message.author.username} (${message.author.id}) messaged in ${message.channel.id}: ${message.content}`)
        console.log("\x1b[32m%s\x1b[0m", `[${moment().format("YYYY-MM-DD HH:mm:ss")}] ${message.author.username} (${message.author.id}) sent an attachment in ${message.channel.id}: ${message.attachments.first().url}`)
    } else if (message.attachments.first() !== undefined && message.content === "") {
        console.log("\x1b[32m%s\x1b[0m", `[${moment().format("YYYY-MM-DD HH:mm:ss")}] ${message.author.username} (${message.author.id}) sent an attachment in ${message.channel.id}: ${message.attachments.first().url}`)
    } else if (message.attachments.first() === undefined && message.content !== "") {
        console.log("\x1b[32m%s\x1b[0m", `[${moment().format("YYYY-MM-DD HH:mm:ss")}] ${message.author.username} (${message.author.id}) messaged in ${message.channel.id}: ${message.content}`)
    } else {
        if (message.embeds.length !== 0) {
            const a = message.embeds[0]
            const embed = {}
            for (const b in a) {
                if (a[b] != null && (a[b] !== [] && a[b].length !== 0) && a[b] !== {}) {
                    embed[b] = a[b]
                }
            }
            console.log("\x1b[32m%s\x1b[0m", `[${moment().format("YYYY-MM-DD HH:mm:ss")}] ${message.author.username} (${message.author.id}) sent an embed in ${message.channel.id}: ${JSON.stringify(embed, null, 2)}`)
        }
    }
})
client.on("interactionCreate", async (interaction) => {
    if (interaction.isCommand() || interaction.isContextMenu()) {
        if (!client.slash.has(interaction.commandName)) return
        if (!interaction.guild) return
        const command = client.slash.get(interaction.commandName)
        try {
            if (command.timeout) {
                if (Timeout.has(`${interaction.user.id}${command.name}`)) {
                    return interaction.reply({ content: `You need to wait **${humanizeDuration(command.timeout, { round: true })}** to use command again`, ephemeral: true })
                }
            }
            if (command.permissions) {
                if (!interaction.member.permissions.has(command.permissions)) {
                    return interaction.reply({ content: `:x: You need \`${command.permissions}\` to use this command`, ephemeral: true })
                }
            }
            command.run(interaction, client)
            Timeout.add(`${interaction.user.id}${command.name}`)
            setTimeout(() => {
                Timeout.delete(`${interaction.user.id}${command.name}`)
            }, command.timeout)
        } catch (error) {
            console.error(error)
            await interaction.reply({ content: ":x: There was an error while executing this command!", ephemeral: true })
        }
    }
})
client.on("guildCreate", guild => {
    const embed = new MessageEmbed()
        .setTitle("I'm added to a new server")
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription(`I'm added to ${guild.name},with ${guild.memberCount}\nTotal server: ${client.guilds.cache.size}\nTotal users: ${client.users.cache.size}`)
        .setTimestamp()
    const logchannel = client.channels.cache.get(process.env.Channel_log)
    logchannel.send({ embeds: [embed] })
})
client.on("guildDelete", guild => {
    const embed = new MessageEmbed()
        .setTitle("I'm left a new server")
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription(`I'm left to ${guild.name},that had ${guild.memberCount}\nTotal server: ${client.guilds.cache.size}\nTotal users: ${client.users.cache.size}`)
        .setTimestamp()
    const logchannel = client.channels.cache.get(process.env.Channel_log)
    logchannel.send({ embeds: [embed] })
})
// Server under 5 user bot automatically left
client.on("guildCreate", () => {
    if (process.env.Bot_leave_under_5_user === "true") {
        client.guilds.cache.forEach(guild => {
            if (guild.memberCount < 5) {
                guild.leave()
            }
        })
    }
})
// Distube
const Distube = require("distube")
const { SoundCloudPlugin } = require("@distube/soundcloud")
const { SpotifyPlugin } = require("@distube/spotify")
/* eslint new-cap: ["error", { "properties": false }] */
client.distube = new Distube.default(client, {
    leaveOnEmpty: true,
    emptyCooldown: 30,
    leaveOnFinish: false,
    emitNewSongOnly: true,
    updateYouTubeDL: true,
    nsfw: true,
    youtubeCookie: process.env.ytcookie,
    plugins: [new SoundCloudPlugin(), new SpotifyPlugin()]
})
const status = (queue) => `Volume: \`${queue.volume}%\` | Loop: \`${queue.repeatMode ? queue.repeatMode === 2 ? "All Queue" : "This Song" : "Off"}\` | Autoplay: \`${queue.autoplay ? "On" : "Off"}\` | Filter: \`${queue.filters.join(", ") || "Off"}\``
// DisTube event listeners
client.distube
    .on("playSong", (queue, song) => {
        const embed = new MessageEmbed()
            .setTitle("<:headphones:879518595602841630> Started Playing")
            .setDescription(`[${song.name}](${song.url})`)
            .addField("**Views:**", song.views.toString())
            .addField("<:like:879371469132562552>", song.likes.toString())
            .addField("<:dislike:879371468817973299>", song.dislikes.toString())
            .addField("**Duration:**", song.formattedDuration.toString())
            .addField("**Status**", status(queue).toString())
            .setThumbnail(song.thumbnail)
            .setColor("RANDOM")
        queue.textChannel.send({ embeds: [embed] })
    })
    .on("addSong", (queue, song) => {
        const embed = new MessageEmbed()
            .setTitle("<:addsong:879518595665780746> Added song to queue")
            .setDescription(`\`${song.name}\` - \`${song.formattedDuration}\` - Requested by ${song.user}`)
            .setColor("RANDOM")
        queue.textChannel.send({ embeds: [embed] })
    })
    .on("addList", (queue, playlist) => {
        const embed = new MessageEmbed()
            .setTitle("<:addsong:879518595665780746> Add list")
            .setDescription(`Added \`${playlist.name}\` playlist (${playlist.songs.length} songs) to queue\n${status(queue)}`)
            .setColor("RANDOM")
        queue.textChannel.send({ embeds: [embed] })
    })
    .on("error", (textChannel, e) => {
        console.error(e)
        textChannel.send(`An error encountered: ${e}`)
    })
    // .on("finish", queue => queue.textChannel.send("***No more song in queue. Leaving the channel***"))
    .on("finishSong", queue => queue.textChannel.send("***Finish song!***"))
    .on("disconnect", queue => queue.textChannel.send("***Disconnected!***"))
    .on("empty", queue => queue.textChannel.send("***Channel is empty. Leaving the channel!***"))
    .on("initQueue", (queue) => {
        queue.autoplay = false
        queue.volume = 50
    })
keepalive()
client.login(process.env.token)
// check update repo
const fetch = require("node-fetch")
const { version } = require("./version.json")
console.log("\x1b[33m%s\x1b[0m", `Current version : ${version}`)
fetch("https://raw.githubusercontent.com/HELLSNAKES/Music-Slash-Bot/main/version.json")
    .then((res) => res.json())
    .then((data) => {
        if (data.version !== version) {
            console.log("\x1b[32m%s\x1b[0m", "===============================Update Available===================================")
            console.log("Ver:", data.version)
            console.log("\x1b[36m%s\x1b[0m", "Check commit : https://github.com/HELLSNAKES/Music-Slash-Bot/commits/main")
            console.log("\x1b[31m%s\x1b[0m", "Use `npm run updatebot` to update")
            console.log("\x1b[32m%s\x1b[0m", "==================================================================================")
        } else {
            console.log("\x1b[32m%s\x1b[0m", "No Update Available")
        }
    })
    .catch((err) => {
        console.log("\x1b[31m%s\x1b[0m", err)
    })
