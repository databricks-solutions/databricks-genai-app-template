import { useUserContext } from "@/contexts/UserContext";

/**
 * Custom hook to access user info from the UserContext.
 * The actual fetch happens once in the UserProvider.
 */
export function useUserInfo() {
  const context = useUserContext();
  return {
    userInfo: context.user
      ? { user: context.user, workspace_url: context.workspaceUrl || "" }
      : null,
    loading: context.loading,
    error: context.error,
  };
}
