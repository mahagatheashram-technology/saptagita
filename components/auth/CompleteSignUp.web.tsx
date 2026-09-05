import { SignUp } from "@clerk/clerk-expo/web";
import { ScrollView } from "react-native";

// Clerk completes any requirements returned by a first-time OAuth sign-in.
export function CompleteSignUp() {
  return <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
    <SignUp routing="hash" signInUrl="/sign-in" forceRedirectUrl="/" />
  </ScrollView>;
}
