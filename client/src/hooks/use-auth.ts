import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  const user = await response.json();

  // Track sign_up conversion if this is a new user (first authentication)
  if (user && !sessionStorage.getItem('user_tracked')) {
    sessionStorage.setItem('user_tracked', 'true');

    // Google Analytics 4 - sign_up event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'sign_up', {
        method: 'Google'
      });
    }

    // Meta Pixel - Lead event
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Lead');
    }
  }

  return user;
}

async function logout(): Promise<void> {
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
