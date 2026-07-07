import { inArray } from "drizzle-orm"
import { db, user } from "@workspace/db"

/**
 * Pool avatars: 20 modern greats, one per user. Images are Wikipedia/Wikimedia
 * Commons thumbnails (CC-licensed). Assigned once at account creation and
 * kept forever; each player is handed out at most once until all 20 are
 * taken, after which assignment falls back to random repeats.
 */
export const PLAYER_AVATARS: ReadonlyArray<{ player: string; image: string }> = [
  { player: "Lionel Messi", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Lionel_Messi_NE_Revolution_Inter_Miami_7.9.25-055.jpg/330px-Lionel_Messi_NE_Revolution_Inter_Miami_7.9.25-055.jpg" },
  // Cristiano Ronaldo is deliberately absent: his slot is a hand-assigned
  // animated GIF avatar (see git history / user maryan.dzubich@gmail.com),
  // so the pool must never hand out a second, static Ronaldo.
  { player: "Kylian Mbappé", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Kylian_Mbappe_France_v_Senegal_16_June_2026-391_%28cropped%29.jpg/330px-Kylian_Mbappe_France_v_Senegal_16_June_2026-391_%28cropped%29.jpg" },
  { player: "Erling Haaland", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Erling_Haaland_Morocco_v_Norway_7_June_2026-51.jpg/330px-Erling_Haaland_Morocco_v_Norway_7_June_2026-51.jpg" },
  { player: "Neymar", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Neymar_Junior_Brazil_V_Morocco_13_June_2026-40.jpg/330px-Neymar_Junior_Brazil_V_Morocco_13_June_2026-40.jpg" },
  { player: "Jude Bellingham", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Jude_Bellingham_England_v_Ghana_23_June_2026-061_%28cropped%29.jpg/330px-Jude_Bellingham_England_v_Ghana_23_June_2026-061_%28cropped%29.jpg" },
  { player: "Vinícius Júnior", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Vin%C3%ADcius_J%C3%BAnior_Brazil_V_Morocco_13_June_2026-207_%28cropped%29.jpg/330px-Vin%C3%ADcius_J%C3%BAnior_Brazil_V_Morocco_13_June_2026-207_%28cropped%29.jpg" },
  { player: "Robert Lewandowski", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/2019147183134_2019-05-27_Fussball_1.FC_Kaiserslautern_vs_FC_Bayern_M%C3%BCnchen_-_Sven_-_1D_X_MK_II_-_0228_-_B70I8527_%28cropped%29.jpg/330px-2019147183134_2019-05-27_Fussball_1.FC_Kaiserslautern_vs_FC_Bayern_M%C3%BCnchen_-_Sven_-_1D_X_MK_II_-_0228_-_B70I8527_%28cropped%29.jpg" },
  { player: "Mohamed Salah", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Mohamed_Salah_2018.jpg/330px-Mohamed_Salah_2018.jpg" },
  { player: "Harry Kane", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Harry_Kane_England_v_Ghana_23_June_2026-219_%28cropped%29.jpg/330px-Harry_Kane_England_v_Ghana_23_June_2026-219_%28cropped%29.jpg" },
  { player: "Kevin De Bruyne", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Kevin_De_Bruyne_USMNT_v_Belgium_Mar_28_2026-64_%28cropped%29.jpg/330px-Kevin_De_Bruyne_USMNT_v_Belgium_Mar_28_2026-64_%28cropped%29.jpg" },
  { player: "Luka Modrić", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Ofrenda_de_la_Liga_y_la_Champions-57-L.Mill%C3%A1n_%2852109310843%29_%28Luka_Modri%C4%87%29.jpg/330px-Ofrenda_de_la_Liga_y_la_Champions-57-L.Mill%C3%A1n_%2852109310843%29_%28Luka_Modri%C4%87%29.jpg" },
  { player: "Lamine Yamal", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Lamine_Yamal_a_Xina_%282025%29.png/330px-Lamine_Yamal_a_Xina_%282025%29.png" },
  { player: "Jamal Musiala", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Jamal_Musiala_10%2C_Pedro_Vite_15_Ecuador_v_Germany_at_2026_Fifa_World_Cup_by_YantsImages_02_%28cropped%29.jpg/330px-Jamal_Musiala_10%2C_Pedro_Vite_15_Ecuador_v_Germany_at_2026_Fifa_World_Cup_by_YantsImages_02_%28cropped%29.jpg" },
  { player: "Antoine Griezmann", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/FRA-ARG_%2810%29_%28cropped%29.jpg/330px-FRA-ARG_%2810%29_%28cropped%29.jpg" },
  { player: "Ousmane Dembélé", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Ousmane_Dembele_France_v_Senegal_16_June_2026-341_%28cropped%29.jpg/330px-Ousmane_Dembele_France_v_Senegal_16_June_2026-341_%28cropped%29.jpg" },
  { player: "Pedri", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Pedri.jpg/330px-Pedri.jpg" },
  { player: "Federico Valverde", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Federico_Valverde_2021_%28cropped%29.jpg/330px-Federico_Valverde_2021_%28cropped%29.jpg" },
  { player: "Rodri", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/RODRI_-_SWE_vs_ESP_-_UEFA_EURO_2020_QUALIFIERS_-_2019.10.15_%28cropped%29.jpg/330px-RODRI_-_SWE_vs_ESP_-_UEFA_EURO_2020_QUALIFIERS_-_2019.10.15_%28cropped%29.jpg" },
  { player: "Florian Wirtz", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Team_Germany_players%2C_Ecuador_v_Germany_at_2026_Fifa_World_Cup_by_YantsImages_01_Florian_Wirtz.jpg/330px-Team_Germany_players%2C_Ecuador_v_Germany_at_2026_Fifa_World_Cup_by_YantsImages_01_Florian_Wirtz.jpg" },
  { player: "Bukayo Saka", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Bukayo_Saka_England_v_Ghana_23_June_2026-057_%28cropped%29.jpg/330px-Bukayo_Saka_England_v_Ghana_23_June_2026-057_%28cropped%29.jpg" },
  { player: "Cole Palmer", image: "https://upload.wikimedia.org/wikipedia/commons/f/fb/Cole_Palmer_2025_FIFA_Club_World_Cup_Final.jpg" },
  { player: "Julián Álvarez", image: "https://upload.wikimedia.org/wikipedia/commons/0/03/Argentina_national_football_team_-_2_-_2022_%28Juli%C3%A1n_%C3%81lvarez%29.jpg" },
  { player: "Virgil van Dijk", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/20160604_AUT_NED_8876_%28cropped%29.jpg/330px-20160604_AUT_NED_8876_%28cropped%29.jpg" },
  { player: "Achraf Hakimi", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Achraf_Hakimi_Morocco_v_Norway_7_June_2026-16.jpg/330px-Achraf_Hakimi_Morocco_v_Norway_7_June_2026-16.jpg" },
]

/** Random avatar that no user has yet; random repeat once all 20 are taken. */
export async function pickUnassignedAvatar(): Promise<string> {
  const allImages = PLAYER_AVATARS.map((a) => a.image)
  const taken = await db
    .select({ image: user.image })
    .from(user)
    .where(inArray(user.image, allImages))
  const takenSet = new Set(taken.map((row) => row.image))

  const available = PLAYER_AVATARS.filter((a) => !takenSet.has(a.image))
  const pool = available.length > 0 ? available : PLAYER_AVATARS
  return pool[Math.floor(Math.random() * pool.length)]!.image
}
