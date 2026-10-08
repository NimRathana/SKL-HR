"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, CircularProgress, Container, Typography } from "@mui/material";
import { getApi, setAuthCookie } from "@core/api";

export default function CheckoutSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);

  const complete = async () => {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) {
        setError("Stripe session is missing.");
        return;
      }

      try {
        setRetrying(true);
        setError("");
        const api = await getApi();
        const { data } = await api.get("/subscriptions/checkout/complete", {
          params: { session_id: sessionId },
        });
        if (!data?.access_token) {
          throw new Error("The account activation response did not contain a login token.");
        }
        setAuthCookie(data.access_token);
        router.replace("/billing");
      } catch (completionError) {
        setError(
          completionError.response?.data?.detail || completionError.message || "We could not finish setting up your account.",
        );
      } finally {
        setRetrying(false);
      }
  };

  useEffect(() => {
    complete();
  }, [router, searchParams]);

  return (
    <Container sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      {error ? (
        <>
          <Typography color="error">{error}</Typography>
          <Button
            variant="contained"
            onClick={complete}
            disabled={retrying}
            style={{ marginTop: 24, padding: "10px 18px", cursor: retrying ? "wait" : "pointer" }}
          >
            {retrying ? "Trying again..." : "Try again"}
          </Button>
        </>
      ) : (
        <>
          <CircularProgress />
        </>
      )}
    </Container>
  );
}
