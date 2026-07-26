import { Board } from "@/components/Board";
import { createClient } from "@/utils/supabase/server";
import type { CardRow } from "@/types/database";

export const dynamic = "force-dynamic";

async function getInitialCards(): Promise<CardRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .order("status", { ascending: true })
      .order("position", { ascending: true });

    if (error) {
      console.error("Failed to load cards:", error.message);
      return [];
    }

    return data ?? [];
  } catch (error) {
    console.error("Failed to load cards:", error);
    return [];
  }
}

export default async function HomePage() {
  const initialCards = await getInitialCards();

  return <Board initialCards={initialCards} />;
}
