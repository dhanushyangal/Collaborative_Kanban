import { Board } from "@/components/Board";
import { createClient } from "@/utils/supabase/server";
import type { CardRow } from "@/types/database";

export const dynamic = "force-dynamic";

async function getCards(): Promise<CardRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .order("status")
      .order("position");

    if (error) {
      console.error(error.message);
      return [];
    }

    return data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function HomePage() {
  const cards = await getCards();
  return <Board initialCards={cards} />;
}
