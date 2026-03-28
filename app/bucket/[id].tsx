import { Redirect, useLocalSearchParams } from "expo-router";

export default function LegacyBucketDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const bucketId = Array.isArray(id) ? id[0] : id;

  if (!bucketId) {
    return <Redirect href="/bookmarks" />;
  }

  return (
    <Redirect
      href={{
        pathname: "/(tabs)/bucket/[id]",
        params: { id: bucketId },
      }}
    />
  );
}
