const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const GambleSystem = require("../utils/gambleSystem");
const levelSystem = require("../utils/levelSystem");
const QuestSystem = require("../utils/questDailySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("เล่นการพนัน")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("blackjack")
        .setDescription("เล่นเกมไพ่ 21 แต้ม")
        .addIntegerOption(
          (option) =>
            option
              .setName("bet")
              .setDescription("จำนวนเงินที่ต้องการเดิมพัน")
              .setRequired(true)
              .setMinValue(100)
              .setMaxValue(1000000) // Set high enough for max level
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("crash")
        .setDescription("เกมเดิมพันที่ต้องกดถอนเงินก่อนที่จะระเบิด")
        .addIntegerOption((option) =>
          option
            .setName("bet")
            .setDescription("จำนวนเงินที่ต้องการเดิมพัน")
            .setRequired(true)
            .setMinValue(100)
            .setMaxValue(1000000)
        )
    )
    // Add new subcommand to SlashCommandBuilder
    .addSubcommand((subcommand) =>
      subcommand
        .setName("roulette")
        .setDescription("เล่นเกมรูเล็ตต์")
        .addIntegerOption((option) =>
          option
            .setName("bet")
            .setDescription("จำนวนเงินที่ต้องการเดิมพัน")
            .setRequired(true)
            .setMinValue(100)
            .setMaxValue(1000000)
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("ประเภทการเดิมพัน")
            .setRequired(true)
            .addChoices(
              { name: "🔢 เลขเดี่ยว (x35)", value: "number" },
              { name: "🎨 สี (x2)", value: "color" },
              { name: "📊 โหล 1-12, 13-24, 25-36 (x3)", value: "dozen" },
              { name: "↔️ ครึ่ง 1-18, 19-36 (x2)", value: "half" }
            )
        )
        .addStringOption((option) =>
          option
            .setName("choice")
            .setDescription("ตัวเลือกการเดิมพัน")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const subcommand = interaction.options.getSubcommand();
      const bet = interaction.options.getInteger("bet");

      // Calculate max bet based on level
      const level = await levelSystem.getLevel(interaction.user.id);
      const baseMaxBet = 5000; // Base max bet
      const betPerLevel = 500; // Additional bet per level
      const maxBet = baseMaxBet + level * betPerLevel;

      // Check if bet exceeds level-based max bet
      if (bet > maxBet) {
        const nextLevelBet = baseMaxBet + (level + 1) * betPerLevel;
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("#ff0000")
              .setTitle("❌ วงเงินเดิมพันไม่เพียงพอ")
              .addFields(
                {
                  name: "📊 วงเงินเดิมพันปัจจุบัน",
                  value: `${maxBet.toLocaleString()} บาท (Level ${level})`,
                  inline: true,
                },
                {
                  name: "📈 วงเงินเดิมพัน Level ถัดไป",
                  value: `${nextLevelBet.toLocaleString()} บาท (Level ${
                    level + 1
                  })`,
                  inline: true,
                }
              )
              .setFooter({ text: "💡 เพิ่ม Level เพื่อเพิ่มวงเงินเดิมพัน" }),
          ],
          ephemeral: true,
        });
      }

      const result = await GambleSystem.playGame(
        subcommand,
        interaction.user.id,
        bet
      );

      // Inside execute function, update error handling
      if (!result.success) {
        const errorMessages = {
          insufficient_funds: "❌ ยอดเงินไม่เพียงพอ",
          invalid_game: "❌ ไม่พบเกมที่เลือก",
          cooldown: "⏰ กรุณารอสักครู่ก่อนเล่นอีกครั้ง",
          bet_too_low: `❌ การเดิมพันต้องมากกว่า 100 บาท`,
          bet_too_high: `❌ การเดิมพันต้องไม่เกิน ${maxBet} บาท\n💡 เพิ่ม Level เพื่อเพิ่มวงเงินเดิมพัน`,
          no_profile: "❌ ไม่พบข้อมูลผู้เล่น",
        };

        return interaction.editReply({
          content: errorMessages[result.reason] || "❌ เกิดข้อผิดพลาด",
          ephemeral: true,
        });
      }

      // Game specific response handling
      switch (subcommand) {
        case "blackjack": {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("hit")
              .setLabel("🎯 Hit")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("stand")
              .setLabel("🛑 Stand")
              .setStyle(ButtonStyle.Secondary)
          );

          const embed = new EmbedBuilder()
            .setTitle("🃏 Blackjack")
            .setColor("#00ff00")
            .addFields(
              {
                name: "🎮 Your Hand",
                value:
                  formatHand(result.playerHand) + ` (${result.playerTotal})`,
                inline: true,
              },
              {
                name: "🎰 Dealer Hand",
                value: formatHand([result.dealerHand[0]]) + " | 🂠",
                inline: true,
              },
              {
                name: "💰 Bet",
                value: `${bet} บาท`,
                inline: false,
              }
            );

          const message = await interaction.editReply({
            embeds: [embed],
            components: [row],
          });

          const collector = message.createMessageComponentCollector({
            time: 30000,
          });

          collector.on("collect", async (i) => {
            if (i.user.id !== interaction.user.id) {
              return i.reply({
                content: "❌ คุณไม่สามารถใช้ปุ่มนี้ได้",
                ephemeral: true,
              });
            }

            const game =
              i.customId === "hit"
                ? await GambleSystem.games.blackjack.hit(interaction.user.id)
                : await GambleSystem.games.blackjack.stand(interaction.user.id);

            if (!game) {
              return i.update({ content: "❌ เกิดข้อผิดพลาด", components: [] });
            }

            const resultEmbed = new EmbedBuilder()
              .setTitle("🃏 Blackjack")
              .setColor(game.status === "playing" ? "#00ff00" : "#ff0000")
              .addFields(
                {
                  name: "🎮 Your Hand",
                  value: formatHand(game.playerHand) + ` (${game.playerTotal})`,
                  inline: true,
                },
                {
                  name: "🎰 Dealer Hand",
                  value:
                    game.status === "playing"
                      ? formatHand([game.dealerHand[0]]) + " | 🂠"
                      : formatHand(game.dealerHand) + ` (${game.dealerTotal})`,
                  inline: true,
                }
              );

            if (game.status !== "playing") {
              resultEmbed.addFields(
                {
                  name: "💰 Result",
                  value: getStatusText(game.status),
                  inline: true,
                },
                {
                  name: game.winAmount > game.bet ? "💸 Won" : "💸 Lost",
                  value: `${Math.abs(game.winAmount - game.bet)} บาท`,
                  inline: true,
                },
                {
                  name: "💵 Balance",
                  value: `${game.newBalance} บาท`,
                  inline: true,
                }
              );
            }

            if (game.winAmount > game.bet) {
              await QuestSystem.updateQuestProgress(
                interaction.user.id,
                "blackjack_wins",
                1
              );
            }

            await i.update({
              embeds: [resultEmbed],
              components: game.status === "playing" ? [row] : [],
            });

            if (game.status !== "playing") {
              collector.stop();
            }
          });

          collector.on("end", () => {
            message.edit({ components: [] }).catch(() => {});
          });
          break;
        }
        case "crash": {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("continue_crash")
              .setLabel("⬆️ เพิ่มตัวคูณ")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("cashout_crash")
              .setLabel("💰 ถอนเงิน")
              .setStyle(ButtonStyle.Success)
          );

          const initialEmbed = new EmbedBuilder()
            .setTitle("💥 Crash Game")
            .setColor("#00ff00")
            .setDescription(
              '```\nกดปุ่ม "เพิ่มตัวคูณ" เพื่อเพิ่มตัวคูณ\nกดปุ่ม "ถอนเงิน" เพื่อรับรางวัล\nระวัง! ถ้าระเบิดจะเสียเงินทั้งหมด\n```'
            )
            .addFields(
              {
                name: "📊 ตัวคูณปัจจุบัน",
                value: `${result.currentMultiplier.toFixed(1)}x`,
                inline: true,
              },
              {
                name: "💰 เงินเดิมพัน",
                value: `${bet.toLocaleString()} บาท`,
                inline: true,
              },
              {
                name: "💵 รางวัลที่อาจได้รับ",
                value: `${bet.toLocaleString()} บาท`,
                inline: true,
              }
            )
            .setFooter({ text: '⚠️ กดปุ่ม "ถอนเงิน" ก่อนที่จะระเบิด!' });

          const message = await interaction.editReply({
            embeds: [initialEmbed],
            components: [row],
          });

          const collector = message.createMessageComponentCollector({
            time: 60000,
          });

          collector.on("collect", async (i) => {
            if (i.user.id !== interaction.user.id) {
              return i.reply({
                content: "❌ คุณไม่สามารถใช้ปุ่มนี้ได้",
                ephemeral: true,
              });
            }

            const game =
              i.customId === "continue_crash"
                ? await GambleSystem.games.crash.continueGame(
                    interaction.user.id
                  )
                : await GambleSystem.games.crash.cashout(interaction.user.id);

            if (!game.success && game.reason === "crashed") {
              const crashEmbed = new EmbedBuilder()
                .setTitle("💥 CRASHED!")
                .setColor("#ff0000")
                .setDescription(
                  "```\nเกมระเบิดแล้ว! คุณเสียเงินเดิมพันทั้งหมด\n```"
                )
                .addFields(
                  {
                    name: "💣 จุดระเบิด",
                    value: `${game.crashPoint.toFixed(1)}x`,
                    inline: true,
                  },
                  {
                    name: "💰 เงินเดิมพัน",
                    value: `${bet.toLocaleString()} บาท`,
                    inline: true,
                  },
                  {
                    name: "💸 สถานะ",
                    value: "❌ เสียเงินเดิมพันทั้งหมด",
                    inline: true,
                  }
                );

              await i.update({ embeds: [crashEmbed], components: [] });
              collector.stop();
              return;
            }

            if (i.customId === "cashout_crash" && game.success) {
              await QuestSystem.updateQuestProgress(
                interaction.user.id,
                "crash_cashout",
                1,
                { multiplier: game.multiplier }
              );
              const winEmbed = new EmbedBuilder()
                .setTitle("🎉 ถอนเงินสำเร็จ!")
                .setColor("#00ff00")
                .setDescription("```\nยินดีด้วย! คุณถอนเงินได้ทันเวลา\n```")
                .addFields(
                  {
                    name: "📊 ตัวคูณสุดท้าย",
                    value: `${game.multiplier.toFixed(1)}x`,
                    inline: true,
                  },
                  {
                    name: "💰 เงินเดิมพัน",
                    value: `${bet.toLocaleString()} บาท`,
                    inline: true,
                  },
                  {
                    name: "🎁 รางวัลที่ได้รับ",
                    value: `${game.winAmount.toLocaleString()} บาท`,
                    inline: true,
                  }
                );

              await i.update({ embeds: [winEmbed], components: [] });
              collector.stop();
              return;
            }

            const updatedEmbed = new EmbedBuilder()
              .setTitle("💥 Crash Game")
              .setColor("#00ff00")
              .setDescription(
                '```\nกดปุ่ม "เพิ่มตัวคูณ" เพื่อเพิ่มตัวคูณ\nกดปุ่ม "ถอนเงิน" เพื่อรับรางวัล\nระวัง! ถ้าระเบิดจะเสียเงินทั้งหมด\n```'
              )
              .addFields(
                {
                  name: "📊 ตัวคูณปัจจุบัน",
                  value: `${game.currentMultiplier.toFixed(1)}x`,
                  inline: true,
                },
                {
                  name: "💰 เงินเดิมพัน",
                  value: `${bet.toLocaleString()} บาท`,
                  inline: true,
                },
                {
                  name: "💵 รางวัลที่อาจได้รับ",
                  value: `${game.potentialWin.toLocaleString()} บาท`,
                  inline: true,
                }
              )
              .setFooter({ text: '⚠️ กดปุ่ม "ถอนเงิน" ก่อนที่จะระเบิด!' });

            await i.update({ embeds: [updatedEmbed], components: [row] });
          });

          collector.on("end", async (collected, reason) => {
            if (reason === "time" && currentGame?.success !== false) {
              // ถ้าหมดเวลาและเกมยังไม่จบ (ไม่ได้กด cashout หรือระเบิด)
              const timeoutEmbed = new EmbedBuilder()
                .setTitle("⏰ หมดเวลา!")
                .setColor("#ff0000")
                .setDescription("```\nคุณไม่ได้ตัดสินใจภายในเวลาที่กำหนด!\n```")
                .addFields(
                  {
                    name: "💰 เงินเดิมพัน",
                    value: `${bet.toLocaleString()} บาท`,
                    inline: true,
                  },
                  {
                    name: "💸 สถานะ",
                    value: "❌ เสียเงินเดิมพันทั้งหมด",
                    inline: true,
                  }
                );

              try {
                await message.edit({
                  embeds: [timeoutEmbed],
                  components: [],
                });
              } catch (error) {
                console.error("Error updating timeout message:", error);
              }
            } else {
              // ถ้าจบเกมด้วยเหตุผลอื่น (กด cashout หรือระเบิด)
              try {
                await message.edit({ components: [] });
              } catch (error) {
                console.error("Error removing components:", error);
              }
            }
          });
          break;
        }
        // Add roulette case in switch statement
        // case "roulette":
        //   {
        //     const type = interaction.options.getString("type");
        //     const choice = interaction.options.getString("choice");

        //     // Validate choices based on type
        //     let betChoice;
        //     switch (type) {
        //       case "number":
        //         const num = parseInt(choice);
        //         if (isNaN(num) || num < 0 || num > 36) {
        //           return interaction.editReply({
        //             content: "❌ กรุณาเลือกตัวเลข 0-36",
        //             ephemeral: true,
        //           });
        //         }
        //         betChoice = { type: "number", value: num };
        //         break;

        //       case "color":
        //         if (!["red", "black", "green"].includes(choice.toLowerCase())) {
        //           return interaction.editReply({
        //             content: "❌ กรุณาเลือกสี red, black หรือ green",
        //             ephemeral: true,
        //           });
        //         }
        //         betChoice = { type: "color", value: choice.toLowerCase() };
        //         break;

        //       case "dozen":
        //         const dozen = parseInt(choice);
        //         if (![1, 2, 3].includes(dozen)) {
        //           return interaction.editReply({
        //             content:
        //               "❌ กรุณาเลือกโหล 1 (1-12), 2 (13-24) หรือ 3 (25-36)",
        //             ephemeral: true,
        //           });
        //         }
        //         betChoice = { type: "dozen", value: dozen };
        //         break;

        //       case "half":
        //         const half = parseInt(choice);
        //         if (![1, 2].includes(half)) {
        //           return interaction.editReply({
        //             content: "❌ กรุณาเลือกครึ่ง 1 (1-18) หรือ 2 (19-36)",
        //             ephemeral: true,
        //           });
        //         }
        //         betChoice = { type: "half", value: half };
        //         break;
        //     }

        //     const game = await GambleSystem.playGame(
        //       "roulette",
        //       interaction.user.id,
        //       bet,
        //       betChoice
        //     );

        //     // Create result embed
        //     const resultEmbed = new EmbedBuilder()
        //       .setTitle("🎰 Roulette")
        //       .setColor(
        //         game.result.color === "red"
        //           ? "#ff0000"
        //           : game.result.color === "black"
        //           ? "#000000"
        //           : "#00ff00"
        //       )
        //       .addFields(
        //         {
        //           name: "🎯 ผลการหมุน",
        //           value: `${game.result.number} ${getBallEmoji(
        //             game.result.color
        //           )}`,
        //           inline: true,
        //         },
        //         {
        //           name: "🎲 การเดิมพันของคุณ",
        //           value: formatBetChoice(game.choice),
        //           inline: true,
        //         },
        //         {
        //           name: "💰 เงินเดิมพัน",
        //           value: `${bet.toLocaleString()} บาท`,
        //           inline: true,
        //         },
        //         {
        //           name: game.winAmount > 0 ? "🎉 ชนะ!" : "💔 แพ้",
        //           value:
        //             game.winAmount > 0
        //               ? `+${game.winAmount.toLocaleString()} บาท`
        //               : `-${bet.toLocaleString()} บาท`,
        //           inline: true,
        //         }
        //       );

        //     await interaction.editReply({ embeds: [resultEmbed] });
        //     break;
        //   }

        //   // Add helper functions at the bottom of the file
        //   function getBallEmoji(color) {
        //     switch (color) {
        //       case "red":
        //         return "🔴";
        //       case "black":
        //         return "⚫";
        //       case "green":
        //         return "🟢";
        //       default:
        //         return "⚪";
        //     }
        //   }

        //   function formatBetChoice(choice) {
        //     switch (choice.type) {
        //       case "number":
        //         return `เลข ${choice.value}`;
        //       case "color":
        //         return `สี ${
        //           choice.value === "red"
        //             ? "🔴"
        //             : choice.value === "black"
        //             ? "⚫"
        //             : "🟢"
        //         }`;
        //       case "dozen":
        //         return `โหลที่ ${choice.value} (${
        //           (choice.value - 1) * 12 + 1
        //         }-${choice.value * 12})`;
        //       case "half":
        //         return `ครึ่ง ${choice.value} (${
        //           choice.value === 1 ? "1-18" : "19-36"
        //         })`;
        //       default:
        //         return "Unknown";
        //     }
        //   }
      }
    } catch (error) {
      console.error("Error in gamble command:", error);
      await interaction.editReply({
        content: "❌ เกิดข้อผิดพลาดในการเล่นเกม",
        ephemeral: true,
      });
    }
  },
};

function formatHand(cards) {
  return cards
    .map((card) => (card.hidden ? "🂠" : `${card.value}${card.suit}`))
    .join(" ");
}

function getStatusText(status) {
  switch (status) {
    case "blackjack":
      return "🎉 Blackjack!";
    case "win":
      return "🎉 You win!";
    case "lose":
      return "😢 You lose";
    case "bust":
      return "💥 Bust!";
    case "push":
      return "🤝 Push";
    default:
      return "Unknown";
  }
}
