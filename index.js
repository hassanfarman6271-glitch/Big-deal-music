const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Bot Online");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Web Server Running");
});

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { DisTube } = require("distube");
const { YtDlpPlugin } = require("@distube/yt-dlp");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.distube = new DisTube(client, {
  leaveOnEmpty: true,
  leaveOnStop: false,
  emitNewSongOnly: true,
  plugins: [new YtDlpPlugin()]
});

const commands = [

  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play Music")
    .addStringOption(option =>
      option
        .setName("song")
        .setDescription("Song Name")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip Song"),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop Music"),

  new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause Music"),

  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume Music"),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show Queue"),

  new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Loop Song"),

  new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Set Volume")
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("1-100")
        .setRequired(true)
    )

].map(cmd => cmd.toJSON());

const rest = new REST({
  version: "10"
}).setToken(TOKEN);

(async () => {

  try {

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log("Slash Commands Loaded");

  } catch (err) {

    console.log(err);

  }

})();

client.on("ready", () => {

  console.log(`${client.user.tag} Online`);

  client.user.setPresence({
    activities: [
      {
        name: "🎵 Premium Music",
        type: 2
      }
    ],
    status: "online"
  });

});

client.on("interactionCreate", async interaction => {

  if (interaction.isButton()) {

    const queue =
      client.distube.getQueue(interaction.guild);

    if (!queue)
      return interaction.reply({
        content: "❌ No Music Playing",
        ephemeral: true
      });

    if (interaction.customId === "pause") {

      client.distube.pause(interaction.guild);

      return interaction.reply({
        content: "⏸ Music Paused",
        ephemeral: true
      });

    }

    if (interaction.customId === "resume") {

      client.distube.resume(interaction.guild);

      return interaction.reply({
        content: "▶ Music Resumed",
        ephemeral: true
      });

    }

    if (interaction.customId === "skip") {

      client.distube.skip(interaction.guild);

      return interaction.reply({
        content: "⏭ Song Skipped",
        ephemeral: true
      });

    }

    if (interaction.customId === "stop") {

      client.distube.stop(interaction.guild);

      return interaction.reply({
        content: "🛑 Music Stopped",
        ephemeral: true
      });

    }

  }

  if (!interaction.isChatInputCommand()) return;

  const voiceChannel =
    interaction.member.voice.channel;

  if (
    interaction.commandName !== "queue"
  ) {

    if (!voiceChannel) {

      return interaction.reply({
        content: "❌ Join VC First",
        ephemeral: true
      });

    }

  }

  try {

    if (interaction.commandName === "play") {

      const song =
        interaction.options.getString("song");

      await interaction.reply({
        content: `🔍 Searching ${song}`
      });

      client.distube.play(
        voiceChannel,
        song,
        {
          member: interaction.member,
          textChannel: interaction.channel
        }
      );

    }

    if (interaction.commandName === "skip") {

      client.distube.skip(interaction.guild);

      interaction.reply("⏭ Skipped");

    }

    if (interaction.commandName === "stop") {

      client.distube.stop(interaction.guild);

      interaction.reply("🛑 Stopped");

    }

    if (interaction.commandName === "pause") {

      client.distube.pause(interaction.guild);

      interaction.reply("⏸ Paused");

    }

    if (interaction.commandName === "resume") {

      client.distube.resume(interaction.guild);

      interaction.reply("▶ Resumed");

    }

    if (interaction.commandName === "loop") {

      client.distube.setRepeatMode(
        interaction.guild,
        1
      );

      interaction.reply("🔁 Loop Enabled");

    }

    if (interaction.commandName === "volume") {

      const volume =
        interaction.options.getInteger(
          "amount"
        );

      client.distube.setVolume(
        interaction.guild,
        volume
      );

      interaction.reply(
        `🔊 Volume ${volume}%`
      );

    }

    if (interaction.commandName === "queue") {

      const queue =
        client.distube.getQueue(interaction.guild);

      if (!queue)
        return interaction.reply(
          "❌ Queue Empty"
        );

      const songs = queue.songs
        .map(
          (song, i) =>
            `${i + 1}. ${song.name}`
        )
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("📜 Music Queue")
        .setDescription(songs)
        .setColor("Blue");

      interaction.reply({
        embeds: [embed]
      });

    }

  } catch (err) {

    console.log(err);

    interaction.reply({
      content: "❌ Error",
      ephemeral: true
    });

  }

});

client.distube

.on("playSong", (queue, song) => {

  const embed = new EmbedBuilder()

    .setTitle("🎵 NOW PLAYING")

    .setDescription(`
🎶 ${song.name}

⏱ ${song.formattedDuration}
    `)

    .setThumbnail(song.thumbnail)

    .setColor("Blue");

  const row = new ActionRowBuilder()

    .addComponents(

      new ButtonBuilder()
        .setCustomId("pause")
        .setLabel("Pause")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("resume")
        .setLabel("Resume")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("skip")
        .setLabel("Skip")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("stop")
        .setLabel("Stop")
        .setStyle(ButtonStyle.Danger)

    );

  queue.textChannel.send({
    embeds: [embed],
    components: [row]
  });

})

.on("addSong", (queue, song) => {

  queue.textChannel.send(
    `✅ Added ${song.name}`
  );

})

.on("finish", queue => {

  queue.textChannel.send(
    "🎵 Queue Finished"
  );

})

.on("empty", channel => {

  channel.send(
    "👋 Leaving VC"
  );

})

.on("error", (channel, error) => {

  console.log(error);

  channel.send(
    "❌ Music Error"
  );

});

client.login(TOKEN);
