import { PrismaClient } from "@/generated/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Check if there are any existing players
  const playerCount = await prisma.player.count();

  if (playerCount === 0) {
    console.log("No players found. Creating initial admin player...");

    const adminPlayer = await prisma.player.create({
      data: {
        name: "Admin",
        isAdmin: true,
      },
    });

    console.log(`Created admin player: ${adminPlayer.name} (ID: ${adminPlayer.id})`);
    console.log("IMPORTANT: Remember to change the admin player name to your real name!");
  } else {
    console.log(`Found ${playerCount} existing players.`);
    console.log("To make a player an admin, run:");
    console.log('npx prisma db execute --stdin <<< "UPDATE \\"Player\\" SET \\"isAdmin\\" = true WHERE id = \'PLAYER_ID_HERE\';"');
  }

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error("Error during seed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
