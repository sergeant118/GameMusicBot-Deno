import { createBot, getBotIdFromToken, startBot, Intents, CreateSlashApplicationCommand, Bot, Interaction, InteractionResponseTypes } from "@discordeno/mod.ts";

import "$std/dotenv/load.ts"

interface SlashCommand {
    info: CreateSlashApplicationCommand;
    response(bot: Bot, interaction: Interaction): Promise<void>;
};

// Botのトークンを.envから取得
const BotToken: string = Deno.env.get("BOT_TOKEN")!;

const SearchCommand: SlashCommand = {
    // コマンド情報
    info: {
        name: "search",
        description: "曲名またはゲーム名から曲を検索する",
        options: [
            {
                name: "keyword", // オプション名
                description: "検索に使用するワード", // オプションの説明
                type: 3, // STRING型のオプション
                required: true, // 必須オプション
            },
        ],
    },
    // コマンド内容
    response: async (bot, interaction) => {
        /*
                // デファード応答を送信（応答を保留する）
                await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                    type: InteractionResponseTypes.DeferredChannelMessageWithSource,
                    data: {
                        flags: 1 << 6, // エフェメラル応答
                    },
                });*/

        //const keyword = interaction.data.options?.[0]?.value;
        const keyword = interaction.data.options?.find(option => option.name === "keyword")?.value;

        //const keyword = "ゼノ";

        // リクエストデータの作成
        const data = {
            author: interaction.user.username,
            content: keyword,
            channel: interaction.channel?.name || "Unknown Channel",
        };

        try {
            // Google Apps ScriptへのPOSTリクエスト
            const url = 'https://script.google.com/macros/s/AKfycbzvkJpw5O2TipOX2311MtawQZfASSX7LajUCwiuOP9XVDcA0VlaCRGID068NcfMVSqmwg/exec';
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error("Error fetching data");

            const responseJson = await response.json();
            const content = responseJson.content || "Content field is not present in the response.";

            // フォローアップで結果を送信
            //await bot.helpers.sendFollowUpMessage(interaction.token, { content });
            console.log(content);

            return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                    content: content,
                    // エフェメラルメッセージ (https://discord.com/developers/docs/resources/message#message-object-message-flags)
                    flags: 1 << 6
                }
            });

        } catch (error) {
            console.error("エラーが発生しました:", error);
            await bot.helpers.sendFollowUpMessage(interaction.token, {
                content: `エラーが発生しました: ${error.message}`,
            });
        }
    }
}

// ボットの作成
const bot = createBot({
    token: BotToken,
    botId: getBotIdFromToken(BotToken) as bigint,

    intents: Intents.Guilds | Intents.GuildMessages,

    // イベント発火時に実行する関数など
    events: {
        // 起動時
        ready: (_bot, payload) => {
            console.log(`${payload.user.username} is ready!`);
        },
        interactionCreate: async (_bot, interaction) => {
            await SearchCommand.response(bot, interaction);
        }
    }
});

// コマンドの作成
bot.helpers.createGlobalApplicationCommand(SearchCommand.info);

// コマンドの登録
bot.helpers.upsertGlobalApplicationCommands([SearchCommand.info]);


await startBot(bot);

Deno.cron("Continuous Request", "*/2 * * * *", () => {
    console.log("running...");
});