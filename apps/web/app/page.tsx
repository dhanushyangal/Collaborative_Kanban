import { Board } from "@/components/Board";
import { createClient } from "@/utils/supabase/server";
import type { CardRow, ProfileRow } from "@/types/database";

export const dynamic = "force-dynamic";

async function getBoardData(): Promise<{
  cards: CardRow[];
  profiles: ProfileRow[];
}> {
  try {
    const supabase = await createClient();
    const [cardsResult, profilesResult] = await Promise.all([
      supabase
        .from("cards")
        .select("*")
        .order("status")
        .order("position"),
      supabase.from("profiles").select("*").order("full_name"),
    ]);

    if (cardsResult.error) {
      console.error(cardsResult.error.message);
    }
    if (profilesResult.error) {
      console.error(profilesResult.error.message);
    }

    return {
      cards: cardsResult.data ?? [],
      profiles: profilesResult.data ?? [],
    };
  } catch (error) {
    console.error(error);
    return { cards: [], profiles: [] };
  }
}

export default async function HomePage() {
  const { cards, profiles } = await getBoardData();
  return <Board initialCards={cards} initialProfiles={profiles} />;
}
