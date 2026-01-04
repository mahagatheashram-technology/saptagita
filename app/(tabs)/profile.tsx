import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DevPanel } from "@/components/dev/DevPanel";

export default function ProfileScreen() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const getOrCreateTestUser = useMutation(api.users.getOrCreateTestUser);

  useEffect(() => {
    getOrCreateTestUser()
      .then((user) => setUserId(user._id))
      .catch(console.error);
  }, [getOrCreateTestUser]);

  // For now, Profile tab is just the dev panel
  // Replace with real profile UI later
  return (
    <SafeAreaView className="flex-1 bg-background">
      <DevPanel userId={userId} />
    </SafeAreaView>
  );
}
